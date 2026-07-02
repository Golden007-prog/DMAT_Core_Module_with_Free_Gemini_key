import type { Difficulty, Question, SubtestType, ValidationResult } from './types';
import { createPrng, deriveSeed } from './prng';
import { generateFigureQuestion } from './figureSequences/generator';
import { validateFigureQuestion } from './figureSequences/validate';
import { generateEquationQuestion } from './equations/generator';
import { validateEquationQuestion } from './equations/validate';
import { generateLatinQuestion } from './latinSquares/generator';
import { validateLatinQuestion } from './latinSquares/validate';

export interface GenerateSetConfig {
  subtest: SubtestType;
  difficulty: Difficulty | 'mixed';
  count: number;
  seed: number;
  equationAskMode?: 'choice' | 'entry';
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
  }
}

/** R3/R6: the full set exists and every question passed its validator before
 *  the session can become startable. Pure and reproducible given the seed. */
export function generateSet(cfg: GenerateSetConfig): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const difficulty = difficultyFor(cfg, i);
    // derived per-question seed → any single question is independently replayable
    const prng = createPrng(deriveSeed(cfg.seed, i));
    let question: Question;
    switch (cfg.subtest) {
      case 'figures':
        question = generateFigureQuestion(difficulty, prng);
        break;
      case 'equations':
        question = generateEquationQuestion(difficulty, prng, cfg.equationAskMode ?? 'choice');
        break;
      case 'latin':
        question = generateLatinQuestion(difficulty, prng);
        break;
    }
    const check = validateQuestion(question);
    if (!check.ok) {
      throw new Error(`generated question failed validation: ${check.reasons.join('; ')}`);
    }
    questions.push(question);
  }
  return questions;
}
