import { salvageGamPassage } from '../../ai/validateAi';
import { validateGamPassage } from '../../engine/gam/validate';
import type { GamPassage } from '../../engine/types';

/** ~290 words of ORIGINAL plain prose (no $math$, so delimiter balance is
 *  trivially satisfied), well inside the validator's 220–750 band. */
const PASSAGE = `A feedback loop is a process in which the output of a system is measured and used to adjust that same system's input. Engineers distinguish two broad kinds. In a **negative feedback** loop, the system responds to a change by opposing it, which tends to hold some quantity near a target value. In a **positive feedback** loop, the system responds to a change by reinforcing it, which tends to push the quantity further away from where it started.

A household thermostat is the classic example of negative feedback. The thermostat continuously compares the measured room temperature with a **set point** chosen by the occupant. When the room grows colder than the set point, the controller switches the heater on; when the room grows warmer than the set point, it switches the heater off. Because the correction always opposes the direction of the error, the temperature settles into a narrow band around the set point rather than drifting freely.

The width of that band depends on how quickly the controller reacts and how much heat the room stores. A sluggish controller lets the temperature overshoot the set point before it responds, which widens the band. A room with large **thermal mass** changes temperature slowly, which narrows the swings but lengthens the time needed to reach the set point.

Positive feedback behaves very differently. A microphone placed too close to its own loudspeaker produces a rising screech, because each sound is amplified, replayed, and captured again. Left unchecked, positive feedback drives a system toward an extreme, so designers deliberately use it only when a fast, decisive switch between two states is wanted.`;

/** A fresh, fully valid model payload each call — nested literals are rebuilt so
 *  a mutation in one rejection case cannot bleed into the next. `id` is
 *  deliberately not kebab-case, to exercise the id repair. */
function payload(): Record<string, unknown> {
  return {
    id: 'Feedback Loops 101!',
    title: 'Feedback Loops and Control',
    passageMarkdown: PASSAGE,
    estimatedMinutes: 12,
    questions: [
      {
        stem: 'According to the passage, what characterises a negative feedback loop?',
        options: [
          'The system responds to a change by opposing it, holding a quantity near a target value',
          'The system responds to a change by reinforcing it, pushing a quantity further from its start',
          'The system measures its output but never feeds that measurement back into its input',
          'The system holds its input fixed regardless of what happens to its output',
        ],
        correctIndex: 0,
        explanation:
          'The passage defines negative feedback as a response that opposes a change, keeping a quantity near its target; a response that reinforces the change describes positive feedback, and the remaining choices sever the link between output and input that a feedback loop requires.',
        skill: 'concept',
        difficulty: 'easy',
      },
      {
        stem: 'Why does a thermostat hold the room temperature within a narrow band around the set point?',
        options: [
          'Each correction opposes the direction of the current error, pushing the temperature back toward the set point',
          'The heater runs continuously so the temperature can never drift away from the set point',
          'The controller reinforces any temperature change, which locks the room at a single value',
          'The room stores no heat, so its temperature instantly matches the set point at all times',
        ],
        correctIndex: 0,
        explanation:
          'The controller switches the heater on when the room is too cold and off when it is too warm, so every correction acts against the error and returns the temperature to the set point, settling it into a narrow band rather than letting it drift.',
        skill: 'concept',
        difficulty: 'medium',
      },
      {
        stem: 'A workshop has a very large thermal mass. Based on the passage, how will its temperature behave under thermostatic control?',
        options: [
          'It will swing rapidly above and below the set point',
          'It will change slowly, narrowing the swings but taking longer to reach the set point',
          'It cannot be regulated at all, because large rooms defeat a thermostat',
          'It will overshoot the set point far more severely than a small room would',
        ],
        correctIndex: 1,
        explanation:
          'The passage states that a large thermal mass makes temperature change slowly, which narrows the swings around the set point while lengthening the time needed to reach it; rapid swings and severe overshoot describe a low-mass room, and thermal mass does not prevent regulation.',
        skill: 'transfer',
        difficulty: 'medium',
      },
      {
        stem: 'A public-address microphone is moved close to its own loudspeaker and a rising screech develops. Which description from the passage fits this situation?',
        options: [
          'Negative feedback, because the sound is being measured and corrected',
          'A system with large thermal mass responding slowly to change',
          'Positive feedback, because each sound is amplified, replayed, and captured again, driving the level toward an extreme',
          'An absence of feedback, because the microphone and loudspeaker are separate devices',
        ],
        correctIndex: 2,
        explanation:
          'The screech grows because the amplified sound is replayed and picked up again, reinforcing itself — the passage\'s definition of positive feedback driving a system toward an extreme; naming it negative feedback reverses the effect, thermal mass is unrelated, and the loop clearly does feed back through the room.',
        skill: 'transfer',
        difficulty: 'hard',
      },
      {
        stem: 'According to the passage, what causes the temperature to overshoot the set point before the controller reacts?',
        options: [
          'A sluggish controller that reacts slowly to the error',
          'A controller that reacts too quickly to small errors',
          'A room that stores no heat whatsoever',
          'A set point chosen far above the current room temperature',
        ],
        correctIndex: 0,
        explanation:
          'The passage attributes overshoot to a sluggish controller that lets the temperature pass the set point before responding, which widens the band; a fast controller reduces overshoot, and neither the thermal mass nor the chosen set point is named as the cause of the delay.',
        skill: 'concept',
        difficulty: 'medium',
      },
    ],
  };
}

describe('salvageGamPassage — the accept path', () => {
  it('turns a valid payload into a passage that passes the full validator, with forced metadata', () => {
    const result = salvageGamPassage(payload(), 'engineering', 'medium', []);
    expect(result).not.toBeNull();
    const p = result as GamPassage;

    // the same validator the seed bank must pass
    expect(validateGamPassage(p).reasons).toEqual([]);

    // topicArea and difficulty are stamped from the request, never the model
    expect(p.topicArea).toBe('engineering');
    expect(p.difficulty).toBe('medium');
    expect(p.source).toBe('ai+validated');

    // id repaired to kebab-case; question ids prefixed by it
    expect(p.id).toBe('feedback-loops-101');
    expect(p.questions).toHaveLength(5);
    expect(p.questions[0].id).toBe('feedback-loops-101-q1');
    expect(p.questions[0].passageId).toBe('feedback-loops-101');

    // tags derived from the (forced) topic and the (trusted) per-question skill
    expect(p.questions[0].ruleTags).toEqual(['gam.topic.engineering', 'gam.skill.concept']);
    expect(p.questions[0].skillTags).toEqual(['gam.skill.concept']);
    expect(p.questions[3].ruleTags).toEqual(['gam.topic.engineering', 'gam.skill.transfer']);

    // per-question difficulty is read from the payload, not flattened to 'medium'
    expect(p.questions[0].difficulty).toBe('easy');
    expect(p.questions[3].difficulty).toBe('hard');
  });

  it('strips a surviving {{fig:…}} placeholder rather than rejecting the question', () => {
    const bad = payload();
    (bad.questions as Record<string, unknown>[])[0].stem =
      'In {{fig:loop-diagram}} the controller compares the measured value with the set point. What does a negative feedback loop do?';
    const result = salvageGamPassage(bad, 'engineering', 'medium', []);
    expect(result).not.toBeNull();
    const stem = (result as GamPassage).questions[0].stem;
    expect(stem).not.toContain('{{fig');
    expect(stem).not.toContain('fig:');
  });
});

describe('salvageGamPassage — rejections (R7: fall back to the bank)', () => {
  const reject = (mutate: (p: Record<string, unknown>) => void) => {
    const p = payload();
    mutate(p);
    expect(salvageGamPassage(p, 'engineering', 'medium', [])).toBeNull();
  };

  it('rejects a passage with too few questions', () => {
    reject((p) => {
      p.questions = (p.questions as unknown[]).slice(0, 4);
    });
  });

  it('rejects a question that does not have exactly 4 options', () => {
    reject((p) => {
      (p.questions as Record<string, unknown>[])[0].options = ['one', 'two', 'three'];
    });
  });

  it('rejects duplicate options', () => {
    reject((p) => {
      (p.questions as Record<string, unknown>[])[0].options = [
        'the same answer',
        'the same answer',
        'a different answer',
        'another distinct answer',
      ];
    });
  });

  it('rejects a correctIndex outside 0–3', () => {
    reject((p) => {
      (p.questions as Record<string, unknown>[])[0].correctIndex = 5;
    });
  });

  it('rejects an explanation that references an option letter', () => {
    reject((p) => {
      (p.questions as Record<string, unknown>[])[0].explanation =
        'The correct choice is a) because the passage says so, and the rest are simply wrong.';
    });
  });

  it('rejects a payload that is not an object', () => {
    expect(salvageGamPassage('not an object', 'engineering', 'medium', [])).toBeNull();
  });

  it('rejects a payload whose questions is not an array', () => {
    reject((p) => {
      p.questions = 'nope';
    });
  });

  it('rejects a passage that copies a seed passage (≥3 shared 8-grams)', () => {
    const seedBank = [{ title: 'A Totally Different Title', passageMarkdown: PASSAGE }];
    expect(salvageGamPassage(payload(), 'engineering', 'medium', seedBank)).toBeNull();
  });

  it('rejects a passage whose title matches a seed title, case-insensitively', () => {
    const seedBank = [
      { title: 'feedback LOOPS and control', passageMarkdown: 'Entirely unrelated seed prose.' },
    ];
    expect(salvageGamPassage(payload(), 'engineering', 'medium', seedBank)).toBeNull();
  });
});
