import type { Difficulty, EquationQuestion } from '../engine/types';
import { validateEquationQuestion } from '../engine/equations/validate';
import { buildChoiceOptions } from '../engine/equations/distractors';
import { createPrng } from '../engine/prng';

/** AI text renders as plain text only (§6): strip HTML elements, tags, and
 *  markdown decorations before anything reaches the DOM. */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
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
      const equationsDisplay = raw.equations.map((e) => sanitizePlainText(e));
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
