import {
  canonicalizeEquation,
  salvageAiEquationSet,
  sanitizeCoachPlan,
  sanitizeExplanation,
  sanitizePlainText,
  solveDisplayedSystem,
} from '../../ai/validateAi';
import { equationBatchSchema, explainMistakePrompt } from '../../ai/prompts';
import { generateEquationQuestion } from '../../engine/equations/generator';
import { generateLatinQuestion } from '../../engine/latinSquares/generator';
import { parseEquation, validateEquationQuestion } from '../../engine/equations/validate';
import { createPrng } from '../../engine/prng';

describe('sanitizePlainText', () => {
  it('strips HTML and markdown, keeping plain text', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Hello **world** `x`')).toBe('Hello world x');
    expect(sanitizePlainText('# Title\n[link](https://evil.example)')).toBe('Title\nlink');
  });

  // an inequality pair is not a tag: the old /<[^>]*>/ ate everything between the
  // two signs, so the tutor's "A < 5 so B > 12" reached the screen as "A 12"
  it('keeps inequalities — the tutor writes them and nothing in the prompt bans them', () => {
    expect(sanitizePlainText('A < 5 so B > 12')).toBe('A < 5 so B > 12');
    expect(sanitizePlainText('Since 3 × A = B, A < 5 so B > 12')).toBe(
      'Since 3 × A = B, A < 5 so B > 12',
    );
    expect(sanitizePlainText('C > D and D < E')).toBe('C > D and D < E');
  });

  // The half-fix: demanding a letter after "<" rescued the SPACED inequality and
  // left the unspaced one — the common one in an app whose variables ARE A–E.
  // "If x<y then y>x." became "If xx.", and "Because A<B and D>C" became
  // "Because AC": the logical content deleted, silently, and rendered as content.
  // A tag-NAME whitelist does not save it either — b, i, s, a and p are all real
  // tag names, so "<B and D>" matches "<b …>" on the nose.
  it('keeps an UNSPACED inequality — the app\'s own variables are A–E', () => {
    expect(sanitizePlainText('If x<y then y>x.')).toBe('If x<y then y>x.');
    expect(sanitizePlainText('Because A<B and D>C, the order is fixed.')).toBe(
      'Because A<B and D>C, the order is fixed.',
    );
    expect(sanitizePlainText('Since A<B and B<C, A is the smallest.')).toBe(
      'Since A<B and B<C, A is the smallest.',
    );
    expect(sanitizePlainText('3<4 and 12>5')).toBe('3<4 and 12>5');
  });

  it('still strips real tags, closing tags and event-handler payloads', () => {
    expect(sanitizePlainText('<img src=x onerror=alert(1)>caught')).toBe('caught');
    expect(sanitizePlainText('<div class="a">text</div>')).toBe('text');
    expect(sanitizePlainText('<IMG SRC=x ONERROR=y>up')).toBe('up');
    expect(sanitizePlainText('<img src = x onerror = y>spaced')).toBe('spaced');
    expect(sanitizePlainText('<br/>break<hr />rule')).toBe('breakrule');
    expect(sanitizePlainText('<iframe src=//evil.example></iframe>gone')).toBe('gone');
    // a tag sitting next to an inequality: the tag goes, the inequality stays
    expect(sanitizePlainText('<b>A</b> < 5')).toBe('A < 5');
    expect(sanitizePlainText('<b>A<B</b> is true')).toBe('A<B is true');
  });
});

describe('sanitizeExplanation (G2 firewall)', () => {
  const good = {
    diagnosis: 'You **read** the bounce as a wrap-around.',
    steps: [
      { title: 'Track the triangle', detail: '<b>It</b> moves down 2 cells.' },
      { title: 'Bounce at row 4', detail: 'It reflects instead of reappearing at the top.' },
    ],
    keyInsight: 'Bounce reverses direction; it never wraps.',
    tactic: 'Mark the wall cell before predicting the next step.',
  };

  it('sanitizes every string field it returns', () => {
    const result = sanitizeExplanation(good);
    expect(result).not.toBeNull();
    expect(result!.diagnosis).toBe('You read the bounce as a wrap-around.');
    expect(result!.steps[0].detail).toBe('It moves down 2 cells.');
  });

  it('drops malformed steps and rejects a chain too short to teach anything', () => {
    expect(sanitizeExplanation({ ...good, steps: [good.steps[0], null, { title: 'x' }] })).toBeNull();
    expect(sanitizeExplanation({ ...good, diagnosis: '' })).toBeNull();
    expect(sanitizeExplanation({ ...good, tactic: 42 })).toBeNull();
    expect(sanitizeExplanation('AI unavailable')).toBeNull();
    expect(sanitizeExplanation(null)).toBeNull();
  });

  it('truncates a runaway step list rather than rejecting it', () => {
    const many = { ...good, steps: Array.from({ length: 12 }, () => good.steps[0]) };
    expect(sanitizeExplanation(many)!.steps).toHaveLength(6);
  });
});

describe('sanitizeExplanation — the latin glyph firewall', () => {
  const shapes = { ...generateLatinQuestion('hard', createPrng(909)), alphabet: 'shapes' as const };

  const explain = (over: Record<string, unknown>) => ({
    diagnosis: 'You read the row constraint and ignored the column.',
    steps: [
      { title: 'Scan column 2', detail: 'Column 2 already holds ▲ and ■.' },
      { title: 'Force the cell', detail: 'Only ● can sit at r4c2.' },
    ],
    keyInsight: 'Rows and columns constrain the cell together.',
    tactic: 'Count the givens per column first.',
    ...over,
  });

  // The exact defect the real API produced on 2026-07-11: the model named every
  // symbol with the right glyph and then opened a sentence with the English
  // article. Two rounds of prompt wording failed to stop it, because "A" there is
  // an ordinary English word, not a symbol slip — so the firewall settles it.
  it('deletes the English article "A" opening a sentence, and recapitalises behind it', () => {
    const out = sanitizeExplanation(
      explain({
        keyInsight:
          'Latin squares need both constraints. A symbol placement is only valid if it satisfies both.',
      }),
      shapes,
    )!;
    expect(out.keyInsight).toBe(
      'Latin squares need both constraints. Symbol placement is only valid if it satisfies both.',
    );
    expect(out.keyInsight).not.toMatch(/\b[A-E]\b/);
  });

  it('maps a leaked internal letter to the glyph the learner actually sees', () => {
    const out = sanitizeExplanation(
      explain({
        diagnosis: 'You put B at r4c2, but B already sits in row 4.',
        keyInsight: 'The answer is A.',
        tactic: 'Check whether A is already in the row.',
      }),
      shapes,
    )!;
    expect(out.diagnosis).toBe('You put ▲ at r4c2, but ▲ already sits in row 4.');
    // not followed by a lower-case word, so it cannot be an article
    expect(out.keyInsight).toBe('The answer is ●.');
    // "A is" — no article can precede a verb, so this A is the symbol, not a word
    expect(out.tactic).toBe('Check whether ● is already in the row.');
  });

  it('leaves A–E alone on the letters alphabet and on the other subtests', () => {
    const letters = { ...shapes, alphabet: 'letters' as const };
    const insight = 'A symbol placement is only valid if B is not already there.';
    expect(sanitizeExplanation(explain({ keyInsight: insight }), letters)!.keyInsight).toBe(insight);

    // equations legitimately print A–E — they are the variable names on screen
    const equations = generateEquationQuestion('hard', createPrng(31), 'choice');
    const step = 'Substitute B = 19 into eq. 1 to get D = 16.';
    expect(sanitizeExplanation(explain({ keyInsight: step }), equations)!.keyInsight).toBe(step);
    // and with no question at all the pass is a no-op
    expect(sanitizeExplanation(explain({ keyInsight: step }))!.keyInsight).toBe(step);
  });
});

describe('sanitizeCoachPlan (G3 firewall)', () => {
  const good = {
    headline: 'Latin squares cost you the most marks.',
    leveragePoints: [{ title: 'Chain depth', why: 'You stop after one deduction.', evidence: '48% on lat.chain4plus' }],
    drills: [{ tag: 'lat.chain4plus', drill: 'Ten hard latin tasks, writing the chain out.', minutes: 999 }],
    pacing: 'You leave 15% blank in exam mode — always guess.',
  };

  it('clamps drill minutes to a realistic sitting', () => {
    expect(sanitizeCoachPlan(good)!.drills[0].minutes).toBe(60);
    expect(sanitizeCoachPlan({ ...good, drills: [{ ...good.drills[0], minutes: 'ten' }] })!.drills[0].minutes).toBe(10);
  });

  it('rejects a plan missing any renderable section', () => {
    expect(sanitizeCoachPlan({ ...good, drills: [] })).toBeNull();
    expect(sanitizeCoachPlan({ ...good, leveragePoints: [{ title: 'x' }] })).toBeNull();
    expect(sanitizeCoachPlan({ ...good, pacing: '' })).toBeNull();
    expect(sanitizeCoachPlan('a plan')).toBeNull();
  });
});

describe('explainMistakePrompt', () => {
  it('speaks the latin question in the alphabet the learner sees, never A–E', () => {
    const base = generateLatinQuestion('hard', createPrng(77));
    const question = { ...base, alphabet: 'shapes' as const };
    const prompt = explainMistakePrompt(question, 'C');

    // internal letters leak the wrong symbol set into the tutor's mouth (§ latin alphabets)
    expect(prompt).not.toMatch(/\b[A-E]\b/);
    for (const glyph of ['●', '▲', '■', '★', '✚']) expect(prompt).toContain(glyph);
    // the deterministic chain is handed over as ground truth, glyph-mapped
    expect(prompt).toContain('Verified forced chain');
    expect(prompt).toContain(`Inference depth: ${question.inferenceDepth}`);
  });

  it('names the equation slip when the pick equals another variable', () => {
    // first seed whose solution has a distinct decoy value to pick
    let question = generateEquationQuestion('hard', createPrng(31), 'choice');
    let other: string | undefined;
    for (let seed = 31; !other && seed < 80; seed++) {
      question = generateEquationQuestion('hard', createPrng(seed), 'choice');
      const asked = question.target!.variable;
      other = question.variables.find(
        (v) => v !== asked && question.solution[v] !== question.solution[asked],
      );
    }
    const prompt = explainMistakePrompt(question, question.solution[other!]);

    expect(prompt).toContain(`it is the value of ${other}, not of ${question.target!.variable}`);
    for (const line of question.equationsDisplay) expect(prompt).toContain(line);
  });
});

describe('canonicalizeEquation', () => {
  // Each of these is a DIFFERENT SPELLING of a legal term, not a different term.
  // The model reaches for all of them, and the grammar in engine/equations accepts
  // exactly one — so rewriting is the whole difference between a usable system and
  // a discarded one.
  it('commutes "var × int" into the house order', () => {
    expect(canonicalizeEquation('B × 2 = A')).toBe('2 × B = A');
    expect(canonicalizeEquation('3 × A = B')).toBe('3 × A = B'); // already canonical
  });

  it('maps ASCII and typographic operators onto the house glyphs', () => {
    expect(canonicalizeEquation('B * 2 = A')).toBe('2 × B = A');
    expect(canonicalizeEquation('2 x A = B')).toBe('2 × A = B');
    expect(canonicalizeEquation('A / 2 = B')).toBe('A ÷ 2 = B');
  });

  it('expands an implicit product, including a multi-digit coefficient', () => {
    expect(canonicalizeEquation('2A + 3B = 20')).toBe('2 × A + 3 × B = 20');
    expect(canonicalizeEquation('12B = C')).toBe('12 × B = C');
  });

  it('normalises every dash to the minus glyph — the en dash is a HARD reject upstream', () => {
    // parseEquation tolerates the ASCII hyphen but not U+2013, which it reads as
    // part of the next token and throws on as an illegal term
    expect(canonicalizeEquation('A – B = 2')).toBe('A − B = 2');
    expect(canonicalizeEquation('A - B = 2')).toBe('A − B = 2');
  });

  it('normalises spacing and drops a trailing full stop', () => {
    expect(canonicalizeEquation('A+B=10')).toBe('A + B = 10');
    expect(canonicalizeEquation('  A + B = 10.  ')).toBe('A + B = 10');
  });

  it('leaves a negative constant tight against its number, so the parser still reads it', () => {
    expect(canonicalizeEquation('A − B = −1')).toBe('A − B = −1');
    expect(parseEquation(canonicalizeEquation('A − B = −1')).constant).toBe(-1);
  });

  it('NEVER repairs the maths — an illegal term stays illegal', () => {
    // "int ÷ var" is not commutative and is not in the grammar. Rewriting it to
    // "var ÷ int" would silently change the question, so it must survive untouched
    // and be rejected downstream.
    expect(canonicalizeEquation('2 ÷ A = B')).toBe('2 ÷ A = B');
    expect(() => parseEquation(canonicalizeEquation('2 ÷ A = B'))).toThrow();
  });
});

describe('solveDisplayedSystem', () => {
  it('returns the unique integer solution in 1..20', () => {
    expect(solveDisplayedSystem(['3 × A = B', 'B ÷ 3 = A', 'A + B = 8'], ['A', 'B'])).toEqual({
      A: 2,
      B: 6,
    });
  });

  it('returns null when the system is unsolvable, ambiguous or ungrammatical', () => {
    expect(solveDisplayedSystem(['A + B = 10', 'A + B = 11'], ['A', 'B'])).toBeNull(); // none
    expect(solveDisplayedSystem(['A + B = 10'], ['A', 'B'])).toBeNull(); // many
    expect(solveDisplayedSystem(['A ** B = 3', 'A = 1'], ['A', 'B'])).toBeNull(); // ungrammatical
    expect(solveDisplayedSystem(['A + B = 60', 'A − B = 20'], ['A', 'B'])).toBeNull(); // out of 1..20
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

  it('reads the construct-from-solution "lines" shape, keeping only the equation', () => {
    const q = generateEquationQuestion('medium', createPrng(101), 'choice');
    const payload = [
      {
        solution: q.solution,
        // the working fields are scaffolding that made the model compute before it
        // committed; they carry no meaning once the line exists
        lines: q.equationsDisplay.map((equation) => ({
          left: 'ignored',
          leftSub: 'ignored',
          leftValue: 0,
          right: 'ignored',
          rightValue: 0,
          equation,
        })),
      },
    ];
    const result = salvageAiEquationSet(payload, 1, 'medium', fallback);
    expect(result.aiAccepted).toBe(1);
    expect(result.questions[0].equationsDisplay).toEqual(q.equationsDisplay);
  });

  it('SALVAGES a correct system whose answer key the model got wrong', () => {
    // The single biggest reject class measured against the real API: the equations
    // are sound, the model just cannot solve them. We can, so the question lives.
    const payload = [
      {
        equations: ['3 × A = B', 'C + 2 = B', '2 × A + C = 13'],
        solution: { A: 9, B: 9, C: 9 }, // nonsense — the system forces A=3, B=9, C=7
      },
    ];
    const result = salvageAiEquationSet(payload, 1, 'medium', fallback);
    expect(result.aiAccepted).toBe(1);
    expect(result.questions[0].solution).toEqual({ A: 3, B: 9, C: 7 });
    // and the answer key the learner is scored against is the SOLVED one
    const t = result.questions[0].target!;
    expect(t.options[t.correct]).toBe(result.questions[0].solution[t.variable]);
    expect(validateEquationQuestion(result.questions[0]).ok).toBe(true);
  });

  it('rejects a system built on the wrong number of variables for the band', () => {
    // a 2-variable system is a perfectly valid question — just not a MEDIUM one,
    // and validateEquationQuestion cannot know which band it was asked for
    const twoVar = [{ equations: ['1 + A = 3', 'B − 1 = A'], solution: { A: 2, B: 1 } }];
    expect(salvageAiEquationSet(twoVar, 1, 'medium', fallback).aiAccepted).toBe(0);
    expect(salvageAiEquationSet(twoVar, 1, 'easy', fallback).aiAccepted).toBe(1);
  });

  it('never lets the same system into the set twice', () => {
    const q = generateEquationQuestion('medium', createPrng(102), 'choice');
    const item = { equations: q.equationsDisplay, solution: q.solution };
    const result = salvageAiEquationSet([item, item, item], 3, 'medium', fallback);
    expect(result.aiAccepted).toBe(1);
    expect(result.rejects.filter((r) => r.includes('duplicate'))).toHaveLength(2);
    expect(result.questions).toHaveLength(3); // the other two are deterministic
  });

  it('replaces malformed and invalid items with deterministic ones — user always gets N valid questions', () => {
    const corrupt = [
      null,
      { equations: ['A ** 2 = 4', 'B = A'], solution: { A: 2, B: 2 } }, // bad grammar
      { equations: ['A + B = 10'], solution: { A: 5, B: 5 } }, // ambiguous
      { equations: ['1 + A = 3', 'B − 1 = A'], solution: { A: 2, B: 1 } }, // valid, 2 vars
      'garbage',
    ];
    const result = salvageAiEquationSet(corrupt, 5, 'easy', (i) =>
      generateEquationQuestion('easy', createPrng(400 + i), 'choice'),
    );
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

describe('equationBatchSchema', () => {
  it('offers a band only the variables and the line count it is allowed to use', () => {
    // one shared schema declaring A–D on every band was measured returning 20/20
    // easy systems built on THREE variables: the prompt said two, the schema said
    // four, and the schema won
    const easy = equationBatchSchema('easy') as any;
    const solution = easy.items.properties.solution;
    expect(Object.keys(solution.properties)).toEqual(['A', 'B']);
    expect(solution.required).toEqual(['A', 'B']);
    expect(easy.items.properties.lines.minItems).toBe(2);
    expect(easy.items.properties.lines.maxItems).toBe(2);

    const hard = equationBatchSchema('hard') as any;
    expect(Object.keys(hard.items.properties.solution.properties)).toEqual(['A', 'B', 'C', 'D']);
    expect(hard.items.properties.lines.maxItems).toBe(4);
  });

  it('orders the keys so the model must work the arithmetic out before it commits', () => {
    // thinkingBudget is 0 on every equation call: the emitted tokens are the ONLY
    // scratch space there is, so this ordering IS the algorithm
    const medium = equationBatchSchema('medium') as any;
    expect(medium.items.propertyOrdering).toEqual(['solution', 'lines']);
    expect(medium.items.properties.lines.items.propertyOrdering).toEqual([
      'left',
      'leftSub',
      'leftValue',
      'right',
      'rightValue',
      'equation',
    ]);
  });
});
