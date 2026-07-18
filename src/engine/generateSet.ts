import type { Difficulty, Question, SubtestType, ValidationResult } from './types';
import { createPrng, deriveSeed } from './prng';
import { ALPHABET_IDS, type LatinAlphabetChoice } from './latinSquares/alphabets';
import { generateFigureQuestion } from './figureSequences/generator';
import { validateFigureQuestion } from './figureSequences/validate';
import { generateEquationQuestion } from './equations/generator';
import { validateEquationQuestion } from './equations/validate';
import { generateLatinQuestion } from './latinSquares/generator';
import { validateLatinQuestion } from './latinSquares/validate';
import { validateGamQuestion } from './gam/validate';

export interface GenerateSetConfig {
  subtest: SubtestType;
  difficulty: Difficulty | 'mixed';
  count: number;
  seed: number;
  equationAskMode?: 'choice' | 'entry';
  /** latin display alphabet; 'random' varies per question, reproducibly */
  latinAlphabet?: LatinAlphabetChoice;
}

/** mixed sets ramp easy → medium → hard, mirroring a sensible practice curve */
function difficultyFor(cfg: GenerateSetConfig, index: number): Difficulty {
  if (cfg.difficulty !== 'mixed') return cfg.difficulty;
  const third = cfg.count / 3;
  if (index < third) return 'easy';
  if (index < 2 * third) return 'medium';
  return 'hard';
}

export function validateQuestion(q: Question): ValidationResult {
  switch (q.type) {
    case 'figures':
      return validateFigureQuestion(q);
    case 'equations':
      return validateEquationQuestion(q);
    case 'latin':
      return validateLatinQuestion(q);
    case 'gam':
      return validateGamQuestion(q);
  }
}

/** One validated question at a set position — reproducible given (seed, index),
 *  so chunked generation with progress display equals full-set generation. */
export function generateQuestionAt(cfg: GenerateSetConfig, index: number): Question {
  const difficulty = difficultyFor(cfg, index);
  // derived per-question seed → any single question is independently replayable
  const prng = createPrng(deriveSeed(cfg.seed, index));
  let question: Question;
  if (cfg.subtest === 'gam') {
    // GAM sets are passage-based: assembled from the content bank
    // (engine/gam/assemble), never generated question-by-question.
    throw new Error('gam sets are assembled from the passage bank, not generated per question');
  }
  switch (cfg.subtest) {
    case 'figures':
      question = generateFigureQuestion(difficulty, prng);
      break;
    case 'equations':
      question = generateEquationQuestion(difficulty, prng, cfg.equationAskMode ?? 'choice');
      break;
    case 'latin': {
      question = generateLatinQuestion(difficulty, prng);
      // display alphabet from a separate derived stream so the puzzle content
      // itself stays identical across alphabet settings (seed-reproducible)
      const choice = cfg.latinAlphabet ?? 'letters';
      question.alphabet =
        choice === 'random'
          ? ALPHABET_IDS[createPrng(deriveSeed(cfg.seed, index) ^ 0xa1fa).int(0, ALPHABET_IDS.length - 1)]
          : choice;
      break;
    }
  }
  const check = validateQuestion(question);
  if (!check.ok) {
    throw new Error(`generated question failed validation: ${check.reasons.join('; ')}`);
  }
  return question;
}

/** R3/R6: the full set exists and every question passed its validator before
 *  the session can become startable. Pure and reproducible given the seed. */
export function generateSet(cfg: GenerateSetConfig): Question[] {
  return Array.from({ length: cfg.count }, (_, i) => generateQuestionAt(cfg, i));
}
