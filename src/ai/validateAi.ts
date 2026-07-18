import type {
  Difficulty,
  EquationQuestion,
  GamPassage,
  GamQuestion,
  GamTopicArea,
  LatinLetter,
  Question,
} from '../engine/types';
import type { LatinAlphabetId } from '../engine/latinSquares/alphabets';
import { glyphFor } from '../engine/latinSquares/alphabets';
import { validateGamPassage } from '../engine/gam/validate';
import { parseEquation, validateEquationQuestion } from '../engine/equations/validate';
import type { LinearEq } from '../engine/equations/solver';
import { countSolutions } from '../engine/equations/solver';
import { buildChoiceOptions } from '../engine/equations/distractors';
import { createPrng } from '../engine/prng';
import type { AiCoachPlan, AiExplanation, CoachDrill, CoachLeveragePoint, ExplainStep } from './prompts';

/** AI text renders as plain text only (§6): strip HTML elements, tags, and
 *  markdown decorations before anything reaches the DOM.
 *
 *  The tag pattern is the load-bearing part, and it took two goes to get right.
 *  `/<[^>]*>/` was never a tag matcher at all but an "anything between an angle
 *  bracket pair" matcher, so it ate the middle of every inequality a maths tutor
 *  writes: "A < 5 so B > 12" reached the screen as "A 12". Demanding a letter
 *  after the `<` (`/<\/?[a-zA-Z][^>]*>/`) rescued only the SPACED case — the
 *  unspaced one is the common one in an app whose variables are literally A–E, and
 *  it still destroyed the content: "If x<y then y>x." → "If xx.", "Because A<B and
 *  D>C" → "Because AC". A tag-NAME whitelist does not save it either, because `b`,
 *  `i`, `s`, `a` and `p` are all real tag names — `<B and D>` matches `<b …>` on
 *  the nose. So the test is the tag's FORM, not its name: a name, and then either
 *  nothing (`<div>`, `<br/>`, `</div>`) or attributes that are actually shaped like
 *  attributes — `name = value`. "<B and D>" has neither ("and" carries no `=`), so
 *  it survives, while "<img src=x onerror=alert(1)>" and `<div class="a">` go.
 *
 *  The one thing that now survives which used to go is a tag whose only attributes
 *  are valueless (`<input disabled>`). That is the price of the carve-out and it is
 *  cheap: this is defence in depth, not the XSS barrier — React escapes every
 *  interpolated string and nothing in src/ uses dangerouslySetInnerHTML — and an
 *  attribute with no value carries no payload. Silently teaching a learner that
 *  "A<B and D>C" says "AC" is worse than an outage, because it looks like content. */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(
      /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>=]*))*\s*\/?>/g,
      '',
    )
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

/** Words that cannot follow the English article "a". When one of them comes
 *  next, the capital A is the subject of its sentence — the SYMBOL — not an
 *  article, and it must become a glyph rather than be deleted. */
const NEVER_AFTER_AN_ARTICLE =
  /^(?:is|was|are|were|has|have|had|appears?|sits?|occupies|goes|belongs?|can|cannot|must|will|would|should|blocks?|fills?|lies?|remains?|occurs?|exists?|conflicts?|clashes|repeats?|already|still|also|then|therefore|and|or|but|in|on|at|to|from|of|into|within|for|by|with)$/;

/**
 * On every alphabet except "letters" the learner sees ● ▲ ■ ★ ✚ (or 1–5, or
 * α–ε) and never a letter: A–E are internal names that exist only so that old
 * sessions still replay. A bare capital in the tutor's prose therefore names a
 * symbol that is nowhere on their screen — the exact defect the user reported.
 *
 * The prompt forbids it (latinTask) and the model does it anyway. Measured
 * against the real API on 2026-07-11, shapes alphabet: it named every symbol
 * with the correct glyph and then opened a sentence with the English article —
 * "…both row and column constraints simultaneously. A symbol placement is only
 * valid if…". Two rounds of prompt wording failed to stop that and a third would
 * fail too, because the "A" there is not a symbol slip at all: it is an ordinary
 * English word, and no instruction reliably suppresses one word of English. So
 * the invariant is enforced here, in the firewall, where it cannot regress.
 *
 * The two defects need opposite repairs. B–E are never English words, so a bare
 * one is always a leaked symbol name and simply becomes its glyph. "A" is
 * ambiguous, and the tell is not the grammar of the sentence but the rest of the
 * field: a model that names symbols by letter leaks them as a SET, so a bare
 * B–E anywhere means this "A" is a symbol too. Absent any such leak, an "A"
 * followed by a lower-case word that can head a noun phrase is the article, and
 * deleting it preserves the sentence — where mapping it to a glyph would produce
 * "● symbol placement is only valid…", which is worse than the bug.
 */
function enforceGlyphNames(text: string, alphabet: LatinAlphabetId): string {
  if (alphabet === 'letters' || !/\b[A-E]\b/.test(text)) return text;

  const namesSymbolsByLetter = /\b[B-E]\b/.test(text);
  let droppedArticle = false;

  let out = text.replace(/\b([B-E])\b/g, (_m, letter: string) =>
    glyphFor(alphabet, letter as LatinLetter),
  );

  out = out.replace(/\bA\b([ \t]+)([a-z][\w'-]*)/g, (_m, gap: string, next: string) => {
    if (namesSymbolsByLetter || NEVER_AFTER_AN_ARTICLE.test(next)) {
      return `${glyphFor(alphabet, 'A')}${gap}${next}`;
    }
    droppedArticle = true;
    return next;
  });

  // Whatever is still bare is not followed by a lower-case word — "the answer is
  // A." — so it can only ever be the symbol.
  out = out.replace(/\bA\b/g, () => glyphFor(alphabet, 'A'));

  // The deleted article almost always opened its sentence, so the noun behind it
  // now has to carry the capital.
  return droppedArticle
    ? out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase())
    : out;
}

/**
 * G2 firewall: the model may return anything. Every string that survives has
 * been through sanitizePlainText, and a shape we cannot render returns null so
 * the caller falls back to the deterministic explanation (R7 — AI never gates).
 *
 * `question` is what makes the Latin glyph rule enforceable — without it there is
 * no way to know that this explanation renders against ● ▲ ■ ★ ✚ rather than
 * against A–E. It stays optional because equations legitimately print A–E as
 * variable names and figures name shapes, so for them the pass is a no-op.
 */
export function sanitizeExplanation(payload: unknown, question?: Question): AiExplanation | null {
  const raw = record(payload);
  if (!raw) return null;

  const alphabet: LatinAlphabetId =
    question?.type === 'latin' ? (question.alphabet ?? 'letters') : 'letters';
  const clean = (value: unknown) => enforceGlyphNames(field(value), alphabet);

  const steps: ExplainStep[] = [];
  for (const item of Array.isArray(raw.steps) ? raw.steps : []) {
    const step = record(item);
    if (!step) continue;
    const title = clean(step.title);
    const detail = clean(step.detail);
    if (title && detail) steps.push({ title, detail });
    if (steps.length === 6) break; // the prompt caps at 6; a runaway list is truncated, not rejected
  }

  const explanation: AiExplanation = {
    diagnosis: clean(raw.diagnosis),
    steps,
    keyInsight: clean(raw.keyInsight),
    tactic: clean(raw.tactic),
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
  /** the model's claimed answer key — a hint, never the truth (see solveDisplayedSystem) */
  solution: Record<string, number>;
}

/**
 * The model may answer in either of two shapes: the construct-from-solution
 * schema (`lines`, each carrying the working that proves the line balances) or a
 * flat `equations` array. Only the equation strings survive — the per-line
 * working exists to make the model do the arithmetic before it commits to a
 * line, and has no meaning once the line is written.
 *
 * The flat shape is still read because the older schema shipped, and a question
 * that reaches us from the community pool or a cached payload must not become
 * unreadable just because the prompt moved on.
 */
function readAiEquationItem(x: unknown): AiEquationItem | null {
  const item = record(x);
  if (!item) return null;

  const equations: string[] = [];
  if (Array.isArray(item.lines)) {
    for (const entry of item.lines) {
      const line = record(entry);
      if (line && typeof line.equation === 'string') equations.push(line.equation);
    }
  } else if (Array.isArray(item.equations)) {
    for (const e of item.equations) if (typeof e === 'string') equations.push(e);
  }
  if (equations.length === 0) return null;

  // A missing or half-numeric solution object is NOT fatal any more: the answer
  // key is re-derived locally, so the model's claim is only ever a fallback.
  const solution: Record<string, number> = {};
  const claimed = record(item.solution);
  if (claimed) {
    for (const [v, value] of Object.entries(claimed)) {
      if (typeof value === 'number') solution[v] = value;
    }
  }
  return { equations, solution };
}

/**
 * Rewrite a model's equation line into the exact form our own generator emits,
 * without changing what it means. Every rule here is a PROVABLY equivalent
 * rewrite — a different spelling of the same term. Nothing repairs bad maths;
 * a wrong equation stays wrong and gets rejected downstream.
 *
 * The grammar (engine/equations/validate.ts) accepts "int × var" and rejects
 * "var × int" — the two are the same term, but only one is the house style. The
 * model writes both. Measured 2026-07-11 on the real API, thinkingBudget 0, a
 * 20-system batch: that single rewrite took the hard band from 7/20 and 12/20
 * accepted to 19/20 and 18/20 — the rejects were almost never bad algebra, just
 * a commuted product. Spelling the term order out in the prompt was measured too
 * and did NOT reliably beat this, so the fix lives here, where it is deterministic.
 *
 * The rest of the rules are the same trick applied to the other ways of writing
 * a term the model reaches for when it forgets the house glyphs:
 *   - ASCII and typographic operators: * x X · ⋅ ✕ → ×, / ∕ ⁄ → ÷. Only ever
 *     between two operands, so a stray letter cannot become an operator.
 *   - Every dash — hyphen-minus, en dash, em dash — becomes the minus glyph. The
 *     parser already tolerates the hyphen, but NOT the en dash, which it reads as
 *     part of the next token and rejects as an illegal term.
 *   - Implicit products: "2A" and "12B" are the standard notation for a
 *     coefficient, and the grammar has no term for them. Measured: the model
 *     writes them a few times per batch.
 * Spacing is normalised last so an AI line and a generated line are
 * indistinguishable on screen.
 */
export function canonicalizeEquation(display: string): string {
  return (
    display
      .trim()
      .replace(/[.,;]+$/, '') // a trailing full stop is prose, not arithmetic
      .replace(/[-‐‑‒–—―]/g, '−')
      .replace(/([\dA-E])\s*[*xX·⋅✕✖⨯]\s*([\dA-E])/g, '$1 × $2')
      .replace(/([\dA-E])\s*[/∕⁄]\s*([\dA-E])/g, '$1 ÷ $2')
      // "12B" → "12 × B": only the final digit is captured, so the leading digits
      // of a multi-digit coefficient are left where they are
      .replace(/(\d)\s*([A-E])\b/g, '$1 × $2')
      .replace(/\b([A-E])\s*×\s*(\d+)\b/g, '$2 × $1')
      .replace(/\s*([×÷=])\s*/g, ' $1 ')
      // + and − are spaced only after an operand, so a leading sign ("= −3") is
      // left tight against its number instead of becoming a dangling operator
      .replace(/([\dA-E])\s*([+−])\s*/g, '$1 $2 ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Every A–E the displayed lines actually mention. The model's `solution` keys are
 *  not authoritative: it routinely declares a variable it never uses, or uses one it
 *  never declared, and either way the question would be thrown out for a bookkeeping
 *  slip rather than for bad maths. */
function variablesUsed(equationsDisplay: string[]): string[] {
  const seen = new Set<string>();
  for (const line of equationsDisplay) {
    for (const m of line.matchAll(/[A-E]/g)) seen.add(m[0]);
  }
  return [...seen].sort();
}

/**
 * Solve a displayed system with the app's OWN solver and return the unique
 * integer solution in 1..20 — or null when there is none, or more than one.
 *
 * This is the answer key, and it deliberately ignores the one the model sent.
 * Measured 2026-07-11 on gemini-3.1-flash-lite, 20-system batches: on the hard
 * band, 9 of 20 systems came back internally CORRECT but with a mislabelled
 * answer key ("stated solution B=7 but system forces B=9"). Those are perfectly
 * good questions, and the old salvage threw every one of them away because it
 * took the model's arithmetic over its own solver. The model is bad at solving.
 * We are not — so we solve.
 */
export function solveDisplayedSystem(
  equationsDisplay: string[],
  variables: string[],
): Record<string, number> | null {
  if (variables.length < 2 || variables.length > 4) return null;

  const parsed: LinearEq[] = [];
  for (const display of equationsDisplay) {
    try {
      parsed.push(parseEquation(display));
    } catch {
      return null; // outside the grammar — not ours to repair
    }
  }

  const res = countSolutions(parsed, variables, 20, 2);
  return res.count === 1 ? res.solutions[0] : null;
}

/** How many variables a band's questions must have. An accepted 3-variable system
 *  in the HARD band is a medium question wearing a hard label: it passes the
 *  validator, so nothing downstream would ever catch it. */
const EXPECTED_VARIABLES: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };

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
): { questions: EquationQuestion[]; aiAccepted: number; rejects: string[] } {
  const items: unknown[] = Array.isArray(payload) ? payload : [];
  const questions: EquationQuestion[] = [];
  const rejects: string[] = [];
  const seen = new Set<string>();

  // Walked in order rather than slot-by-slot, so the count the model returns need
  // not equal the count we asked for — it has come back with 2 systems for a batch
  // of 20, and it may one day come back with 22.
  for (const raw of items) {
    if (questions.length === count) break;

    const item = readAiEquationItem(raw);
    if (!item) {
      if (raw !== undefined) rejects.push('not a well-formed item');
      continue;
    }

    // canonicalise FIRST, sanitize LAST. sanitizePlainText strips `*` as markdown
    // emphasis, so running it first would silently eat the ASCII product in
    // "A * 2" and leave "A 2" — an illegal term where a legal one was recoverable.
    // The order is also the right one on principle: canonicalize is a parser
    // normaliser, sanitize is the render firewall, and the firewall belongs last,
    // immediately before the string is stored on the question. (An HTML tag still
    // does not survive: canonicalize only spaces operators, and sanitize's tag
    // pattern matches "<img src = x>" exactly as it matches "<img src=x>".)
    const equationsDisplay = item.equations.map((e) => sanitizePlainText(canonicalizeEquation(e)));

    // The same system twice in one set is a visible bug, and asking for 20
    // original systems does not stop the model repeating itself.
    const fingerprint = equationsDisplay.join('|');
    if (seen.has(fingerprint)) {
      rejects.push('duplicate of an earlier system');
      continue;
    }

    // The band asked for a 3-variable system; a 2-variable one is a different,
    // easier question. Caught here because validateEquationQuestion cannot know
    // which band the question was generated for.
    const variables = variablesUsed(equationsDisplay);
    if (variables.length !== EXPECTED_VARIABLES[difficulty]) {
      rejects.push(
        `${variables.length} variables in the equations, expected ${EXPECTED_VARIABLES[difficulty]} for ${difficulty}`,
      );
      continue;
    }

    // Our solver, not the model's arithmetic. A correct system with a mislabelled
    // answer key is salvageable; a mislabelled one we trusted would be a wrong
    // answer shown to the learner as truth.
    const solution = solveDisplayedSystem(equationsDisplay, variables) ?? item.solution;
    const prng = createPrng(hashString(fingerprint));
    const target = variables[variables.length - 1];
    const candidate: EquationQuestion = {
      id: crypto.randomUUID(),
      type: 'equations',
      difficulty,
      seed: prng.int(0, 2 ** 31 - 1),
      ruleTags: [`eq.vars${variables.length}`, 'eq.ai'],
      variables,
      equationsDisplay,
      solution,
      askMode: 'choice',
      target: { variable: target, ...buildChoiceOptions(target, solution, prng) },
      explanationSteps: [
        ...variables.map((v) => `${v} = ${solution[v]}.`),
        'Check: substitute the values into every equation — each line balances.',
      ],
    };

    const verdict = validateEquationQuestion(candidate);
    if (verdict.ok) {
      seen.add(fingerprint);
      questions.push(candidate);
    } else {
      rejects.push(verdict.reasons[0] ?? 'unknown');
    }
  }

  // R7: the learner always receives `count` valid questions, whatever the model did
  const aiAccepted = questions.length;
  for (let i = aiAccepted; i < count; i++) questions.push(deterministicFallback(i));

  return { questions, aiAccepted, rejects };
}

/* ---------------------- G4: GAM passage firewall -------------------------- */

/** A model may put a figure placeholder in any text field. AI passages ship
 *  without figures, so a surviving `{{fig:…}}` would only ever fail to resolve —
 *  strip it (loosely, not just the strict slug form) before sanitising. */
const GAM_FIG_PLACEHOLDER = /\{\{\s*fig:[^}]*\}\}/gi;

/** Read → strip figure refs → sanitise, the same firewall order the other
 *  subtests use: stripping first, the render firewall last. */
function gamText(value: unknown): string {
  return sanitizePlainText((typeof value === 'string' ? value : '').replace(GAM_FIG_PLACEHOLDER, ' '));
}

function toKebabId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const GAM_SKILLS: readonly string[] = ['concept', 'compute', 'transfer'];
const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

/** Eight-word shingles of a passage, normalised so formatting differences
 *  (the seed bank is full of **bold** and $math$ the candidate has already had
 *  stripped) cannot hide a copy — both sides run through sanitizePlainText and
 *  are lower-cased before shingling. */
function eightGrams(text: string): string[] {
  const words = sanitizePlainText(text).toLowerCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const grams: string[] = [];
  for (let i = 0; i + 8 <= words.length; i++) grams.push(words.slice(i, i + 8).join(' '));
  return grams;
}

/** True when the candidate is too close to a seed passage: it shares ≥3 distinct
 *  8-grams with any one seed, or its title case-insensitively equals a seed's.
 *  Three exact eight-word overlaps with a single passage is a strong copy signal
 *  that original prose effectively never trips. */
function overlapsSeedBank(
  passageMarkdown: string,
  title: string,
  seedBank: { title: string; passageMarkdown: string }[],
): boolean {
  const normTitle = title.trim().toLowerCase();
  const candidate = new Set(eightGrams(passageMarkdown));
  for (const seed of seedBank) {
    if (normTitle.length > 0 && seed.title.trim().toLowerCase() === normTitle) return true;
    const seedGrams = new Set(eightGrams(seed.passageMarkdown));
    let shared = 0;
    for (const g of candidate) {
      if (seedGrams.has(g) && ++shared >= 3) return true;
    }
  }
  return false;
}

/**
 * G4 firewall: turn a model's GamPassage-shaped payload into a validated
 * GamPassage, or null (R7 — AI never gates; the caller falls back to the seed /
 * community bank).
 *
 * topicArea and difficulty are stamped from the caller's request, never trusted
 * from the model — the caller asked for a specific area, and the whole passage
 * exists to serve it. The model's per-question difficulty IS trusted (it knows
 * which of its own questions are harder), falling back to the passage difficulty.
 *
 * Beyond `validateGamPassage` (the same validator the seed bank must pass) this
 * adds one check the validator cannot: an 8-gram overlap against the real seed
 * bank, so the model cannot pad the pool by lightly re-wording a seed passage.
 */
export function salvageGamPassage(
  payload: unknown,
  topicArea: GamTopicArea,
  difficulty: Difficulty,
  seedBank: { title: string; passageMarkdown: string }[],
): GamPassage | null {
  const raw = record(payload);
  if (!raw) return null;

  const id =
    toKebabId(typeof raw.id === 'string' ? raw.id : '') ||
    toKebabId(typeof raw.title === 'string' ? raw.title : '') ||
    topicArea;

  const questions: GamQuestion[] = [];
  for (const entry of Array.isArray(raw.questions) ? raw.questions : []) {
    const q = record(entry);
    if (!q) continue;
    const skillRaw = String(q.skill);
    const skill = GAM_SKILLS.includes(skillRaw) ? skillRaw : 'concept';
    const diffRaw = String(q.difficulty);
    const qDifficulty = DIFFICULTIES.includes(diffRaw) ? (diffRaw as Difficulty) : difficulty;
    const options = (Array.isArray(q.options) ? q.options.map(gamText) : []) as [
      string,
      string,
      string,
      string,
    ];
    questions.push({
      id: `${id}-q${questions.length + 1}`,
      type: 'gam',
      passageId: id,
      difficulty: qDifficulty,
      seed: 0,
      // a bad correctIndex (out of 0..3, or absent) stays out of range on purpose:
      // validateGamQuestion rejects it, which is the correct outcome
      stem: gamText(q.stem),
      options,
      correct: Math.round(finiteNumber(q.correctIndex, -1)) as 0 | 1 | 2 | 3,
      explanation: gamText(q.explanation),
      skillTags: [`gam.skill.${skill}`],
      ruleTags: [`gam.topic.${topicArea}`, `gam.skill.${skill}`],
    });
  }

  const passage: GamPassage = {
    id,
    topicArea,
    title: gamText(raw.title),
    // clamped, not rejected — estimatedMinutes is a display hint, so a silly value
    // should not throw away an otherwise good passage
    estimatedMinutes: Math.min(25, Math.max(4, Math.round(finiteNumber(raw.estimatedMinutes, 15)))),
    difficulty,
    source: 'ai+validated',
    passageMarkdown: gamText(raw.passageMarkdown),
    questions,
  };

  if (!validateGamPassage(passage).ok) return null;
  if (overlapsSeedBank(passage.passageMarkdown, passage.title, seedBank)) return null;
  return passage;
}
