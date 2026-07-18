import { describe, expect, it } from 'vitest';
import { createSessionStore } from '../../state/sessionStore';
import { createTimer } from '../../state/timer';
import { MemoryStorage } from '../../storage/db';
import { fakeClock } from '../helpers/fakeClock';
import { retryExactSet, retryMistakes } from '../../state/retry';
import { GAM_EXAM, GAM_MS_PER_QUESTION } from '../../engine/gam/assemble';
import type { GamPassage, GamQuestion, GamTopicArea, Session } from '../../engine/types';
import { GAM_TOPIC_AREAS } from '../../engine/types';

/* --------------------------- synthetic bank ------------------------------ */

const PROSE =
  'The model links an input quantity to an output quantity through a fixed linear rule with constant slope. ' +
  'Doubling the input therefore doubles the output, while the intercept stays unchanged in every case considered here. ';

function makeQuestion(passageId: string, n: number, area: GamTopicArea): GamQuestion {
  return {
    id: `${passageId}-q${n}`,
    type: 'gam',
    passageId,
    difficulty: n % 3 === 0 ? 'hard' : n % 2 === 0 ? 'medium' : 'easy',
    seed: 0,
    stem: `In the described model, what happens to output ${n} when its input doubles?`,
    options: [
      `Output ${n} doubles, following the linear rule`,
      `Output ${n} is unchanged whatever the input does`,
      `Output ${n} halves because the relation inverts`,
      `Output ${n} quadruples with the squared input`,
    ],
    correct: 0,
    explanation:
      'The passage fixes a linear relation with constant slope, so doubling the input doubles the output. An unchanged output would need zero slope, and the inverse or squared behaviours contradict the stated rule.',
    skillTags: ['gam.skill.concept'],
    ruleTags: [`gam.topic.${area}`, 'gam.skill.concept'],
  };
}

function makePassage(id: string, area: GamTopicArea, questionCount: number): GamPassage {
  return {
    id,
    topicArea: area,
    title: `Linear Models (${id})`,
    difficulty: 'medium',
    estimatedMinutes: 12,
    source: 'seed',
    passageMarkdown: PROSE.repeat(14),
    questions: Array.from({ length: questionCount }, (_, i) => makeQuestion(id, i + 1, area)),
  };
}

const TEST_BANK: GamPassage[] = GAM_TOPIC_AREAS.flatMap((area, i) => [
  makePassage(`${area}-alpha`, area, 6),
  makePassage(`${area}-beta`, area, i % 2 === 0 ? 7 : 6),
]);

function makeStore() {
  const { clock, advance } = fakeClock();
  const store = createSessionStore({
    timer: createTimer(clock),
    storage: async () => new MemoryStorage(),
    now: () => clock.wallNow(),
    newSeed: (() => {
      let n = 900;
      return () => n++;
    })(),
    loadGamBank: async () => TEST_BANK,
  });
  return { store, advance };
}

/* --------------------------------- tests --------------------------------- */

describe('gam practice sessions', () => {
  it('assembles a topic drill: whole passages, passage docs attached, gam pacing', async () => {
    const { store } = makeStore();
    await store.getState().startNewSession({
      mode: 'practice',
      subtest: 'gam',
      difficulty: 'mixed',
      questionCount: 0, // derived from assembly
      seed: 0,
      gamTopicAreas: ['economics'],
      gamPassageCount: 2,
    });
    const s = store.getState().session!;
    expect(s.state).toBe('ready');
    expect(s.subtest).toBe('gam');
    expect(s.gamPassages).toHaveLength(2);
    expect(s.gamPassages!.every((p) => p.topicArea === 'economics')).toBe(true);
    expect(s.questions.length).toBeGreaterThanOrEqual(12);
    expect(s.questionCount).toBe(s.questions.length);
    expect(s.durationMs).toBe(s.questions.length * GAM_MS_PER_QUESTION);
    // every question belongs to an attached passage
    const ids = new Set(s.gamPassages!.map((p) => p.id));
    expect(s.questions.every((q) => q.type === 'gam' && ids.has(q.passageId))).toBe(true);
  });

  it('runs the full lifecycle: start → answer → submit → gam tags in the score', async () => {
    const { store } = makeStore();
    await store.getState().startNewSession({
      mode: 'practice',
      subtest: 'gam',
      difficulty: 'mixed',
      questionCount: 0,
      seed: 0,
      gamTopicAreas: ['mathematics'],
      gamPassageCount: 1,
    });
    store.getState().start();
    const s = store.getState().session!;
    expect(s.state).toBe('running');
    const q0 = s.questions[0] as GamQuestion;
    const q1 = s.questions[1] as GamQuestion;
    store.getState().answer(q0.id, q0.correct); // right
    store.getState().answer(q1.id, ((q1.correct + 1) % 4) as 0 | 1 | 2 | 3); // wrong
    await store.getState().submit();
    const done = store.getState().session!;
    expect(done.state).toBe('finished');
    expect(done.score!.correct).toBe(1);
    expect(done.score!.perRuleTag['gam.topic.mathematics'].total).toBe(done.questions.length);
    expect(done.score!.perRuleTag['gam.skill.concept'].correct).toBe(1);
  });
});

describe('gam exam blueprint', () => {
  it('a plain gam exam uses the 90:00 blueprint draw', async () => {
    const { store } = makeStore();
    await store.getState().startNewSession({
      mode: 'exam',
      subtest: 'gam',
      difficulty: 'mixed',
      questionCount: 0,
      seed: 0,
    });
    const s = store.getState().session!;
    expect(s.state).toBe('ready');
    expect(s.durationMs).toBe(GAM_EXAM.durationMs);
    expect(s.gamPassages).toHaveLength(GAM_EXAM.passageCount);
    expect(s.questions.length).toBeGreaterThanOrEqual(GAM_EXAM.minQuestions);
    expect(s.questions.length).toBeLessThanOrEqual(GAM_EXAM.maxQuestions);
    // balanced: five distinct areas
    expect(new Set(s.gamPassages!.map((p) => p.topicArea)).size).toBe(GAM_EXAM.passageCount);
  });
});

describe('gam retries', () => {
  async function finishedGamSession(store: ReturnType<typeof makeStore>['store']): Promise<Session> {
    await store.getState().startNewSession({
      mode: 'practice',
      subtest: 'gam',
      difficulty: 'mixed',
      questionCount: 0,
      seed: 0,
      gamTopicAreas: ['humanities', 'engineering'],
      gamPassageCount: 2,
    });
    store.getState().start();
    const s = store.getState().session!;
    const q0 = s.questions[0] as GamQuestion;
    const q1 = s.questions[1] as GamQuestion;
    store.getState().answer(q0.id, q0.correct);
    store.getState().answer(q1.id, ((q1.correct + 2) % 4) as 0 | 1 | 2 | 3);
    await store.getState().submit();
    return store.getState().session!;
  }

  it('retryExactSet replays the stored set verbatim — bank drift cannot change it', async () => {
    const { store } = makeStore();
    const original = await finishedGamSession(store);
    await retryExactSet(store, original);
    const retried = store.getState().session!;
    expect(retried.state).toBe('ready');
    expect(Object.keys(retried.answers)).toHaveLength(0);
    // identical content and option order, straight from the stored session
    expect(retried.questions.map((q) => (q as GamQuestion).stem)).toEqual(
      original.questions.map((q) => (q as GamQuestion).stem),
    );
    expect(retried.questions.map((q) => (q as GamQuestion).options)).toEqual(
      original.questions.map((q) => (q as GamQuestion).options),
    );
    expect(retried.gamPassages?.map((p) => p.id)).toEqual(original.gamPassages?.map((p) => p.id));
    expect(retried.durationMs).toBe(original.durationMs);
    // fresh ids (R5) that keep their passage prefix
    for (let i = 0; i < retried.questions.length; i++) {
      const r = retried.questions[i] as GamQuestion;
      expect(r.id).not.toBe(original.questions[i].id);
      expect(r.id.startsWith(r.passageId)).toBe(true);
    }
  });

  it('retryMistakes carries only the wrong questions plus their passage docs', async () => {
    const { store } = makeStore();
    const original = await finishedGamSession(store);
    const wrongCount = original.questions.length - 1; // one answered correctly
    await retryMistakes(store, original);
    const retried = store.getState().session!;
    expect(retried.state).toBe('ready');
    expect(retried.questionCount).toBe(wrongCount);
    expect(retried.durationMs).toBe(wrongCount * GAM_MS_PER_QUESTION);
    // ids stay passage-prefixed (validator + runner grouping) but are fresh
    for (const q of retried.questions) {
      const g = q as GamQuestion;
      expect(g.id.startsWith(g.passageId)).toBe(true);
      expect(original.questions.map((o) => o.id)).not.toContain(g.id);
    }
    // passage docs restricted to passages that still have questions
    const needed = new Set(retried.questions.map((q) => (q as GamQuestion).passageId));
    expect(new Set(retried.gamPassages!.map((p) => p.id))).toEqual(needed);
  });
});
