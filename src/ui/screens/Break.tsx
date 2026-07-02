import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fullCoreStore, useFullCore, BREAK_SECONDS, CORE_STAGES } from '../../state/fullCoreStore';
import { sessionStore } from '../../state/sessionStore';

const NAMES: Record<string, string> = {
  figures: 'Figure Sequences',
  equations: 'Mathematical Equations',
  latin: 'Latin Squares',
};

/** 60-second break between Full Core Module subtests (skippable), mirroring
 *  the real exam flow. */
export default function Break() {
  const navigate = useNavigate();
  const active = useFullCore((s) => s.active);
  const atBreak = useFullCore((s) => s.atBreak);
  const stageIndex = useFullCore((s) => s.stageIndex);
  const [secondsLeft, setSecondsLeft] = useState(BREAK_SECONDS);

  const nextSubtest = CORE_STAGES[stageIndex + 1];

  useEffect(() => {
    if (!active || !atBreak) navigate('/', { replace: true });
  }, [active, atBreak, navigate]);

  useEffect(() => {
    if (!active || !atBreak) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [active, atBreak]);

  const proceed = () => {
    fullCoreStore.getState().nextStage();
    void sessionStore.getState().startNewSession(fullCoreStore.getState().stageConfig());
    navigate('/run');
  };

  useEffect(() => {
    if (secondsLeft === 0 && active && atBreak) proceed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!active || !atBreak || !nextSubtest) return null;

  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Break</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Subtest {stageIndex + 1} of 3 done. Up next: <strong>{NAMES[nextSubtest]}</strong> — 20 tasks in
        25:00.
      </p>
      <p className="timer-digits mt-8 text-6xl font-bold text-accent dark:text-accent-dark" aria-live="polite">
        {secondsLeft}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">seconds of break remaining</p>
      <button
        type="button"
        onClick={proceed}
        className="mt-8 rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover"
      >
        Skip break — continue now
      </button>
    </section>
  );
}
