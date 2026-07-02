import { salvageAiEquationSet, sanitizePlainText } from '../../ai/validateAi';
import { generateEquationQuestion } from '../../engine/equations/generator';
import { validateEquationQuestion } from '../../engine/equations/validate';
import { createPrng } from '../../engine/prng';

describe('sanitizePlainText', () => {
  it('strips HTML and markdown, keeping plain text', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Hello **world** `x`')).toBe('Hello world x');
    expect(sanitizePlainText('# Title\n[link](https://evil.example)')).toBe('Title\nlink');
  });
});

describe('salvageAiEquationSet (G1 validation firewall)', () => {
  const fallback = (index: number) =>
    generateEquationQuestion('medium', createPrng(9000 + index), 'choice');

  it('accepts valid AI systems and stamps them as gemini+validated', () => {
    // simulate a "perfect" AI answer by round-tripping deterministic output
    const good = Array.from({ length: 3 }, (_, i) => {
      const q = generateEquationQuestion('medium', createPrng(100 + i), 'choice');
      return { equations: q.equationsDisplay, solution: q.solution };
    });
    const result = salvageAiEquationSet(good, 3, 'medium', fallback);
    expect(result.questions).toHaveLength(3);
    expect(result.aiAccepted).toBe(3);
    for (const q of result.questions) {
      expect(validateEquationQuestion(q).ok).toBe(true);
    }
  });

  it('replaces malformed and invalid items with deterministic ones — user always gets N valid questions', () => {
    const corrupt = [
      null,
      { equations: ['A ** 2 = 4', 'B = A'], solution: { A: 2, B: 2 } }, // bad grammar
      { equations: ['A + B = 10'], solution: { A: 5, B: 5 } }, // ambiguous
      { equations: ['1 + A = 3', 'B − 1 = A'], solution: { A: 2, B: 3 } }, // valid
      'garbage',
    ];
    const result = salvageAiEquationSet(corrupt, 5, 'medium', fallback);
    expect(result.questions).toHaveLength(5);
    expect(result.aiAccepted).toBe(1);
    for (const q of result.questions) {
      expect(validateEquationQuestion(q).ok).toBe(true);
    }
  });

  it('handles a completely unusable payload by falling back entirely', () => {
    const result = salvageAiEquationSet(undefined, 4, 'easy', (i) =>
      generateEquationQuestion('easy', createPrng(400 + i), 'choice'),
    );
    expect(result.questions).toHaveLength(4);
    expect(result.aiAccepted).toBe(0);
  });
});
