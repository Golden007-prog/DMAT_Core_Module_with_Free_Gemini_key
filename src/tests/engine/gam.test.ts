import { describe, expect, it } from 'vitest';
import type { GamPassage, GamQuestion, GamTopicArea } from '../../engine/types';
import { GAM_TOPIC_AREAS } from '../../engine/types';
import {
  gamContentHash,
  mathDelimitersBalanced,
  validateGamPassage,
  validateGamQuestion,
} from '../../engine/gam/validate';
import {
  assembleGamExam,
  assembleGamSet,
  GAM_EXAM,
} from '../../engine/gam/assemble';
import { isAnswerCorrect } from '../../state/scoring';

/* ------------------------------- fixtures -------------------------------- */

function makeQuestion(passageId: string, n: number, over: Partial<GamQuestion> = {}): GamQuestion {
  return {
    id: `${passageId}-q${n}`,
    type: 'gam',
    passageId,
    difficulty: 'medium',
    seed: 0,
    stem: `In the described model, what happens to the output when input ${n} doubles?`,
    options: [
      `The output doubles as well, following the linear rule (${n})`,
      `The output stays constant regardless of the input (${n})`,
      `The output halves because the relation is inverse (${n})`,
      `The output grows with the square of the input (${n})`,
    ],
    correct: 0,
    explanation:
      'The passage states the relation is linear, so doubling the input doubles the output. A constant output would require zero slope, an inverse relation contradicts the given formula, and quadratic growth would need a squared term.',
    skillTags: ['gam.skill.concept'],
    ruleTags: ['gam.topic.mathematics', 'gam.skill.concept'],
    ...over,
  };
}

const LOREM =
  'The model describes a simple linear relation between an input quantity and an output quantity. ' +
  'When the input rises, the output rises proportionally, because the slope of the relation is constant. ';

function makePassage(
  id: string,
  topicArea: GamTopicArea = 'mathematics',
  questionCount = 6,
  over: Partial<GamPassage> = {},
): GamPassage {
  const passage: GamPassage = {
    id,
    topicArea,
    title: `Linear Models (${id})`,
    difficulty: 'medium',
    estimatedMinutes: 12,
    source: 'seed',
    passageMarkdown: LOREM.repeat(16), // ~448 words
    questions: [],
    ...over,
  };
  passage.questions =
    over.questions ??
    Array.from({ length: questionCount }, (_, i) =>
      makeQuestion(id, i + 1, {
        ruleTags: [`gam.topic.${topicArea}`, 'gam.skill.concept'],
      }),
    );
  return passage;
}

/** 2 passages per area, alternating 6/7 questions — a bank shaped like the
 *  real seed bank. */
function makeBank(): GamPassage[] {
  return GAM_TOPIC_AREAS.flatMap((area, ai) => [
    makePassage(`${area}-one`, area, 6),
    makePassage(`${area}-two`, area, ai % 2 === 0 ? 7 : 6),
  ]);
}

/* ------------------------------- validator ------------------------------- */

describe('validateGamQuestion', () => {
  it('accepts a well-formed question', () => {
    expect(validateGamQuestion(makeQuestion('p', 1)).ok).toBe(true);
  });

  const cases: Array<[string, Partial<GamQuestion>]> = [
    ['wrong option count', { options: ['a', 'b', 'c'] as unknown as GamQuestion['options'] }],
    ['duplicate options', { options: ['Same', 'same', 'Other one', 'Different'] as GamQuestion['options'] }],
    ['empty option', { options: ['One', ' ', 'Three', 'Four'] as GamQuestion['options'] }],
    ['correct out of range', { correct: 4 as unknown as GamQuestion['correct'] }],
    ['empty stem', { stem: '  ' }],
    ['explanation too short', { explanation: 'Because.' }],
    [
      'explanation references option letters',
      { explanation: 'The relation is linear as the passage explains, therefore a) is the right choice here.' },
    ],
    ['missing skillTags', { skillTags: [] }],
    ['non-namespaced skillTags', { skillTags: ['compute'] }],
    ['missing topic ruleTag', { ruleTags: ['gam.skill.concept'] }],
    ['unbalanced math delimiters', { stem: 'What is $x + 1?' }],
    ['id not prefixed with passageId', { id: 'other-q1' }],
    [
      'order-dependent wording without lock',
      {
        options: [
          'Only statement I is true',
          'Only statement II is true',
          'Both statements are true',
          'Neither statement is true',
        ] as GamQuestion['options'],
      },
    ],
  ];
  it.each(cases)('rejects: %s', (_label, over) => {
    expect(validateGamQuestion(makeQuestion('p', 1, over)).ok).toBe(false);
  });

  it('accepts order-dependent wording when lockOptionOrder is set', () => {
    const q = makeQuestion('p', 1, {
      options: [
        'Only statement I is true',
        'Only statement II is true',
        'Both statements are true',
        'Neither statement is true',
      ] as GamQuestion['options'],
      lockOptionOrder: true,
    });
    expect(validateGamQuestion(q).ok).toBe(true);
  });
});

describe('validateGamPassage', () => {
  it('accepts a well-formed passage', () => {
    const res = validateGamPassage(makePassage('good-one'));
    expect(res.reasons).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('rejects a passage that is too short', () => {
    expect(validateGamPassage(makePassage('short-one', 'mathematics', 6, { passageMarkdown: LOREM })).ok).toBe(false);
  });

  it('rejects question counts outside 5–8', () => {
    expect(validateGamPassage(makePassage('few-qs', 'mathematics', 4)).ok).toBe(false);
    expect(validateGamPassage(makePassage('many-qs', 'mathematics', 9)).ok).toBe(false);
  });

  it('rejects unresolved figure placeholders', () => {
    const p = makePassage('fig-miss', 'mathematics', 6);
    p.passageMarkdown += ' See {{fig:not-there}}.';
    const res = validateGamPassage(p);
    expect(res.ok).toBe(false);
    expect(res.reasons.join(' ')).toContain('not-there');
  });

  it('rejects unreferenced figures and figures without alt text', () => {
    const p = makePassage('fig-orphan', 'mathematics', 6, {
      figures: [{ id: 'orphan', svg: '<svg viewBox="0 0 10 10"></svg>', caption: 'A chart', alt: 'chart' }],
    });
    expect(validateGamPassage(p).ok).toBe(false);
    const p2 = makePassage('fig-noalt', 'mathematics', 6, {
      figures: [{ id: 'f1', svg: '<svg viewBox="0 0 10 10"></svg>', caption: 'A chart', alt: ' ' }],
    });
    p2.passageMarkdown += ' As {{fig:f1}} shows.';
    expect(validateGamPassage(p2).ok).toBe(false);
  });

  it('rejects a question tagged with a different passageId', () => {
    const p = makePassage('own-id', 'mathematics', 6);
    p.questions[2] = makeQuestion('foreign-id', 3);
    expect(validateGamPassage(p).ok).toBe(false);
  });

  it('rejects mismatched topic ruleTags', () => {
    const p = makePassage('topic-mismatch', 'economics', 6);
    // fixture builder tags questions with the passage area; force a mismatch
    p.questions[0].ruleTags = ['gam.topic.humanities', 'gam.skill.concept'];
    expect(validateGamPassage(p).ok).toBe(false);
  });
});

describe('mathDelimitersBalanced', () => {
  it('handles escaped dollars and balanced pairs', () => {
    expect(mathDelimitersBalanced('The price is 10\\$ flat')).toBe(true);
    expect(mathDelimitersBalanced('$a+b$ and $c$')).toBe(true);
    expect(mathDelimitersBalanced('$a+b')).toBe(false);
  });
});

describe('gamContentHash', () => {
  it('is invariant to ids, whitespace, and option order-preserving metadata', () => {
    const a = makePassage('hash-a');
    const b = makePassage('hash-b');
    b.passageMarkdown = `  ${b.passageMarkdown.replace(/ {2}/g, ' ')} `;
    expect(gamContentHash(a)).toBe(gamContentHash(b));
  });
  it('changes when semantic content changes', () => {
    const a = makePassage('hash-a');
    const c = makePassage('hash-c');
    c.questions[0].stem = 'A completely different question about the model?';
    expect(gamContentHash(a)).not.toBe(gamContentHash(c));
  });
});

/* -------------------------------- assembly ------------------------------- */

describe('assembleGamSet', () => {
  const bank = makeBank();

  it('is deterministic: same seed, same bank → identical set', () => {
    const a = assembleGamSet({ seed: 12345, passageCount: 4 }, bank);
    const b = assembleGamSet({ seed: 12345, passageCount: 4 }, bank);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('is independent of bank ordering', () => {
    const a = assembleGamSet({ seed: 777, passageCount: 4 }, bank);
    const b = assembleGamSet({ seed: 777, passageCount: 4 }, [...bank].reverse());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('respects the topic filter', () => {
    const set = assembleGamSet({ seed: 9, passageCount: 2, topicAreas: ['economics'] }, bank);
    expect(set.passages.every((p) => p.topicArea === 'economics')).toBe(true);
    expect(set.questions.every((q) => q.ruleTags.includes('gam.topic.economics'))).toBe(true);
  });

  it('spreads passages across distinct areas before repeating any', () => {
    const set = assembleGamSet({ seed: 42, passageCount: 8 }, bank);
    expect(new Set(set.passages.map((p) => p.topicArea)).size).toBe(8);
  });

  it('never serves a partial passage', () => {
    const set = assembleGamSet({ seed: 5, passageCount: 3 }, bank);
    for (const doc of set.passages) {
      const original = bank.find((p) => p.id === doc.id)!;
      const served = set.questions.filter((q) => q.passageId === doc.id);
      expect(served.length).toBe(original.questions.length);
    }
  });

  it('shuffles options per seed and remaps the correct index', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const orders = new Set<string>();
    for (const seed of seeds) {
      const set = assembleGamSet({ seed, passageCount: 1, topicAreas: ['economics'] }, bank);
      for (const q of set.questions) {
        const original = bank
          .flatMap((p) => p.questions)
          .find((o) => o.id === q.id)!;
        // correct still points at the same option TEXT
        expect(q.options[q.correct]).toBe(original.options[original.correct]);
        expect([...q.options].sort()).toEqual([...original.options].sort());
        orders.add(q.options.join('|'));
      }
    }
    expect(orders.size).toBeGreaterThan(1); // at least one seed permuted differently
  });

  it('keeps authored order for lockOptionOrder questions', () => {
    const locked = makePassage('locked-p', 'humanities', 5);
    locked.questions = locked.questions.map((q) => ({ ...q, lockOptionOrder: true }));
    const set = assembleGamSet({ seed: 99, passageCount: 1, topicAreas: ['humanities'] }, [locked]);
    for (const q of set.questions) {
      const original = locked.questions.find((o) => o.id === q.id)!;
      expect(q.options).toEqual(original.options);
      expect(q.correct).toBe(original.correct);
    }
  });

  it('throws when nothing matches the filter', () => {
    expect(() =>
      assembleGamSet({ seed: 1, passageCount: 1, topicAreas: ['economics'], difficulty: 'hard' }, bank),
    ).toThrow();
  });
});

describe('assembleGamExam', () => {
  const bank = makeBank();

  it('draws the blueprint passage count within the question band, across 200 seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const exam = assembleGamExam(seed, bank);
      expect(exam.passages.length).toBe(GAM_EXAM.passageCount);
      expect(exam.questions.length).toBeGreaterThanOrEqual(GAM_EXAM.minQuestions);
      expect(exam.questions.length).toBeLessThanOrEqual(GAM_EXAM.maxQuestions);
      // balanced: no area repeats while others are unused (5 picks, 8 areas)
      expect(new Set(exam.passages.map((p) => p.topicArea)).size).toBe(GAM_EXAM.passageCount);
    }
  });

  it('is deterministic per seed', () => {
    expect(JSON.stringify(assembleGamExam(31, bank))).toBe(JSON.stringify(assembleGamExam(31, bank)));
  });
});

/* -------------------------------- scoring -------------------------------- */

describe('gam scoring', () => {
  it('isAnswerCorrect matches the correct option index only', () => {
    const q = makeQuestion('score-p', 1);
    expect(isAnswerCorrect(q, 0)).toBe(true);
    expect(isAnswerCorrect(q, 1)).toBe(false);
    expect(isAnswerCorrect(q, undefined)).toBe(false);
    expect(isAnswerCorrect(q, null)).toBe(false);
  });
});
