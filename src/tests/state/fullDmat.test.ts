import { describe, expect, it } from 'vitest';
import {
  createFullCoreStore,
  BREAK_SECONDS,
  MODULE_BREAK_SECONDS,
  DMAT_STAGES,
} from '../../state/fullCoreStore';
import { GAM_EXAM } from '../../engine/gam/assemble';

describe('full-dmat staged program', () => {
  it('chains core subtests, a 30-minute module break, then the 90:00 GAM exam', () => {
    const store = createFullCoreStore();
    store.getState().begin('full-dmat');

    expect(store.getState().stages()).toEqual(DMAT_STAGES);
    expect(store.getState().currentSubtest()).toBe('figures');

    // 60 s breaks inside the core, 30 min before the subject module
    expect(store.getState().nextBreakSeconds()).toBe(BREAK_SECONDS); // after figures
    store.getState().stageFinished('s1');
    expect(store.getState().atBreak).toBe(true);
    store.getState().nextStage();
    store.getState().stageFinished('s2');
    store.getState().nextStage(); // now: latin
    expect(store.getState().currentSubtest()).toBe('latin');
    expect(store.getState().nextBreakSeconds()).toBe(MODULE_BREAK_SECONDS); // before gam
    store.getState().stageFinished('s3');
    expect(store.getState().complete).toBe(false);
    store.getState().nextStage();

    // final stage: the GAM exam blueprint config
    expect(store.getState().currentSubtest()).toBe('gam');
    const cfg = store.getState().stageConfig();
    expect(cfg.subtest).toBe('gam');
    expect(cfg.mode).toBe('exam');
    expect(cfg.durationMs).toBe(GAM_EXAM.durationMs);
    expect(cfg.gamPassageCount).toBeUndefined(); // exam without shape → blueprint draw

    store.getState().stageFinished('s4');
    expect(store.getState().complete).toBe(true);
    expect(store.getState().atBreak).toBe(false);
    expect(store.getState().sessionIds).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('plain begin() keeps the original three-stage core program', () => {
    const store = createFullCoreStore();
    store.getState().begin();
    expect(store.getState().stages()).toHaveLength(3);
    expect(store.getState().nextBreakSeconds()).toBe(BREAK_SECONDS);
    expect(store.getState().program).toBe('full-core');
  });
});
