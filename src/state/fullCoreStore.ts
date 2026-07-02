import { createStore, useStore, type StoreApi } from 'zustand';
import type { SubtestType } from '../engine/types';
import type { SessionConfig } from './sessionMachine';

/** The real exam order and parameters: 3 subtests × 20 tasks × 25:00, with a
 *  60 s (skippable) break between subtests. */
export const CORE_STAGES: SubtestType[] = ['figures', 'equations', 'latin'];
export const BREAK_SECONDS = 60;

export interface FullCoreStore {
  active: boolean;
  stageIndex: number;
  atBreak: boolean;
  complete: boolean;
  sessionIds: string[];

  begin(): void;
  currentSubtest(): SubtestType;
  stageConfig(): SessionConfig;
  stageFinished(sessionId: string): void;
  nextStage(): void;
  reset(): void;
}

export function createFullCoreStore(): StoreApi<FullCoreStore> {
  return createStore<FullCoreStore>((set, get) => ({
    active: false,
    stageIndex: 0,
    atBreak: false,
    complete: false,
    sessionIds: [],

    begin() {
      set({ active: true, stageIndex: 0, atBreak: false, complete: false, sessionIds: [] });
    },
    currentSubtest() {
      return CORE_STAGES[get().stageIndex];
    },
    stageConfig() {
      return {
        mode: 'exam',
        subtest: get().currentSubtest(),
        difficulty: 'mixed',
        questionCount: 20,
        durationMs: 25 * 60_000,
        seed: 0, // the session store draws a fresh seed
      };
    },
    stageFinished(sessionId) {
      const isLast = get().stageIndex === CORE_STAGES.length - 1;
      set({
        sessionIds: [...get().sessionIds, sessionId],
        atBreak: !isLast,
        complete: isLast,
      });
    },
    nextStage() {
      if (get().stageIndex < CORE_STAGES.length - 1) {
        set({ stageIndex: get().stageIndex + 1, atBreak: false });
      }
    },
    reset() {
      set({ active: false, stageIndex: 0, atBreak: false, complete: false, sessionIds: [] });
    },
  }));
}

export const fullCoreStore = createFullCoreStore();

export function useFullCore<T>(selector: (s: FullCoreStore) => T): T {
  return useStore(fullCoreStore, selector);
}
