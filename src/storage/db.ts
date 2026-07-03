import Dexie, { type Table } from 'dexie';
import type { Difficulty, Session, SubtestType } from '../engine/types';

/** Denormalised per-question row — powers all analytics with simple queries. */
export interface AttemptRow {
  id: string;
  sessionId: string;
  questionId: string;
  type: SubtestType;
  difficulty: Difficulty;
  ruleTags: string[];
  correct: boolean;
  timeMs: number;
  ts: number;
}

interface SettingRow {
  key: string;
  value: unknown;
}

interface AiCacheRow {
  key: string;
  value: string;
}

export interface StorageAPI {
  /** false → in-memory fallback (private mode); history will not persist */
  readonly persistent: boolean;
  saveSession(s: Session): Promise<void>;
  getSession(id: string): Promise<Session | undefined>;
  listSessions(): Promise<Session[]>;
  deleteSession(id: string): Promise<void>;
  findRunningSessions(): Promise<Session[]>;
  addAttempts(rows: AttemptRow[]): Promise<void>;
  allAttempts(): Promise<AttemptRow[]>;
  aiCacheGet(key: string): Promise<string | undefined>;
  aiCacheSet(key: string, value: string): Promise<void>;
  settingGet<T>(key: string): Promise<T | undefined>;
  settingSet(key: string, value: unknown): Promise<void>;
  allSettings(): Promise<Record<string, unknown>>;
  deleteAll(): Promise<void>;
}

class CoreForgeDexie extends Dexie {
  sessions!: Table<Session, string>;
  attempts!: Table<AttemptRow, string>;
  aiCache!: Table<AiCacheRow, string>;
  settings!: Table<SettingRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      sessions: 'id, createdAt, subtest, mode, state',
      attempts: 'id, sessionId, questionId, type, ts, *ruleTags',
      aiCache: 'key',
      settings: 'key',
    });
  }
}

export class DexieStorage implements StorageAPI {
  readonly persistent = true;
  private db: CoreForgeDexie;

  constructor(name = 'coreforge') {
    this.db = new CoreForgeDexie(name);
  }

  async open(): Promise<void> {
    await this.db.open();
  }

  async saveSession(s: Session): Promise<void> {
    await this.db.sessions.put(JSON.parse(JSON.stringify(s)) as Session);
  }
  async getSession(id: string): Promise<Session | undefined> {
    return this.db.sessions.get(id);
  }
  async listSessions(): Promise<Session[]> {
    return this.db.sessions.orderBy('createdAt').reverse().toArray();
  }
  async deleteSession(id: string): Promise<void> {
    await this.db.sessions.delete(id);
    await this.db.attempts.where('sessionId').equals(id).delete();
  }
  async findRunningSessions(): Promise<Session[]> {
    return this.db.sessions.where('state').equals('running').toArray();
  }
  async addAttempts(rows: AttemptRow[]): Promise<void> {
    await this.db.attempts.bulkPut(rows);
  }
  async allAttempts(): Promise<AttemptRow[]> {
    return this.db.attempts.toArray();
  }
  async aiCacheGet(key: string): Promise<string | undefined> {
    return (await this.db.aiCache.get(key))?.value;
  }
  async aiCacheSet(key: string, value: string): Promise<void> {
    await this.db.aiCache.put({ key, value });
  }
  async settingGet<T>(key: string): Promise<T | undefined> {
    return (await this.db.settings.get(key))?.value as T | undefined;
  }
  async settingSet(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value });
  }
  async allSettings(): Promise<Record<string, unknown>> {
    const rows = await this.db.settings.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  async deleteAll(): Promise<void> {
    await Promise.all([
      this.db.sessions.clear(),
      this.db.attempts.clear(),
      this.db.aiCache.clear(),
      this.db.settings.clear(),
    ]);
  }
}

/** Fallback when IndexedDB is blocked (e.g. some private modes): the app keeps
 *  working, history simply won't survive the tab (§11). */
export class MemoryStorage implements StorageAPI {
  readonly persistent = false;
  private sessions = new Map<string, Session>();
  private attempts = new Map<string, AttemptRow>();
  private cache = new Map<string, string>();
  private settings = new Map<string, unknown>();

  async saveSession(s: Session): Promise<void> {
    this.sessions.set(s.id, JSON.parse(JSON.stringify(s)) as Session);
  }
  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }
  async listSessions(): Promise<Session[]> {
    return [...this.sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    for (const [key, row] of this.attempts) {
      if (row.sessionId === id) this.attempts.delete(key);
    }
  }
  async findRunningSessions(): Promise<Session[]> {
    return [...this.sessions.values()].filter((s) => s.state === 'running');
  }
  async addAttempts(rows: AttemptRow[]): Promise<void> {
    for (const r of rows) this.attempts.set(r.id, r);
  }
  async allAttempts(): Promise<AttemptRow[]> {
    return [...this.attempts.values()];
  }
  async aiCacheGet(key: string): Promise<string | undefined> {
    return this.cache.get(key);
  }
  async aiCacheSet(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
  }
  async settingGet<T>(key: string): Promise<T | undefined> {
    return this.settings.get(key) as T | undefined;
  }
  async settingSet(key: string, value: unknown): Promise<void> {
    this.settings.set(key, value);
  }
  async allSettings(): Promise<Record<string, unknown>> {
    return Object.fromEntries(this.settings);
  }
  async deleteAll(): Promise<void> {
    this.sessions.clear();
    this.attempts.clear();
    this.cache.clear();
    this.settings.clear();
  }
}

let singleton: Promise<StorageAPI> | null = null;

/** App-wide storage: Dexie when IndexedDB works, silent in-memory fallback
 *  otherwise (the UI shows a banner via `persistent === false`). */
export function getStorage(): Promise<StorageAPI> {
  if (!singleton) {
    singleton = (async () => {
      try {
        const dexie = new DexieStorage();
        await dexie.open();
        return dexie;
      } catch {
        return new MemoryStorage();
      }
    })();
  }
  return singleton;
}
