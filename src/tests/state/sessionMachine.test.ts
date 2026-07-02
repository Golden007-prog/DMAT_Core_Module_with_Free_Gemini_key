import { createSession, transition } from '../../state/sessionMachine';
import { generateSet } from '../../engine/generateSet';
import type { Session } from '../../engine/types';

function makeSession(): Session {
  return createSession({
    mode: 'practice',
    subtest: 'latin',
    difficulty: 'easy',
    questionCount: 5,
    seed: 42,
  });
}

function readySession(): Session {
  const s = transition(makeSession(), { type: 'GENERATE' });
  const questions = generateSet({ subtest: 'latin', difficulty: 'easy', count: 5, seed: 42 });
  return transition(s, { type: 'GENERATED', questions });
}

function runningSession(): Session {
  return transition(readySession(), { type: 'START', startedAt: 1000, endsAt: 1000 + 375_000 });
}

describe('session state machine', () => {
  it('walks the happy path setup → generating → ready → running → finished → reviewed', () => {
    let s = makeSession();
    expect(s.state).toBe('setup');
    s = transition(s, { type: 'GENERATE' });
    expect(s.state).toBe('generating');
    const questions = generateSet({ subtest: 'latin', difficulty: 'easy', count: 5, seed: 42 });
    s = transition(s, { type: 'GENERATED', questions });
    expect(s.state).toBe('ready');
    s = transition(s, { type: 'START', startedAt: 1000, endsAt: 376_000 });
    expect(s.state).toBe('running');
    expect(s.endsAt).toBe(376_000);
    s = transition(s, { type: 'SUBMIT', finishedAt: 50_000 });
    expect(s.state).toBe('finished');
    expect(s.score).toBeDefined();
    s = transition(s, { type: 'REVIEW' });
    expect(s.state).toBe('reviewed');
  });

  it('R3: refuses GENERATED with fewer questions than configured', () => {
    const s = transition(makeSession(), { type: 'GENERATE' });
    const questions = generateSet({ subtest: 'latin', difficulty: 'easy', count: 3, seed: 42 });
    expect(() => transition(s, { type: 'GENERATED', questions })).toThrow(/question count/i);
  });

  it('rejects illegal transitions in dev (throw)', () => {
    expect(() => transition(makeSession(), { type: 'START', startedAt: 0, endsAt: 1 })).toThrow();
    expect(() =>
      transition(readySession(), { type: 'ANSWER', questionId: 'x', value: 1, timeMs: 5 }),
    ).toThrow();
    expect(() => transition(makeSession(), { type: 'REVIEW' })).toThrow();
  });

  it('CANCEL during generating returns to setup', () => {
    const s = transition(makeSession(), { type: 'GENERATE' });
    expect(transition(s, { type: 'CANCEL_GENERATION' }).state).toBe('setup');
  });

  it('R5: answers are keyed by question UUID, never by index', () => {
    let s = runningSession();
    const q0 = s.questions[0];
    const q1 = s.questions[1];
    s = transition(s, { type: 'ANSWER', questionId: q0.id, value: 'A', timeMs: 1200 });
    s = transition(s, { type: 'ANSWER', questionId: q1.id, value: 'B', timeMs: 900 });
    expect(s.answers[q0.id]).toBe('A');
    expect(s.answers[q1.id]).toBe('B');
    // re-answering q0 never touches q1
    s = transition(s, { type: 'ANSWER', questionId: q0.id, value: 'C', timeMs: 300 });
    expect(s.answers[q0.id]).toBe('C');
    expect(s.answers[q1.id]).toBe('B');
  });

  it('rejects answers for unknown question ids', () => {
    const s = runningSession();
    expect(() =>
      transition(s, { type: 'ANSWER', questionId: 'not-a-question', value: 'A', timeMs: 1 }),
    ).toThrow(/unknown question/i);
  });

  it('R4: TIME_UP finishes exactly once; repeats are no-ops, not errors', () => {
    let s = runningSession();
    s = transition(s, { type: 'TIME_UP', finishedAt: 999 });
    expect(s.state).toBe('finished');
    const again = transition(s, { type: 'TIME_UP', finishedAt: 1999 });
    expect(again).toBe(s); // identical object — nothing recomputed
  });

  it('scores unanswered questions as wrong', () => {
    let s = runningSession();
    const q0 = s.questions[0];
    const latin = q0.type === 'latin' ? q0 : null;
    expect(latin).not.toBeNull();
    s = transition(s, {
      type: 'ANSWER',
      questionId: q0.id,
      value: latin!.solutionLetter,
      timeMs: 800,
    });
    s = transition(s, { type: 'SUBMIT', finishedAt: 100 });
    expect(s.score!.correct).toBe(1);
    expect(s.score!.unanswered).toBe(4);
    expect(s.score!.wrong).toBe(4); // unanswered counts as wrong in accuracy
    expect(s.score!.accuracy).toBeCloseTo(0.2);
  });

  it('FLAG toggles review flags in practice mode', () => {
    let s = runningSession();
    const qid = s.questions[2].id;
    s = transition(s, { type: 'FLAG', questionId: qid });
    expect(s.flagged).toContain(qid);
    s = transition(s, { type: 'FLAG', questionId: qid });
    expect(s.flagged).not.toContain(qid);
  });
});
