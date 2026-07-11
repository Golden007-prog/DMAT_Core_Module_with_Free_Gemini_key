import type { Difficulty, EquationQuestion } from '../engine/types';
import { validateEquationQuestion } from '../engine/equations/validate';
import { buildChoiceOptions } from '../engine/equations/distractors';
import { createPrng } from '../engine/prng';
import type { AiCoachPlan, AiExplanation, CoachDrill, CoachLeveragePoint, ExplainStep } from './prompts';

/** AI text renders as plain text only (§6): strip HTML elements, tags, and
 *  markdown decorations before anything reaches the DOM.
 *
 *  The tag pattern requires a letter or a slash straight after the `<`, and that
 *  is load-bearing: `/<[^>]*>/` is not a tag matcher but an "anything between an
 *  angle bracket pair" matcher, so it ate the middle of every inequality a maths
 *  tutor writes — "A < 5 so B > 12" came back as "A 12". Nothing in the explain
 *  prompt forbids `<` or `>`, so that mangling was silent and routine. This is
 *  defence in depth, not the XSS barrier (React escapes every interpolated
 *  string and nothing in src/ uses dangerouslySetInnerHTML), which is exactly why
 *  it can afford to be precise: `<img src=x onerror=y>` and `</div>` still go. */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/* ------------------------- G2/G3 structured payloads ---------------------- */

function field(value: unknown): string {
  return typeof value === 'string' ? sanitizePlainText(value) : '';
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * G2 firewall: the model may return anything. Every string that survives has
 * been through sanitizePlainText, and a shape we cannot render returns null so
 * the caller falls back to the deterministic explanation (R7 — AI never gates).
 */
export function sanitizeExplanation(payload: unknown): AiExplanation | null {
  const raw = record(payload);
  if (!raw) return null;

  const steps: ExplainStep[] = [];
  for (const item of Array.isArray(raw.steps) ? raw.steps : []) {
    const step = record(item);
    if (!step) continue;
    const title = field(step.title);
    const detail = field(step.detail);
    if (title && detail) steps.push({ title, detail });
    if (steps.length === 6) break; // the prompt caps at 6; a runaway list is truncated, not rejected
  }

  const explanation: AiExplanation = {
    diagnosis: field(raw.diagnosis),
    steps,
    keyInsight: field(raw.keyInsight),
    tactic: field(raw.tactic),
  };
  // a chain of one is not a worked solution — better the deterministic steps
  if (!explanation.diagnosis || explanation.steps.length < 2) return null;
  if (!explanation.keyInsight || !explanation.tactic) return null;
  return explanation;
}

/** G3 firewall — same contract as sanitizeExplanation. */
export function sanitizeCoachPlan(payload: unknown): AiCoachPlan | null {
  const raw = record(payload);
  if (!raw) return null;

  const leveragePoints: CoachLeveragePoint[] = [];
  for (const item of Array.isArray(raw.leveragePoints) ? raw.leveragePoints : []) {
    const point = record(item);
    if (!point) continue;
    const title = field(point.title);
    const why = field(point.why);
    if (title && why) leveragePoints.push({ title, why, evidence: field(point.evidence) });
    if (leveragePoints.length === 3) break;
  }

  const drills: CoachDrill[] = [];
  for (const item of Array.isArray(raw.drills) ? raw.drills : []) {
    const entry = record(item);
    if (!entry) continue;
    const drill = field(entry.drill);
    if (!drill) continue;
    const minutes = typeof entry.minutes === 'number' && Number.isFinite(entry.minutes)
      ? Math.min(60, Math.max(5, Math.round(entry.minutes)))
      : 10;
    drills.push({ tag: field(entry.tag), drill, minutes });
    if (drills.length === 5) break;
  }

  const plan: AiCoachPlan = {
    headline: field(raw.headline),
    leveragePoints,
    drills,
    pacing: field(raw.pacing),
  };
  if (!plan.headline || plan.leveragePoints.length === 0 || plan.drills.length === 0) return null;
  if (!plan.pacing) return null;
  return plan;
}

interface AiEquationItem {
  equations: string[];
  solution: Record<string, number>;
}

function isAiEquationItem(x: unknown): x is AiEquationItem {
  if (typeof x !== 'object' || x === null) return false;
  const item = x as Partial<AiEquationItem>;
  return (
    Array.isArray(item.equations) &&
    item.equations.every((e) => typeof e === 'string') &&
    typeof item.solution === 'object' &&
    item.solution !== null &&
    Object.values(item.solution).every((v) => typeof v === 'number')
  );
}

/**
 * Rewrite a model's equation line into the exact form our own generator emits,
 * without changing what it means.
 *
 * The grammar (engine/equations/validate.ts) accepts "int × var" and rejects
 * "var × int" — the two are the same term, but only one is the house style. The
 * model writes both. Measured 2026-07-11 on the real API, thinkingBudget 0, a
 * 20-system batch: this single rewrite took the hard band from 7/20 and 12/20
 * accepted to 19/20 and 18/20, and the medium band from 3/20 to 12/20 — the
 * rejects were almost never bad algebra, just a commuted product. Spelling the
 * term order out in the prompt was measured too and did NOT reliably beat this
 * (11/20, 15/20), so the fix lives here, where it is deterministic.
 *
 * The ASCII hyphen is likewise mapped to the minus glyph the built-in questions
 * use, so an AI line and a generated line are indistinguishable on screen.
 */
export function canonicalizeEquation(display: string): string {
  return display.replace(/\b([A-E])\s*×\s*(\d+)\b/g, '$2 × $1').replace(/ - /g, ' − ');
}

/** Cheap deterministic hash for seeding option shuffles from content. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * G1 validation firewall (§6, R6): parse → schema-check → the SAME
 * uniqueness/grammar validator our own generator must pass → per-item salvage
 * with deterministic fill. The user always receives `count` valid questions
 * and never sees an error caused by AI output.
 */
export function salvageAiEquationSet(
  payload: unknown,
  count: number,
  difficulty: Difficulty,
  deterministicFallback: (index: number) => EquationQuestion,
): { questions: EquationQuestion[]; aiAccepted: number } {
  const items: unknown[] = Array.isArray(payload) ? payload : [];
  const questions: EquationQuestion[] = [];
  let aiAccepted = 0;

  for (let i = 0; i < count; i++) {
    const raw = items[i];
    let accepted: EquationQuestion | null = null;

    if (isAiEquationItem(raw)) {
      const equationsDisplay = raw.equations.map((e) => canonicalizeEquation(sanitizePlainText(e)));
      const variables = Object.keys(raw.solution).sort();
      const prng = createPrng(hashString(equationsDisplay.join('|')));
      const target = variables[variables.length - 1];
      const candidate: EquationQuestion = {
        id: crypto.randomUUID(),
        type: 'equations',
        difficulty,
        seed: prng.int(0, 2 ** 31 - 1),
        ruleTags: [`eq.vars${variables.length}`, 'eq.ai'],
        variables,
        equationsDisplay,
        solution: raw.solution,
        askMode: 'choice',
        target: { variable: target, ...buildChoiceOptions(target, raw.solution, prng) },
        explanationSteps: [
          ...variables.map((v) => `${v} = ${raw.solution[v]}.`),
          'Check: substitute the values into every equation — each line balances.',
        ],
      };
      if (validateEquationQuestion(candidate).ok) {
        accepted = candidate;
      }
    }

    if (accepted) {
      aiAccepted++;
      questions.push(accepted);
    } else {
      questions.push(deterministicFallback(i));
    }
  }

  return { questions, aiAccepted };
}
