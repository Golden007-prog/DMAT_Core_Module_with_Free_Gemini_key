export type Difficulty = 'easy' | 'medium' | 'hard';
export type SubtestType = 'figures' | 'equations' | 'latin';

export interface BaseQuestion {
  id: string;
  type: SubtestType;
  difficulty: Difficulty;
  seed: number;
  /** Drives analytics (§10): every rule used in the question, e.g. "fig.accel.x+1". */
  ruleTags: string[];
}

/* ---------------------------- Figure Sequences ---------------------------- */

export type ShapeKind =
  | 'cross' // X-cross
  | 'triangle' // arrow-like, clear directional apex
  | 'square'
  | 'circle'
  | 'halfCircle' // half-filled circle, rotation-sensitive
  | 'halfSquare' // half-filled square, rotation-sensitive
  | 'tShape'
  | 'lShape'
  | 'plus'
  | 'star'
  | 'diamond'
  | 'hourglass'; // bowtie

export type ColorKind = 'black' | 'pink' | 'yellow' | 'orange' | 'green' | 'blue' | 'white';

export type Rotation = 0 | 90 | 180 | 270;
export type GridIndex = 0 | 1 | 2 | 3;

export interface PlacedSymbol {
  symbolId: string;
  shape: ShapeKind;
  color: ColorKind;
  rotation: Rotation;
  row: GridIndex;
  col: GridIndex;
}

export type Frame = PlacedSymbol[];

/** Movement rules drawn ONLY from the official rule system (§3.1). */
export type MovementRule =
  | {
      kind: 'axis-bounce';
      /** unit direction: one of the 4 axis or 4 diagonal directions */
      dr: -1 | 0 | 1;
      dc: -1 | 0 | 1;
      /** cells per transition; 'x+1' accelerates 1,2,3,4,5 */
      step: 1 | 2 | 'x+1';
      /** boundary behaviour, fixed per symbol: reflect or slide along the wall */
      boundary: 'bounce' | 'slide';
    }
  | { kind: 'perimeter'; dir: 'cw' | 'ccw'; step: 1 | 2 | 'x+1' }
  | { kind: 'direction-cycle'; dirs: Array<{ dr: -1 | 0 | 1; dc: -1 | 0 | 1 }> }
  | { kind: 'static' };

export interface RotationRule {
  dir: 'cw' | 'ccw';
  /** 90° steps per transition; 'x+1' → 1,2,3,4,5 steps */
  count: 1 | 'x+1';
}

export interface ColorRule {
  /** 2- or 3-colour cycle, advancing one step per transition */
  cycle: ColorKind[];
}

export interface SymbolProgram {
  symbolId: string;
  shape: ShapeKind;
  color: ColorKind;
  initialRotation: Rotation;
  startRow: GridIndex;
  startCol: GridIndex;
  movement: MovementRule;
  rotation?: RotationRule;
  colorRule?: ColorRule;
}

export interface FigureQuestion extends BaseQuestion {
  type: 'figures';
  givenFrames: [Frame, Frame, Frame, Frame]; // matrices 1–4
  image1: { options: [Frame, Frame, Frame]; correct: 0 | 1 | 2 }; // matrix 5
  image2: { options: [Frame, Frame, Frame]; correct: 0 | 1 | 2 }; // matrix 6
  /** human-readable, per symbol */
  ruleDescriptions: string[];
  /** the generating rule program — powers validate() re-simulation and replay */
  program: SymbolProgram[];
}

/* -------------------------- Mathematical Equations ------------------------ */

export interface EquationQuestion extends BaseQuestion {
  type: 'equations';
  variables: string[]; // ['A','B',...]
  equationsDisplay: string[]; // "3 × C = A" (real × and ÷ glyphs)
  solution: Record<string, number>; // 1..20 each
  askMode: 'choice' | 'entry';
  target?: { variable: string; options: number[]; correct: number };
  explanationSteps: string[];
}

/* ------------------------------ Latin Squares ----------------------------- */

export type LatinLetter = 'A' | 'B' | 'C' | 'D' | 'E';

export interface LatinQuestion extends BaseQuestion {
  type: 'latin';
  grid: (LatinLetter | null)[][]; // 5×5 givens
  question: { row: number; col: number }; // the "?" cell
  solutionLetter: LatinLetter;
  inferenceDepth: number;
  explanationSteps: string[]; // ordered forced deductions
  /** display alphabet — internal logic always runs on A–E ('letters' when absent) */
  alphabet?: 'letters' | 'digits' | 'greek' | 'shapes';
}

export type Question = FigureQuestion | EquationQuestion | LatinQuestion;

/* --------------------------------- Session -------------------------------- */

export type SessionState = 'setup' | 'generating' | 'ready' | 'running' | 'finished' | 'reviewed';
export type SessionMode = 'practice' | 'exam';

export interface RuleTagScore {
  correct: number;
  total: number;
}

export interface SessionScore {
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number; // 0..1
  perDifficulty: Partial<Record<Difficulty, RuleTagScore>>;
  perRuleTag: Record<string, RuleTagScore>;
  totalTimeMs: number;
  avgTimePerQuestionMs: number;
  perQuestionTimeMs: Record<string, number>;
}

export interface Session {
  id: string;
  createdAt: number;
  mode: SessionMode;
  subtest: SubtestType | 'full-core';
  difficulty: Difficulty | 'mixed';
  questionCount: number;
  durationMs: number;
  seed: number;
  /** latin display alphabet the set was configured with (exact retries) */
  latinAlphabet?: string;
  questions: Question[];
  /** answers keyed by question UUID — never by array index (R5) */
  answers: Record<string, unknown>;
  /** accumulated visible-to-committed time per question UUID; part of the
   *  persisted snapshot so refresh-resume keeps timing data */
  answerTimesMs: Record<string, number>;
  flagged: string[];
  state: SessionState;
  startedAt?: number;
  endsAt?: number;
  finishedAt?: number;
  score?: SessionScore;
  generatorSource: 'deterministic' | 'gemini+validated' | 'mixed';
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

/** Answer payloads per type. Figures need two sub-answers (image1 + image2). */
export interface FigureAnswer {
  image1?: 0 | 1 | 2;
  image2?: 0 | 1 | 2;
}
export type EquationChoiceAnswer = number; // chosen option value
export type EquationEntryAnswer = Record<string, number>;
export type LatinAnswer = LatinLetter;
