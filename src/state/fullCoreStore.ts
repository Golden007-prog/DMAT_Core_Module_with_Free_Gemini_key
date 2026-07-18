import { createStore, useStore, type StoreApi } from 'zustand';
import type { SubtestType } from '../engine/types';
import type { SessionConfig } from './sessionMachine';
import { GAM_EXAM } from '../engine/gam/assemble';

/** The real exam order and parameters: 3 subtests × 20 tasks × 25:00, with a
 *  60 s (skippable) break between subtests. The full dMAT adds the official
 *  30-minute break between the Core Module and the Subject Module (GAM). */
export const CORE_STAGES: SubtestType[] = ['figures', 'equations', 'latin'];
export const DMAT_STAGES: SubtestType[] = ['figures', 'equations', 'latin', 'gam'];
export const BREAK_SECONDS = 60;
export const MODULE_BREAK_SECONDS = 30 * 60;

export type ExamProgramId = 'full-core' | 'full-dmat';

export interface FullCoreStore {
  active: boolean;
  program: ExamProgramId;
  stageIndex: number;
  atBreak: boolean;
  complete: boolean;
  sessionIds: string[];

  begin(program?: ExamProgramId): void;
  stages(): SubtestType[];
  currentSubtest(): SubtestType;
  /** length of the break that follows the CURRENT stage (before the next) */
  nextBreakSeconds(): number;
  stageConfig(): SessionConfig;
  stageFinished(sessionId: string): void;
  nextStage(): void;
  reset(): void;
}

export function createFullCoreStore(): StoreApi<FullCoreStore> {
  return createStore<FullCoreStore>((set, get) => ({
    active: false,
    program: 'full-core',
    stageIndex: 0,
    atBreak: false,
    complete: false,
    sessionIds: [],

    begin(program = 'full-core') {
      set({
        active: true,
        program,
        stageIndex: 0,
        atBreak: false,
        complete: false,
        sessionIds: [],
      });
    },
    stages() {
      return get().program === 'full-dmat' ? DMAT_STAGES : CORE_STAGES;
    },
    currentSubtest() {
      return get().stages()[get().stageIndex];
    },
    nextBreakSeconds() {
      const next = get().stages()[get().stageIndex + 1];
      return next === 'gam' ? MODULE_BREAK_SECONDS : BREAK_SECONDS;
    },
    stageConfig() {
      const subtest = get().currentSubtest();
      if (subtest === 'gam') {
        // exam + no explicit shape → the 90:00 blueprint draw in sessionStore
        return {
          mode: 'exam',
          subtest: 'gam',
          difficulty: 'mixed',
          questionCount: 0,
          durationMs: GAM_EXAM.durationMs,
          seed: 0, // the session store draws a fresh seed
        };
      }
      return {
        mode: 'exam',
        subtest,
        difficulty: 'mixed',
        questionCount: 20,
        durationMs: 25 * 60_000,
        seed: 0, // the session store draws a fresh seed
      };
    },
    stageFinished(sessionId) {
      const isLast = get().stageIndex === get().stages().length - 1;
      set({
        sessionIds: [...get().sessionIds, sessionId],
        atBreak: !isLast,
        complete: isLast,
      });
    },
    nextStage() {
      if (get().stageIndex < get().stages().length - 1) {
        set({ stageIndex: get().stageIndex + 1, atBreak: false });
      }
    },
    reset() {
      set({
        active: false,
        program: 'full-core',
        stageIndex: 0,
        atBreak: false,
        complete: false,
        sessionIds: [],
      });
    },
  }));
}

export const fullCoreStore = createFullCoreStore();

export function useFullCore<T>(selector: (s: FullCoreStore) => T): T {
  return useStore(fullCoreStore, selector);
}
