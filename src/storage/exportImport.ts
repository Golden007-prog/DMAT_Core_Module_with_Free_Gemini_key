import type { Session } from '../engine/types';
import type { AttemptRow, StorageAPI } from './db';

interface ExportPayload {
  app: 'coreforge';
  version: 1;
  exportedAt: number;
  sessions: Session[];
  attempts: AttemptRow[];
  settings: Record<string, unknown>;
}

/** The user owns their data: everything as a single JSON file. */
export async function exportAll(storage: StorageAPI): Promise<string> {
  const payload: ExportPayload = {
    app: 'coreforge',
    version: 1,
    exportedAt: Date.now(),
    sessions: await storage.listSessions(),
    attempts: await storage.allAttempts(),
    settings: await storage.allSettings(),
  };
  return JSON.stringify(payload, null, 2);
}

export async function importAll(storage: StorageAPI, json: string): Promise<void> {
  let payload: ExportPayload;
  try {
    payload = JSON.parse(json) as ExportPayload;
  } catch {
    throw new Error('Not a valid CoreForge export file (unparseable JSON).');
  }
  if (
    payload?.app !== 'coreforge' ||
    payload.version !== 1 ||
    !Array.isArray(payload.sessions) ||
    !Array.isArray(payload.attempts)
  ) {
    throw new Error('Not a valid CoreForge export file.');
  }
  for (const s of payload.sessions) await storage.saveSession(s);
  await storage.addAttempts(payload.attempts);
  for (const [key, value] of Object.entries(payload.settings ?? {})) {
    await storage.settingSet(key, value);
  }
}
