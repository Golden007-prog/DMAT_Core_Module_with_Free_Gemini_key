import { DexieStorage, MemoryStorage, type StorageAPI } from '../../storage/db';
import { exportAll, importAll } from '../../storage/exportImport';
import { createSession, transition } from '../../state/sessionMachine';
import { generateSet } from '../../engine/generateSet';
import type { Session } from '../../engine/types';

function finishedSession(seed = 5): Session {
  let s = createSession({
    mode: 'practice',
    subtest: 'latin',
    difficulty: 'easy',
    questionCount: 3,
    seed,
  });
  s = transition(s, { type: 'GENERATE' });
  s = transition(s, {
    type: 'GENERATED',
    questions: generateSet({ subtest: 'latin', difficulty: 'easy', count: 3, seed }),
  });
  s = transition(s, { type: 'START', startedAt: 1, endsAt: 300_000 });
  s = transition(s, { type: 'SUBMIT', finishedAt: 100_000 });
  return s;
}

const impls: Array<[string, () => Promise<StorageAPI>]> = [
  ['DexieStorage (fake-indexeddb)', async () => new DexieStorage(`test-${crypto.randomUUID()}`)],
  ['MemoryStorage', async () => new MemoryStorage()],
];

describe.each(impls)('%s', (_name, make) => {
  it('round-trips sessions', async () => {
    const store = await make();
    const s = finishedSession();
    await store.saveSession(s);
    const loaded = await store.getSession(s.id);
    expect(loaded?.id).toBe(s.id);
    expect(loaded?.score?.totalQuestions).toBe(3);
    const all = await store.listSessions();
    expect(all.map((x) => x.id)).toContain(s.id);
  });

  it('finds running sessions for refresh-resume', async () => {
    const store = await make();
    let s = createSession({
      mode: 'exam',
      subtest: 'latin',
      difficulty: 'easy',
      questionCount: 3,
      seed: 6,
    });
    s = transition(s, { type: 'GENERATE' });
    s = transition(s, {
      type: 'GENERATED',
      questions: generateSet({ subtest: 'latin', difficulty: 'easy', count: 3, seed: 6 }),
    });
    s = transition(s, { type: 'START', startedAt: 1, endsAt: 99999 });
    await store.saveSession(s);
    const running = await store.findRunningSessions();
    expect(running.map((r) => r.id)).toContain(s.id);
  });

  it('stores attempts and settings and supports deleteAll', async () => {
    const store = await make();
    await store.addAttempts([
      {
        id: crypto.randomUUID(),
        sessionId: 'sess',
        questionId: 'q',
        type: 'latin',
        difficulty: 'easy',
        ruleTags: ['lat.direct'],
        correct: true,
        timeMs: 1234,
        ts: Date.now(),
      },
    ]);
    await store.settingSet('foo', { a: 1 });
    await store.aiCacheSet('k', 'v');
    expect((await store.allAttempts())).toHaveLength(1);
    expect(await store.settingGet('foo')).toEqual({ a: 1 });
    expect(await store.aiCacheGet('k')).toBe('v');
    await store.deleteAll();
    expect(await store.allAttempts()).toHaveLength(0);
    expect(await store.settingGet('foo')).toBeUndefined();
  });

  it('export/import round-trips the full history', async () => {
    const a = await make();
    const s = finishedSession(9);
    await a.saveSession(s);
    await a.settingSet('theme', 'dark');
    const json = await exportAll(a);

    const b = await make();
    await importAll(b, json);
    expect((await b.getSession(s.id))?.id).toBe(s.id);
    expect(await b.settingGet('theme')).toBe('dark');
  });
});

describe('importAll validation', () => {
  it('rejects malformed payloads', async () => {
    const store = new MemoryStorage();
    await expect(importAll(store, '{"not":"valid"}')).rejects.toThrow();
    await expect(importAll(store, 'garbage')).rejects.toThrow();
  });
});
