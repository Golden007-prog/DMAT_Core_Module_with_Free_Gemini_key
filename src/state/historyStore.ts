import { create } from 'zustand';
import type { Session } from '../engine/types';
import { getStorage, type AttemptRow } from '../storage/db';

interface HistoryState {
  sessions: Session[];
  attempts: AttemptRow[];
  loaded: boolean;
  refresh(): Promise<void>;
}

export const useHistory = create<HistoryState>()((set) => ({
  sessions: [],
  attempts: [],
  loaded: false,
  async refresh() {
    const storage = await getStorage();
    const [sessions, attempts] = await Promise.all([
      storage.listSessions(),
      storage.allAttempts(),
    ]);
    // history lists completed runs only
    set({
      sessions: sessions.filter((s) => s.state === 'finished' || s.state === 'reviewed'),
      attempts,
      loaded: true,
    });
  },
}));
