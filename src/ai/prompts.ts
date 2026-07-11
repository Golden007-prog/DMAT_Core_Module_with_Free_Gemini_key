import type {
  Difficulty,
  EquationQuestion,
  FigureQuestion,
  Frame,
  LatinLetter,
  LatinQuestion,
  PlacedSymbol,
  Question,
} from '../engine/types';
import { LATIN_ALPHABETS, glyphFor } from '../engine/latinSquares/alphabets';

/* ------------------------------- G1: equations ---------------------------- */

export const EQUATION_BATCH_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      equations: { type: 'array', items: { type: 'string' } },
      solution: {
        type: 'object',
        properties: {
          A: { type: 'integer' },
          B: { type: 'integer' },
          C: { type: 'integer' },
          D: { type: 'integer' },
        },
      },
    },
    required: ['equations', 'solution'],
  },
} as const;

const DIFficultySpec: Record<Difficulty, string> = {
  easy: '2 variables (A, B) and exactly 2 equations; one equation resolves a variable directly, the other is a direct substitution.',
  medium:
    '3 variables (A, B, C) and exactly 3 equations; include one multiplicative definition (like "3 × A = B" or "B ÷ 2 = A") and one combining equation with coefficients.',
  hard: '4 variables (A, B, C, D) and exactly 4 equations; three definitions plus one hub equation over 3-4 variables with mixed signs (like "A − B + C − D = 2").',
};

export function equationBatchPrompt(count: number, difficulty: Difficulty): string {
  return [
    `Generate ${count} original systems of linear equations for a dMAT-style aptitude test.`,
    `Difficulty: ${DIFficultySpec[difficulty]}`,
    'Hard constraints for EVERY system:',
    '- Every variable value is an integer from 1 to 20 and the system has EXACTLY ONE solution.',
    '- Allowed equation grammar: each side is a sum/difference of terms; a term is an integer, a variable, "int × var", or "var ÷ int" (exact division only).',
    '- Use the glyphs × and ÷ and the minus sign −. Never use *, /, ^, brackets, or decimals.',
    '- Displayed integer constants stay between 1 and 99.',
    'Return a JSON array; each item has "equations" (array of strings) and "solution" (object mapping each variable letter to its integer value).',
  ].join('\n');
}

/* --------------------------- G2: explain a mistake ------------------------ */

export interface ExplainStep {
  title: string;
  detail: string;
}

export interface AiExplanation {
  /** the specific misconception their wrong answer points at */
  diagnosis: string;
  /** the forced deduction chain, one verifiable move per step */
  steps: ExplainStep[];
  keyInsight: string;
  tactic: string;
}

export const EXPLAIN_SCHEMA = {
  type: 'object',
  properties: {
    diagnosis: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['title', 'detail'],
      },
    },
    keyInsight: { type: 'string' },
    tactic: { type: 'string' },
  },
  required: ['diagnosis', 'steps', 'keyInsight', 'tactic'],
} as const;

/* --- shared shaping: the same contract for all three subtests -------------- */

const EXPLAIN_ROLE = [
  'You are a dMAT Core Module tutor. The learner got this task wrong and is looking at the reviewed',
  'task right now, with the correct answer already visible to them. Everything under GROUND TRUTH',
  'was produced by the app\'s own verified solver: explain it, never re-derive it. If your reasoning',
  'disagrees with the ground truth, your reasoning is wrong — recheck it, do not "correct" the truth.',
].join('\n');

const EXPLAIN_FIELDS = [
  'WRITE FOUR FIELDS:',
  'diagnosis — 1-2 sentences, max 40 words. Name the ONE mechanism their specific answer points at,',
  '  in the second person ("you tracked the triangle but read its bounce as a wrap-around").',
  '  Use the SLIP ANALYSIS if it identifies the slip. If their answer carries no signal, say which two',
  '  mistakes it is equally consistent with. If they left it blank, say what to look at first instead.',
  'steps — 3 to 6 items, the deduction chain as an exam-time solver would run it. "title" is the move',
  '  in at most 8 words; "detail" is at most 35 words and must be checkable against what is on their',
  '  screen (quote the exact equation line, cell, or matrix). One deduction per step, no leaps, no step',
  '  that needs a fact you were not given. The last step states the final answer, and it MUST equal the',
  '  correct answer in GROUND TRUTH.',
  'keyInsight — max 30 words. The transferable idea this task tests. The exam retests the idea, not this task.',
  'tactic — max 30 words. One rule of thumb for spotting this pattern faster next time, phrased as an action',
  '  they can take in the first 10 seconds of a similar task ("count the givens per row before touching a cell").',
].join('\n');

const EXPLAIN_HARD_RULES = [
  'HARD RULES:',
  '- Plain text only. No markdown, no *, #, backticks, bullet characters, LaTeX, or emoji.',
  '- Under 250 words across all four fields together — this is read on a phone.',
  '- Address the learner as "you". Warm but blunt: no praise, no encouragement, no "great attempt".',
  '- NEVER write "be more careful", "take your time", "double-check", "you rushed" or any variant.',
  '  Those teach nothing. Name the mechanism that failed instead.',
  '- Use only the labels used in GROUND TRUTH (the same symbols, matrix numbers, variable letters).',
].join('\n');

/* --- equations ------------------------------------------------------------ */

/** Turn the learner's wrong value into a named slip. A pick that equals another
 *  variable's value or double/half/negated the truth is a specific, teachable
 *  error — the model cannot infer that reliably, so we hand it over. */
function equationSlipAnalysis(question: EquationQuestion, userAnswer: unknown): string {
  const asked = question.target?.variable ?? question.variables[question.variables.length - 1];
  const truth = question.solution[asked];

  if (typeof userAnswer === 'number') {
    const relations: string[] = [];
    for (const [v, value] of Object.entries(question.solution)) {
      if (v !== asked && value === userAnswer) relations.push(`it is the value of ${v}, not of ${asked}`);
    }
    if (userAnswer === truth * 2) relations.push('it is exactly double the true value');
    if (truth % 2 === 0 && userAnswer === truth / 2) relations.push('it is exactly half the true value');
    if (userAnswer === -truth) relations.push('it is the true value with the sign flipped');
    if (Math.abs(userAnswer - truth) === 1) relations.push('it is off by exactly one');
    return relations.length > 0
      ? `They picked ${userAnswer} (correct: ${truth}). Note: ${relations.join('; ')}.`
      : `They picked ${userAnswer} (correct: ${truth}). No obvious arithmetic relation to the true value — the substitution chain probably broke earlier.`;
  }

  if (typeof userAnswer === 'object' && userAnswer !== null) {
    const entered = userAnswer as Record<string, unknown>;
    const wrong = question.variables
      .filter((v) => entered[v] !== question.solution[v])
      .map((v) => `${v}: they entered ${JSON.stringify(entered[v])}, true value ${question.solution[v]}`);
    return wrong.length > 0
      ? `Entered values that are wrong — ${wrong.join('; ')}. The first variable in the solve order that is wrong is where the chain broke.`
      : 'They entered the right values but the submission was incomplete.';
  }

  return `They left it blank. The correct value of ${asked} is ${truth}.`;
}

function equationsTask(question: EquationQuestion, userAnswer: unknown): string {
  const asked = question.target?.variable ?? question.variables[question.variables.length - 1];
  return [
    'SUBTEST: Mathematical Equations — a small linear system; every variable is a whole number from 1 to 20;',
    'exactly one solution exists. The learner picks the value of one asked variable from five options.',
    '',
    'GROUND TRUTH',
    'Equations exactly as displayed (line numbers are the ones the learner sees):',
    ...question.equationsDisplay.map((line, i) => `  (${i + 1}) ${line}`),
    `Asked variable: ${asked}. Correct value: ${question.solution[asked]}.`,
    `Full solution: ${question.variables.map((v) => `${v} = ${question.solution[v]}`).join(', ')}.`,
    ...(question.target ? [`Options offered: ${question.target.options.join(', ')}.`] : []),
    'Verified solve order (elaborate on this chain, do not invent a different one):',
    ...question.explanationSteps.map((s) => `  - ${s}`),
    '',
    'THE LEARNER',
    equationSlipAnalysis(question, userAnswer),
    '',
    'Every step must cite the equation line number it uses, and resolve exactly one variable.',
  ].join('\n');
}

/* --- figures -------------------------------------------------------------- */

const cellRef = (row: number, col: number) => `r${row + 1}c${col + 1}`;

const symbolState = (s: PlacedSymbol) =>
  `${s.color} ${s.shape} at ${cellRef(s.row, s.col)} facing ${s.rotation}°`;

const frameState = (frame: Frame) =>
  [...frame].sort((a, b) => a.symbolId.localeCompare(b.symbolId)).map(symbolState).join('; ');

/** Symbol-by-symbol diff between the chosen option and the correct one — this
 *  is the whole diagnosis for figures, and it is cheap for us and unreliable
 *  for a Flash-tier model reading raw frames. */
function frameDiff(correct: Frame, chosen: Frame): string[] {
  const out: string[] = [];
  for (const c of correct) {
    const p = chosen.find((s) => s.symbolId === c.symbolId);
    if (!p) continue;
    const bits: string[] = [];
    if (p.row !== c.row || p.col !== c.col) {
      bits.push(`sits at ${cellRef(p.row, p.col)} instead of ${cellRef(c.row, c.col)}`);
    }
    if (p.rotation !== c.rotation) bits.push(`faces ${p.rotation}° instead of ${c.rotation}°`);
    if (p.color !== c.color) bits.push(`is ${p.color} instead of ${c.color}`);
    if (bits.length > 0) out.push(`the ${c.shape} ${bits.join(' and ')}`);
  }
  return out;
}

function figureImageBlock(
  label: string,
  image: FigureQuestion['image1'],
  picked: 0 | 1 | 2 | undefined,
): string {
  const lines = [
    `${label} — the three options (the learner sees them labelled "Matrix 1/2/3" inside ${label}):`,
    ...image.options.map((frame, i) => `  Matrix ${i + 1}: ${frameState(frame)}`),
    `  Correct: Matrix ${image.correct + 1}.`,
  ];
  if (picked === undefined) {
    lines.push('  The learner left this one blank.');
  } else if (picked === image.correct) {
    lines.push(`  The learner picked Matrix ${picked + 1} — this half was RIGHT, do not "fix" it.`);
  } else {
    const diff = frameDiff(image.options[image.correct], image.options[picked]);
    lines.push(
      `  The learner picked Matrix ${picked + 1}. Difference from the correct matrix: ${
        diff.length > 0 ? diff.join('; ') : 'no single-symbol difference isolated'
      }.`,
    );
  }
  return lines.join('\n');
}

function figuresTask(question: FigureQuestion, userAnswer: unknown): string {
  const answer = (typeof userAnswer === 'object' && userAnswer !== null ? userAnswer : {}) as {
    image1?: 0 | 1 | 2;
    image2?: 0 | 1 | 2;
  };
  return [
    'SUBTEST: Figure Sequences — four 4x4 matrices are shown; symbols move, rotate and recolour by one',
    'fixed rule each, applied once per transition. The learner picks the 5th matrix (Image 1) and the',
    '6th matrix (Image 2) from three options each. Cells are named rXcY, row 1 top, column 1 left.',
    '',
    'GROUND TRUTH',
    'Generating rules, one per symbol (each symbol has a unique shape — identify symbols by shape):',
    ...question.ruleDescriptions.map((d) => `  - ${d}`),
    'Machine-readable programs (movement/rotation/colour rules as the generator ran them):',
    `  ${JSON.stringify(question.program)}`,
    'The four given matrices, in order:',
    ...question.givenFrames.map((frame, i) => `  Matrix ${i + 1}: ${frameState(frame)}`),
    '',
    figureImageBlock('Image 1 (5th matrix)', question.image1, answer.image1),
    figureImageBlock('Image 2 (6th matrix)', question.image2, answer.image2),
    '',
    'THE LEARNER',
    'Diagnose from the DIFFERENCE lines above: a wrong cell means the movement rule (direction, step size,',
    'acceleration, bounce vs slide) was misread; a wrong angle means the rotation rule; a wrong colour means',
    'the colour cycle was advanced the wrong number of times. Name the symbol and the exact misreading.',
    'Steps must track only the symbols they actually got wrong — do not narrate the ones they got right.',
  ].join('\n');
}

/* --- latin ---------------------------------------------------------------- */

/** The learner NEVER sees A–E unless the alphabet is "letters" — internal
 *  letters stay A–E so old sessions replay (R7), so everything crossing into a
 *  prompt is glyph-mapped first. */
function glyphify(text: string, alphabet: LatinQuestion['alphabet']): string {
  if (!alphabet || alphabet === 'letters') return text;
  return text.replace(/\b[A-E]\b/g, (m) => glyphFor(alphabet, m as LatinLetter));
}

function latinGridBlock(question: LatinQuestion): string {
  return question.grid
    .map((row, r) => {
      const cells = row.map((cell, c) => {
        if (r === question.question.row && c === question.question.col) return `c${c + 1}=?`;
        return `c${c + 1}=${cell ? glyphFor(question.alphabet, cell) : '_'}`;
      });
      return `  row ${r + 1}: ${cells.join('  ')}`;
    })
    .join('\n');
}

function latinTask(question: LatinQuestion, userAnswer: unknown): string {
  const alphabet = question.alphabet ?? 'letters';
  const glyphs = LATIN_ALPHABETS[alphabet].glyphs;
  const symbolList = (['A', 'B', 'C', 'D', 'E'] as LatinLetter[]).map((l) => glyphs[l]).join(' ');
  const correct = glyphFor(alphabet, question.solutionLetter);
  const picked =
    typeof userAnswer === 'string' && userAnswer in glyphs
      ? glyphFor(alphabet, userAnswer as LatinLetter)
      : null;

  return [
    'SUBTEST: Latin Squares — a 5x5 grid; each of the five symbols appears exactly once in every row and',
    'exactly once in every column. The learner must name the symbol in the "?" cell.',
    '',
    `The five symbols are: ${symbolList}. These glyphs are the ONLY names they have. The learner sees`,
    'exactly these on screen, so never rename them: no substitute letters, no "the first symbol".',
    'Every mention of a symbol, in every field, is one of the five glyphs above, copied verbatim.',
    // Measured against the real API: the model obeys the glyph rule for symbol names
    // and then opens keyInsight with "A single empty cell…". On a grid whose symbols
    // are not letters, a stray capital still reads as a symbol the learner cannot
    // find on screen — so the article has to go too.
    // Phrased without naming the letters: this very text is checked by
    // validateAi.test.ts for leaked internal symbols, and spelling them out here
    // would put them in the tutor's mouth — the exact failure it guards against.
    ...(alphabet === 'letters'
      ? []
      : [
          'Never write a lone capital letter as a word, anywhere in any field — not as a name for a symbol,',
          'and not as the English indefinite article opening a sentence. Recast such a sentence to start with',
          'another word ("One empty cell...", "Each row..."). Lower-case articles are fine.',
        ]),
    '',
    'GROUND TRUTH',
    `Grid (_ = empty, ? = the asked cell at row ${question.question.row + 1}, column ${question.question.col + 1}):`,
    latinGridBlock(question),
    `Correct symbol for "?": ${correct}.`,
    `Inference depth: ${question.inferenceDepth} — that many cells must be forced before "?" is forced.`,
    'Verified forced chain from the solver (elaborate on exactly this chain — a different chain may not be forced):',
    ...question.explanationSteps.map((s) => `  - ${glyphify(s, question.alphabet)}`),
    '',
    'THE LEARNER',
    picked === null
      ? 'They left it blank. Say which row or column to scan first (the one with the most filled cells) and why.'
      : picked === correct
        ? `They answered ${picked}, which is correct — treat this as a request to understand the chain.`
        : `They answered ${picked} (correct: ${correct}). Check the grid: find where ${picked} already appears in row ${question.question.row + 1} or column ${question.question.col + 1}, or whether they confused the row constraint with the column constraint. Name the exact clash their answer violates.`,
    '',
    `Each step must cite the row or column that forces it, by number, and name symbols only as ${symbolList}.`,
  ].join('\n');
}

/* --- entry point ---------------------------------------------------------- */

export function explainMistakePrompt(question: Question, userAnswer: unknown): string {
  const task =
    question.type === 'equations'
      ? equationsTask(question, userAnswer)
      : question.type === 'figures'
        ? figuresTask(question, userAnswer)
        : latinTask(question, userAnswer);

  return [
    EXPLAIN_ROLE,
    '',
    `Difficulty: ${question.difficulty}. Exam pace: 75 seconds per task.`,
    '',
    task,
    '',
    EXPLAIN_FIELDS,
    '',
    EXPLAIN_HARD_RULES,
    '',
    'Return JSON: {"diagnosis": "...", "steps": [{"title": "...", "detail": "..."}], "keyInsight": "...", "tactic": "..."}',
  ].join('\n');
}

/* ------------------------------ G3: coaching ------------------------------ */

export interface CoachLeveragePoint {
  title: string;
  why: string;
  evidence: string;
}

export interface CoachDrill {
  /** an exact rule tag from the stats — the UI links drills back to analytics */
  tag: string;
  drill: string;
  minutes: number;
}

export interface AiCoachPlan {
  headline: string;
  leveragePoints: CoachLeveragePoint[];
  drills: CoachDrill[];
  pacing: string;
}

export const COACH_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    leveragePoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['title', 'why', 'evidence'],
      },
    },
    drills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string' },
          drill: { type: 'string' },
          minutes: { type: 'integer' },
        },
        required: ['tag', 'drill', 'minutes'],
      },
    },
    pacing: { type: 'string' },
  },
  required: ['headline', 'leveragePoints', 'drills', 'pacing'],
} as const;

export interface CoachStats {
  sessions: number;
  overallAccuracy: number;
  perSubtest: Record<string, { accuracy: number; avgTimeSec: number; attempts: number }>;
  weakestTags: Array<{ tag: string; accuracy: number; attempts: number }>;
  unansweredShareExam: number;
}

/** Rule tags are opaque slugs (lat.chain4plus, fig.accel.x+1). Without a
 *  glossary the model guesses at what it is prescribing drills for. */
const TAG_GLOSSARY: Record<string, string> = {
  'fig.move.axis': 'figures: a symbol travels along a row or column and bounces off the wall',
  'fig.move.diagonal.bounce': 'figures: a symbol travels diagonally and reflects off the wall',
  'fig.move.diagonal.slide': 'figures: a symbol travels diagonally and slides along the wall it hits',
  'fig.move.perimeter': 'figures: a symbol walks the outer ring clockwise or counter-clockwise',
  'fig.move.cycle': 'figures: a symbol repeats a fixed direction sequence, 1 cell per step',
  'fig.accel.x+1': 'figures: a rule that speeds up — 1, then 2, then 3 cells (or 90°, 180°, 270°) per transition',
  'fig.rotate.cw': 'figures: a symbol rotates clockwise every transition',
  'fig.rotate.ccw': 'figures: a symbol rotates counter-clockwise every transition',
  'fig.color.cycle2': 'figures: a symbol alternates between 2 colours',
  'fig.color.cycle3': 'figures: a symbol cycles through 3 colours',
  'eq.vars2': 'equations: 2-variable system',
  'eq.vars3': 'equations: 3-variable system',
  'eq.vars4': 'equations: 4-variable system',
  'eq.subst.depth1': 'equations: one substitution to reach the asked variable',
  'eq.subst.depth2': 'equations: two chained substitutions',
  'eq.subst.depth3': 'equations: three chained substitutions',
  'eq.op.mul': 'equations: a multiplicative definition like 3 × A = B',
  'eq.op.div': 'equations: an exact-division definition like B ÷ 2 = A',
  'eq.combine': 'equations: a combining equation with coefficients on both sides',
  'eq.hub': 'equations: one hub equation over 3-4 variables with mixed signs',
  'eq.ai': 'equations: AI-generated system (validated by the same solver as the built-in ones)',
  'lat.direct': 'latin squares: the "?" cell is forced directly by its own row and column',
  'lat.chain2': 'latin squares: 2-3 other cells must be forced first',
  'lat.chain4plus': 'latin squares: 4+ cells must be forced first — long inference chains',
  'lat.hiddenSingle.row': 'latin squares: a symbol fits only one column within a row',
  'lat.hiddenSingle.col': 'latin squares: a symbol fits only one row within a column',
  'lat.clues.sparse': 'latin squares: few givens, so the first deduction is hard to find',
};

function describeTag(tag: string): string {
  if (TAG_GLOSSARY[tag]) return TAG_GLOSSARY[tag];
  const multi = /^fig\.multi\.(\d+)symbols$/.exec(tag);
  if (multi) return `figures: ${multi[1]} independent symbols to track at once`;
  return 'no glossary entry — do not prescribe a drill for this tag';
}

export function coachPrompt(stats: CoachStats): string {
  const tags = stats.weakestTags.map((t) => t.tag);
  return [
    'You are a preparation coach for the dMAT Core Module (Figure Sequences, Mathematical Equations,',
    'Latin Squares; 20 tasks in 25 minutes per subtest — 75 seconds per task, single choice, no negative',
    'marking, so a blank is strictly worse than a guess).',
    '',
    'STATISTICS (aggregated practice data — the only evidence you have):',
    JSON.stringify(stats),
    '',
    'RULE TAG GLOSSARY (the weak tags above, decoded):',
    ...(tags.length > 0
      ? tags.map((t) => `  ${t} = ${describeTag(t)}`)
      : ['  (no tag has 5+ attempts yet — say so instead of guessing at weaknesses)']),
    '',
    'WRITE FOUR FIELDS:',
    'headline — max 20 words, the single most useful sentence about where they stand. If the data is thin',
    '  (few sessions or few attempts), say that plainly instead of over-reading the numbers.',
    'leveragePoints — exactly 2 items, the two changes with the biggest score impact. "title" max 8 words;',
    '  "why" max 30 words (the mechanism — why fixing this moves the score); "evidence" max 15 words quoting',
    '  the actual numbers from the statistics (an accuracy, a time, an unanswered share). Never invent a number.',
    'drills — exactly 3 items. "tag" MUST be one of the weak rule tags listed above, copied verbatim',
    `  (${tags.length > 0 ? tags.join(', ') : 'none available — then use the empty string and say so in the drill'}).`,
    '  "drill" max 30 words: a concrete, runnable exercise ("10 latin tasks on the shapes alphabet, hardest',
    '  difficulty, forcing yourself to write the chain out loud"), not a topic to "review". "minutes" is an',
    '  integer of 5 to 30, the realistic length of one sitting.',
    'pacing — max 40 words, one concrete change to how they spend the 75 seconds, grounded in their avgTimeSec',
    '  and unansweredShareExam. If they leave tasks blank in exam mode, address that first — there is no negative',
    '  marking, so a blank is strictly worse than a guess: a guess scores one in three on Figure Sequences',
    '  (3 options per image) and one in five on Equations and Latin Squares (5 options each).',
    '',
    'HARD RULES:',
    '- Plain text only. No markdown, no *, #, backticks, bullet characters, or emoji.',
    '- Address the learner as "you". No motivational filler, no praise, no "keep it up", no exclamation marks.',
    '- Claim only what the statistics support. If a subtest has no data, do not talk about it.',
    '- Under 220 words across all four fields together.',
    '',
    'Return JSON: {"headline": "...", "leveragePoints": [{"title": "...", "why": "...", "evidence": "..."}], "drills": [{"tag": "...", "drill": "...", "minutes": 10}], "pacing": "..."}',
  ].join('\n');
}
