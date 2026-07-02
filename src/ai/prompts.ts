import type { Difficulty, Question } from '../engine/types';

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

export const EXPLAIN_SCHEMA = {
  type: 'object',
  properties: { explanation: { type: 'string' } },
  required: ['explanation'],
} as const;

export function explainMistakePrompt(question: Question, userAnswer: unknown): string {
  const payload = {
    type: question.type,
    difficulty: question.difficulty,
    ...(question.type === 'equations' && {
      equations: question.equationsDisplay,
      solution: question.solution,
      asked: question.target?.variable,
    }),
    ...(question.type === 'latin' && {
      grid: question.grid,
      questionCell: question.question,
      correctLetter: question.solutionLetter,
    }),
    ...(question.type === 'figures' && {
      ruleDescriptions: question.ruleDescriptions,
      correctImage1: question.image1.correct + 1,
      correctImage2: question.image2.correct + 1,
    }),
  };
  return [
    'You are a patient tutor for the dMAT Core Module (a logic aptitude test).',
    'A learner answered this task incorrectly. Explain step by step how to solve it,',
    'and specifically address what likely went wrong given their answer.',
    'Write plain text (no markdown), 120-200 words, direct and encouraging.',
    `Task (JSON): ${JSON.stringify(payload)}`,
    `Learner's answer (JSON): ${JSON.stringify(userAnswer ?? 'no answer given')}`,
    'Return JSON: {"explanation": "..."}',
  ].join('\n');
}

/* ------------------------------ G3: coaching ------------------------------ */

export const COACH_SCHEMA = {
  type: 'object',
  properties: { plan: { type: 'string' } },
  required: ['plan'],
} as const;

export interface CoachStats {
  sessions: number;
  overallAccuracy: number;
  perSubtest: Record<string, { accuracy: number; avgTimeSec: number; attempts: number }>;
  weakestTags: Array<{ tag: string; accuracy: number; attempts: number }>;
  unansweredShareExam: number;
}

export function coachPrompt(stats: CoachStats): string {
  return [
    'You are a preparation coach for the dMAT Core Module (Figure Sequences, Mathematical Equations, Latin Squares;',
    '20 tasks in 25 minutes per subtest, 75 seconds per task, single choice, no negative marking).',
    'Based ONLY on these aggregated practice statistics, write a coaching plan of 150-250 words:',
    'name the two biggest leverage points, give three concrete drill recommendations mapped to the weak rule types,',
    'and one pacing tip. Plain text only, no markdown, address the learner as "you".',
    `Statistics (JSON): ${JSON.stringify(stats)}`,
    'Return JSON: {"plan": "..."}',
  ].join('\n');
}
