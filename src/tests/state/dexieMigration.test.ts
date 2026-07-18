import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { DexieStorage } from '../../storage/db';
import { createSession, transition } from '../../state/sessionMachine';
import { generateSet } from '../../engine/generateSet';

/** Proves the v1 → v2 upgrade (adds gamPassages) preserves every v1 row. */
describe('Dexie v2 migration', () => {
  it('opens a v1 database and keeps sessions/attempts/settings intact', async () => {
    const name = `migrate-${crypto.randomUUID()}`;

    // 1. build a database with the EXACT v1 schema and real v1-shaped data
    const v1 = new Dexie(name);
    v1.version(1).stores({
      sessions: 'id, createdAt, subtest, mode, state',
      attempts: 'id, sessionId, questionId, type, ts, *ruleTags',
      aiCache: 'key',
      settings: 'key',
    });
    await v1.open();

    let session = createSession({
      mode: 'practice',
      subtest: 'latin',
      difficulty: 'easy',
      questionCount: 3,
      seed: 11,
    });
    session = transition(session, { type: 'GENERATE' });
    session = transition(session, {
      type: 'GENERATED',
      questions: generateSet({ subtest: 'latin', difficulty: 'easy', count: 3, seed: 11 }),
    });
    await v1.table('sessions').put(JSON.parse(JSON.stringify(session)));
    await v1.table('attempts').put({
      id: 'a1',
      sessionId: session.id,
      questionId: session.questions[0].id,
      type: 'latin',
      difficulty: 'easy',
      ruleTags: ['lat.direct'],
      correct: true,
      timeMs: 1234,
      ts: 42,
    });
    await v1.table('settings').put({ key: 'theme', value: 'dark' });
    await v1.table('aiCache').put({ key: 'k', value: 'v' });
    v1.close();

    // 2. reopen through the app's storage class (v2 schema)
    const storage = new DexieStorage(name);
    await storage.open();

    const restored = await storage.getSession(session.id);
    expect(restored?.questions).toHaveLength(3);
    expect(restored?.seed).toBe(11);
    const attempts = await storage.allAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].timeMs).toBe(1234);
    expect(await storage.settingGet('theme')).toBe('dark');
    expect(await storage.aiCacheGet('k')).toBe('v');

    // 3. the new v2 table works on the upgraded database
    expect(await storage.gamPassagesAll()).toEqual([]);
    await storage.gamPassagesPut([
      {
        hash: 'h1',
        topicArea: 'economics',
        difficulty: 'medium',
        addedAt: 1,
        passage: {
          id: 'p1',
          topicArea: 'economics',
          title: 'T',
          passageMarkdown: 'text',
          estimatedMinutes: 10,
          difficulty: 'medium',
          source: 'pool',
          questions: [],
        },
      },
    ]);
    expect((await storage.gamPassagesAll())[0].passage.id).toBe('p1');
  });
});
