import { isAnswerCorrect } from '../../state/scoring';
import { createPrng } from '../../engine/prng';
import { generateFigureQuestion } from '../../engine/figureSequences/generator';
import { generateEquationQuestion } from '../../engine/equations/generator';
import { generateLatinQuestion } from '../../engine/latinSquares/generator';

describe('isAnswerCorrect', () => {
  it('figures: correct only when BOTH images are answered correctly', () => {
    const q = generateFigureQuestion('easy', createPrng(1));
    expect(isAnswerCorrect(q, { image1: q.image1.correct, image2: q.image2.correct })).toBe(true);
    expect(
      isAnswerCorrect(q, {
        image1: q.image1.correct,
        image2: ((q.image2.correct + 1) % 3) as 0 | 1 | 2,
      }),
    ).toBe(false);
    expect(isAnswerCorrect(q, { image1: q.image1.correct })).toBe(false);
    expect(isAnswerCorrect(q, undefined)).toBe(false);
  });

  it('equations choice: compares the chosen numeric value', () => {
    const q = generateEquationQuestion('medium', createPrng(2), 'choice');
    const correctValue = q.solution[q.target!.variable];
    expect(isAnswerCorrect(q, correctValue)).toBe(true);
    expect(isAnswerCorrect(q, correctValue + 1)).toBe(false);
    expect(isAnswerCorrect(q, undefined)).toBe(false);
  });

  it('equations entry: all variables must match', () => {
    const q = generateEquationQuestion('easy', createPrng(3), 'entry');
    expect(isAnswerCorrect(q, { ...q.solution })).toBe(true);
    const off = { ...q.solution };
    const firstVar = q.variables[0];
    off[firstVar] = off[firstVar] === 20 ? 1 : off[firstVar] + 1;
    expect(isAnswerCorrect(q, off)).toBe(false);
    expect(isAnswerCorrect(q, {})).toBe(false);
  });

  it('latin: compares the chosen letter', () => {
    const q = generateLatinQuestion('easy', createPrng(4));
    expect(isAnswerCorrect(q, q.solutionLetter)).toBe(true);
    const wrong = (['A', 'B', 'C', 'D', 'E'] as const).find((l) => l !== q.solutionLetter)!;
    expect(isAnswerCorrect(q, wrong)).toBe(false);
  });
});
