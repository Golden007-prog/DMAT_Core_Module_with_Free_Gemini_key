import type {
  Difficulty,
  EquationQuestion,
  FigureQuestion,
  Frame,
  GamQuestion,
  GamTopicArea,
  LatinLetter,
  LatinQuestion,
  PlacedSymbol,
  Question,
} from '../engine/types';
import { LATIN_ALPHABETS, glyphFor } from '../engine/latinSquares/alphabets';

/* ------------------------------- G1: equations ---------------------------- */

/**
 * Construct-from-solution schema. The model is bad at SOLVING and fine at
 * CONSTRUCTING, so it is never asked to solve: it picks the answer first and
 * then builds lines that are true for it.
 *
 * `propertyOrdering` is the load-bearing part, not decoration. Gemini emits the
 * keys of an object in the order this schema declares them, and every equation
 * call runs at thinkingBudget 0 — the model has NO scratch space, so the only
 * place it can do arithmetic is in the tokens it emits. Ordering the keys
 * solution → left → leftValue → right → rightValue → equation therefore forces
 * it to (a) choose the values before any equation exists, (b) evaluate each side
 * BEFORE it writes the line that depends on that value. The working fields are
 * scaffolding: validateAi keeps only `equation` and throws the rest away.
 *
 * Measured on gemini-3.1-flash-lite, 20-system batches: the medium band's whole
 * failure mode was "system has no solution in [1..20]" — the model inventing a
 * line like "2 × A + 3 × C = 35" and getting 8 + 27 wrong in one forward pass
 * with nowhere to work it out. See equationBatchPrompt.
 */
/** What each band is made of. The schema is generated from this, so a band can
 *  only ever emit the variables and the line count it is supposed to have. */
const BAND: Record<Difficulty, { vars: string[]; lines: number }> = {
  easy: { vars: ['A', 'B'], lines: 2 },
  medium: { vars: ['A', 'B', 'C'], lines: 3 },
  hard: { vars: ['A', 'B', 'C', 'D'], lines: 4 },
};

/**
 * The schema is generated per band, not shared, and both of those facts are
 * load-bearing.
 *
 * SCOPED TO THE BAND. A schema that offers A, B, C and D on every band gets all
 * four filled in on every band. Measured 2026-07-11, gemini-3.1-flash-lite: with
 * one shared schema the easy band returned 20/20 systems built on three
 * variables — the prompt said "variables A and B" and the schema said otherwise,
 * and the schema won. Declaring only the band's own variables, `required`, and
 * pinning `lines` to minItems === maxItems makes the wrong shape unrepresentable
 * rather than merely discouraged.
 *
 * ORDERED. Gemini emits an object's keys in the order the schema declares them,
 * and every equation call runs at thinkingBudget 0 — the model has NO scratch
 * space, so the only place it can do arithmetic is in the tokens it emits.
 * Ordering the keys solution → left → leftSub → leftValue → right → rightValue →
 * equation therefore forces it to (a) choose the answer before any equation
 * exists, (b) substitute, (c) evaluate, and only then (d) commit to a line that
 * is true by construction. Splitting leftSub (substitute, no arithmetic) from
 * leftValue (arithmetic on literals it can now see) is what makes a four-term
 * signed sum survivable: with leftValue alone the model wrote
 * "A + B − C − D = 14" for a side worth 10, and the hard band collapsed to 10/20.
 *
 * validateAi keeps only `equation`; every other field is scaffolding and is
 * discarded once it has done its job.
 */
export function equationBatchSchema(difficulty: Difficulty): object {
  const { vars, lines } = BAND[difficulty];
  const solution: Record<string, object> = {};
  for (const v of vars) solution[v] = { type: 'integer', minimum: 1, maximum: 20 };

  return {
    type: 'array',
    items: {
      type: 'object',
      propertyOrdering: ['solution', 'lines'],
      properties: {
        solution: {
          type: 'object',
          propertyOrdering: vars,
          properties: solution,
          required: vars,
        },
        lines: {
          type: 'array',
          minItems: lines,
          maxItems: lines,
          items: {
            type: 'object',
            propertyOrdering: ['left', 'leftSub', 'leftValue', 'right', 'rightValue', 'equation'],
            properties: {
              left: { type: 'string' },
              leftSub: { type: 'string' },
              // −99..99, and the negative half is the whole point. This bound was
              // 1..99 for one measured round, on the theory that a side worth 0 or
              // less becomes an illegal displayed constant. It backfired: a
              // mixed-sign hub lands on a negative value often, and a model that
              // is FORBIDDEN to say so does not rewrite the line — it writes the
              // false value the schema will accept and then bends the other side
              // to match it ("D + B − C + A = 5 − 4" for a side truly worth −1).
              // A bound the model can only satisfy by lying manufactures the exact
              // inconsistency it was added to prevent, and the hard band fell to
              // 12/20. Only 0 is actually fatal downstream (validate.ts wants every
              // displayed integer in 1..99, and −1 displays the digit 1); a
              // negative constant is legal, so let the model tell the truth and
              // steer it toward positive sides in prose instead.
              leftValue: { type: 'integer', minimum: -99, maximum: 99 },
              right: { type: 'string' },
              rightValue: { type: 'integer', minimum: -99, maximum: 99 },
              equation: { type: 'string' },
            },
            required: ['left', 'leftSub', 'leftValue', 'right', 'rightValue', 'equation'],
          },
        },
      },
      required: ['solution', 'lines'],
    },
  };
}

const DIFFICULTY_SPEC: Record<Difficulty, string> = {
  easy: 'variables A and B, exactly 2 lines — one line fixes a variable outright (like "5 + A = 12"), the other links B to A (like "B − 3 = A").',
  medium:
    'variables A, B and C, exactly 3 lines — two definition lines that CHAIN, each introducing exactly one new variable (line 1 defines B from A, line 2 defines C from B), at least one of them multiplicative or an exact division (like "3 × A = B" or "B ÷ 2 = C"), plus one combining line with coefficients over two or three variables and a plain integer on the right (like "2 × A + 3 × C = 35").',
  // The chain is spelled out variable by variable because "three definitions plus
  // a hub" was not specific enough to be independent: measured, the model would
  // define C twice and never define D, and the system then had many solutions in
  // 1..20 (6 of 20 in one hard batch). Each definition introducing exactly one NEW
  // variable makes the first three lines independent by construction, and the hub
  // supplies the fourth constraint.
  hard: 'variables A, B, C and D, exactly 4 lines — three definition lines that CHAIN, each introducing exactly one new variable: line 1 defines B from A, line 2 defines C from B, line 3 defines D from C. Then one hub line using all four variables with mixed signs and a plain integer on the right (like "A − B + C + D = 13").',
};

/** One system per band, worked the way the model must work all `count` of them.
 *  The substitution is spelled out on its own on purpose: the example is not
 *  showing the model what a system looks like (it knows that), it is showing it
 *  that the working belongs in leftSub/leftValue and happens BEFORE the line. */
const WORKED_EXAMPLE: Record<Difficulty, string[]> = {
  easy: [
    '  solution: A=7, B=10',
    '  line 1: left "5 + A", leftSub "5 + 7", leftValue 12, right "12", rightValue 12, equation "5 + A = 12".',
    '  line 2: left "B − 3", leftSub "10 − 3", leftValue 7, right "A", rightValue 7, equation "B − 3 = A".',
    '  A=7, B=10 balances both lines, and no other pair in 1..20 does.',
  ],
  medium: [
    '  solution: A=4, B=12, C=9',
    '  line 1 (B from A):    left "B ÷ 3", leftSub "12 ÷ 3", leftValue 4, right "A", rightValue 4, equation "B ÷ 3 = A".',
    '  line 2 (C from B):    left "C + 3", leftSub "9 + 3", leftValue 12, right "B", rightValue 12, equation "C + 3 = B".',
    '  line 3 (the combine): left "2 × A + 3 × C", leftSub "2 × 4 + 3 × 9", leftValue 35, right "35", rightValue 35, equation "2 × A + 3 × C = 35".',
    '    (leftValue worked out from leftSub, left to right: 2 × 4 is 8, 3 × 9 is 27, 8 + 27 is 35.)',
    '  A=4, B=12, C=9 balances all three lines, and no other triple in 1..20 does.',
  ],
  hard: [
    '  solution: A=3, B=9, C=5, D=14',
    '  line 1 (B from A): left "3 × A", leftSub "3 × 3", leftValue 9, right "B", rightValue 9, equation "3 × A = B".',
    '  line 2 (C from B): left "C + 4", leftSub "5 + 4", leftValue 9, right "B", rightValue 9, equation "C + 4 = B".',
    '  line 3 (D from C): left "D − C", leftSub "14 − 5", leftValue 9, right "9", rightValue 9, equation "D − C = 9".',
    '  line 4 (the hub):  left "A − B + C + D", leftSub "3 − 9 + 5 + 14", leftValue 13, right "13", rightValue 13, equation "A − B + C + D = 13".',
    '    (leftValue worked out from leftSub, left to right: 3 − 9 is −6, −6 + 5 is −1, −1 + 14 is 13.)',
    '  A=3, B=9, C=5, D=14 balances all four lines, and no other quadruple in 1..20 does.',
  ],
};

export function equationBatchPrompt(count: number, difficulty: Difficulty): string {
  const { vars, lines } = BAND[difficulty];
  return [
    `Generate ${count} original systems of linear equations for a dMAT-style aptitude test.`,
    `Every system in this batch has ${DIFFICULTY_SPEC[difficulty]}`,
    '',
    'BUILD EACH SYSTEM BACKWARDS FROM ITS ANSWER. Do not invent equations and then hope a legal answer',
    'falls out of them — it will not. Choose the answer first, then write lines that are true for it by',
    'construction. Fill the fields strictly in the order below, and do the arithmetic as you go.',
    '',
    `1. "solution" — pick a whole number from 1 to 20 for each of ${vars.join(', ')}. This is a free choice:`,
    '   nothing constrains it yet, so simply choose. Vary the values widely across the batch.',
    `2. Then, for each of the ${lines} lines in turn:`,
    '   "left"       the left-hand side, written with variables, e.g. "2 × A + 3 × C".',
    '   "leftSub"    "left" again with every variable replaced by the number you chose for it, and NOTHING',
    '                worked out yet: "2 × 4 + 3 × 9". Copy the numbers in; do not add them up here.',
    '   "leftValue"  now work leftSub out, left to right, one step at a time. You are adding up numbers you',
    '                can see rather than holding an expression in your head, which is why this comes last.',
    '   "right"      the right-hand side. It must be worth exactly leftValue. On a DEFINITION line this is',
    '                normally the new variable being defined ("B"). On the FINAL line it must be the plain',
    '                integer leftValue, written as a bare number. Never write a sum here to hit the number:',
    '                "13", never "9 + 4". Never dress up a wrong leftValue by bending this side to match it.',
    '   "rightValue" substitute your values into "right" and work it out the same way. If it does not equal',
    '                leftValue, change "right" until it does — never edit leftValue to cover the gap.',
    '   "equation"   exactly "<left> = <right>", copied character for character from those two fields.',
    'Because both sides were evaluated before the line was written, every line balances by construction.',
    'leftValue is a fact about the values you chose, not a wish: report what leftSub actually comes to,',
    'even when that is a negative number. If a side comes out negative or 0, do not fake a positive value —',
    'go back and change which variables carry a minus sign until the side genuinely lands where you want it.',
    '',
    `WORKED EXAMPLE — one ${difficulty} system, done exactly the way you must do all ${count}:`,
    ...WORKED_EXAMPLE[difficulty],
    '',
    'HARD RULES for every system:',
    '- The system must have EXACTLY ONE solution in 1..20, so every line has to pin down something the',
    '  others leave open. Two lines that say the same thing are worth one line, and the system is then',
    '  short of information and has many solutions. "2 × A = B" and "B ÷ 2 = A" are ONE line written twice,',
    '  not two. So are "C + 3 = B" and "B − 3 = C". Never restate an earlier line rearranged or rescaled.',
    '- A variable may never appear on BOTH sides of the same line. "D + A − B + C = C" cancels the C and',
    '  says nothing about C at all, which leaves the system with many solutions even though the line looks',
    '  full. Each line must genuinely constrain every variable it mentions.',
    '- THE FINAL LINE IS THE ONLY THING THAT FIXES A, so its right-hand side must be a bare integer, never',
    '  a variable. The definition lines only pass a value along the chain — on their own, A could still be',
    '  anything and they would all still balance. Put a variable on the right of the final line and it stops',
    '  fixing anything: "A × 2 = B", "B ÷ 2 = C", "3 × A − C = B" is really just "2 × A = 2 × A", true for',
    '  every A, and the system has many solutions. Written as "3 × A − C = 8" the same line forces A = 4.',
    '- The variables must all have DIFFERENT values, and the chain must not undo itself. If line 1 multiplies',
    '  A by 3 to get B, line 2 must not divide B by 3 to get C — that only makes C equal to A again, and the',
    '  chain is fake. Each new variable must land somewhere genuinely new.',
    '- Grammar: a side is terms joined by + or −. A term is an integer, a variable, "int × var" with the',
    '  integer FIRST ("3 × A", never "A × 3"), or "var ÷ int". No variable twice on the same side.',
    '- In "var ÷ int" the divisor is a whole number that divides that variable\'s chosen value exactly:',
    '  with B=12, "B ÷ 3" is legal, while "B ÷ 5" and "B ÷ 4.5" are not. One fraction ruins the system.',
    '- Write ×, ÷ and − as those three glyphs. Never *, /, ^, brackets, decimals, fractions, or an implicit',
    '  product like "2A".',
    '- Every integer appearing in a line is between 1 and 99. Aim for each side to land on a positive value',
    '  in that range: you know all the values before you fix the signs, so on a mixed-sign line check leftSub',
    '  first and choose which variables are subtracted so the side comes out positive. A side worth exactly 0',
    '  cannot be written at all, so never let one land there.',
    `- Use every one of ${vars.join(', ')} in at least one line, and no other letters.`,
    `- The ${count} systems must differ from one another: different values, different coefficients, different`,
    '  shapes. Do not emit one template with the numbers nudged.',
  ].join('\n');
}

/* --------------------- G4: General Academic Module passage ---------------- */

/** Human-readable label per topic-area slug, for the prompt only — the slug is
 *  what gets stamped on the passage, never the model's rendering of it. */
const GAM_TOPIC_LABEL: Record<GamTopicArea, string> = {
  mathematics: 'Mathematics',
  'computational-sciences': 'Computational Sciences',
  'natural-sciences': 'Natural Sciences',
  engineering: 'Engineering',
  'business-administration': 'Business Administration',
  economics: 'Economics',
  'social-sciences': 'Social Sciences',
  humanities: 'Humanities',
};

/**
 * Schema for ONE GamPassage-shaped payload. Like the equation schema, the
 * `propertyOrdering` is load-bearing rather than cosmetic: the model runs at
 * thinkingBudget 0, so the only place it can reason is in the tokens it emits,
 * and the emission order forces it to commit in the right sequence.
 *
 *   passageMarkdown BEFORE questions — the questions must be answerable from a
 *   passage that already exists, so the teaching text is written first.
 *   Per question: stem → options → correctIndex → explanation. The model names
 *   all four options before it is allowed to declare which is correct, and only
 *   justifies the choice afterwards — it cannot retrofit the passage or the
 *   distractors to a letter it picked first.
 *
 * There is deliberately NO `figures` field: AI passages ship without figures.
 * validateGamPassage only requires REFERENCED figures to resolve, and the prompt
 * forbids figure references, so a passage with no figures and no `{{fig:…}}`
 * placeholders is complete. `additionalProperties` is absent everywhere — it is a
 * hard 400 at Gemini's transcoding layer (see geminiSchema.ts).
 */
export function gamPassageSchema(): object {
  return {
    type: 'object',
    propertyOrdering: ['id', 'title', 'passageMarkdown', 'estimatedMinutes', 'questions'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      passageMarkdown: { type: 'string' },
      estimatedMinutes: { type: 'integer', minimum: 4, maximum: 25 },
      questions: {
        type: 'array',
        minItems: 5,
        maxItems: 8,
        items: {
          type: 'object',
          propertyOrdering: ['stem', 'options', 'correctIndex', 'explanation', 'skill', 'difficulty'],
          properties: {
            stem: { type: 'string' },
            // exactly 4, pinned the same way the equation schema pins its line
            // count: minItems === maxItems makes the wrong shape unrepresentable
            options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
            skill: { type: 'string', enum: ['concept', 'compute', 'transfer'] },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          },
          required: ['stem', 'options', 'correctIndex', 'explanation', 'skill', 'difficulty'],
        },
      },
    },
    required: ['id', 'title', 'passageMarkdown', 'estimatedMinutes', 'questions'],
  };
}

export function gamPassagePrompt(
  topicArea: GamTopicArea,
  difficulty: Difficulty,
  bannedTitles: string[],
): string {
  const label = GAM_TOPIC_LABEL[topicArea];
  return [
    `Write ONE original practice passage for the dMAT General Academic Module (GAM) in the area of ${label}, at ${difficulty} difficulty, followed by its questions.`,
    'The GAM format is a self-contained reading passage that TEACHES a topic, then single-choice questions answerable from the passage alone. The reader is not assumed to know the topic beforehand — the passage must teach everything its questions rely on.',
    '',
    'THE PASSAGE:',
    '- 350 to 600 words. Markdown: use **bold** for the key terms you introduce, and a | markdown | table | where it genuinely helps present data or a classification.',
    '- Inline mathematics goes in $…$ using ordinary LaTeX, e.g. $E_p = \\frac{\\%\\Delta Q}{\\%\\Delta P}$. Keep every $ paired.',
    '- Teach one coherent idea, then give a concrete worked instance a question can build on: specific numbers, a small dataset, or a rule with an example.',
    '- Original prose in your own words. Never reproduce a textbook passage.',
    '',
    'THE QUESTIONS — write 6 or 7:',
    '- Each is single-choice with EXACTLY 4 options and EXACTLY ONE correct answer; correctIndex is 0-based (0, 1, 2, or 3).',
    '- Mix the skills roughly 40% conceptual (recall/understand a definition the passage gave), 30% computational (work a number out from the passage), 30% transfer (apply the idea to a fresh situation the passage did not state outright). Tag each question with its "skill".',
    '- Every wrong option must encode a NAMED misconception — a specific plausible error (a reversed ratio, a confused category, a dropped intercept), never filler. A learner who holds that misconception should be pulled toward that option.',
    '- The explanation is a worked solution in full sentences: say why the correct option is right AND why the tempting wrong ones are wrong, referring to options by their CONTENT. At least one full sentence, and at least 30 characters.',
    '- Arithmetic must be clean and independently verifiable; recompute every number before committing to it.',
    `- Calibrate hardness to ${difficulty}: an easier set leans conceptual with short computations, a harder set demands multi-step reasoning and transfer.`,
    '',
    'HARD RULES:',
    '- No figures: never emit a {{fig:…}} placeholder, and never write "the diagram/graph/figure shown". This passage ships without images, so everything a question needs must live in the words and tables.',
    '- Refer to options by their CONTENT everywhere — never by a letter and never "option a/b/c/d".',
    '- Never use "all of the above", "none of the above", or any option whose meaning depends on option order.',
    ...(bannedTitles.length > 0
      ? [`- Choose a DIFFERENT topic from every one of these already-written titles: ${bannedTitles.join('; ')}.`]
      : []),
    '- Avoid the four official sample topics entirely: vector calculations, hydrostatics (pressure in fluids), economic order quantity, and research strategies in the social sciences.',
    '',
    `One compact example of the exact JSON shape (abbreviated — write your own original ${label} topic at full length, 6-7 questions):`,
    '{"id":"signal-averaging","title":"Signal Averaging","passageMarkdown":"When a noisy measurement is repeated and the readings are averaged, the random errors partly cancel. **Averaging** $n$ independent readings reduces the random noise by a factor of $\\sqrt{n}$ ...","estimatedMinutes":13,"questions":[{"stem":"What does averaging repeated independent readings reduce?","options":["The random measurement noise","The true value of the quantity being measured","The number of readings that were taken","The units the measurement is reported in"],"correctIndex":0,"explanation":"The passage states that independent random errors partly cancel when readings are averaged, so the random noise shrinks while the underlying quantity is unchanged; the other options confuse the noise with the signal, the sample size, or the units.","skill":"concept","difficulty":"easy"}]}',
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

function gamTask(question: GamQuestion, userAnswer: unknown): string {
  const picked =
    typeof userAnswer === 'number' && userAnswer >= 0 && userAnswer <= 3
      ? question.options[userAnswer]
      : null;
  const correct = question.options[question.correct];
  return [
    'THE TASK — General Academic Module: a single-choice question about a reading passage. The passage taught everything needed; four options, exactly one correct.',
    `Question: ${question.stem}`,
    `Options: ${question.options.map((o, i) => `${'abcd'[i]}) ${o}`).join('  |  ')}`,
    `Correct answer: ${correct}`,
    `Author's worked solution: ${question.explanation}`,
    '',
    'THE LEARNER',
    picked === null
      ? 'They left it blank. Show how to eliminate the three wrong options efficiently, then confirm the remaining one.'
      : picked === correct
        ? `They chose "${picked}", which is correct — treat this as a request to understand the reasoning fully.`
        : `They chose "${picked}" (correct: "${correct}"). Name the specific misconception their choice encodes, then walk the correct reasoning.`,
    '',
    'Ground every step in the worked solution above — never invent facts beyond it. Refer to options by their content, not their letters.',
  ].join('\n');
}

/* --- entry point ---------------------------------------------------------- */

export function explainMistakePrompt(question: Question, userAnswer: unknown): string {
  const task =
    question.type === 'equations'
      ? equationsTask(question, userAnswer)
      : question.type === 'figures'
        ? figuresTask(question, userAnswer)
        : question.type === 'gam'
          ? gamTask(question, userAnswer)
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
  'gam.topic.mathematics': 'general academic module: a Mathematics reading passage',
  'gam.topic.computational-sciences': 'general academic module: a Computational Sciences reading passage',
  'gam.topic.natural-sciences': 'general academic module: a Natural Sciences reading passage',
  'gam.topic.engineering': 'general academic module: an Engineering reading passage',
  'gam.topic.business-administration': 'general academic module: a Business Administration reading passage',
  'gam.topic.economics': 'general academic module: an Economics reading passage',
  'gam.topic.social-sciences': 'general academic module: a Social Sciences reading passage',
  'gam.topic.humanities': 'general academic module: a Humanities reading passage',
  'gam.skill.concept': 'general academic module: recalling or recognising a concept the passage defined',
  'gam.skill.compute': 'general academic module: computing a result from values the passage gave',
  'gam.skill.transfer': 'general academic module: applying the passage to a new situation it did not state outright',
  'gam.skill.read-chart': 'general academic module: reading a value off a figure or table in the passage',
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
