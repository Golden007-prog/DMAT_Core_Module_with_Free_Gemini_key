import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fullCoreStore, useFullCore, MODULE_BREAK_SECONDS } from '../../state/fullCoreStore';
import { sessionStore } from '../../state/sessionStore';

const NAMES: Record<string, string> = {
  figures: 'Figure Sequences',
  equations: 'Mathematical Equations',
  latin: 'Latin Squares',
  gam: 'General Academic Module',
};

function formatBreak(s: number): string {
  if (s < 100) return `${s}`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

/** Break between staged-exam parts, mirroring the real exam flow: 60 s
 *  between Core subtests, 30 minutes between the Core Module and the
 *  General Academic Module. Skippable — this is a practice tool. */
export default function Break() {
  const navigate = useNavigate();
  const active = useFullCore((s) => s.active);
  const atBreak = useFullCore((s) => s.atBreak);
  const stageIndex = useFullCore((s) => s.stageIndex);
  const stages = useFullCore((s) => s.stages());
  const [secondsLeft, setSecondsLeft] = useState(() =>
    fullCoreStore.getState().nextBreakSeconds(),
  );

  const nextSubtest = stages[stageIndex + 1];
  const isModuleBreak = fullCoreStore.getState().nextBreakSeconds() === MODULE_BREAK_SECONDS;
  // once proceed() runs, atBreak flips false by design — the stray-visit
  // redirect below must not stomp the /run navigation it just made
  const proceeding = useRef(false);

  useEffect(() => {
    if (proceeding.current) return;
    if (!active || !atBreak) navigate('/', { replace: true });
  }, [active, atBreak, navigate]);

  useEffect(() => {
    if (!active || !atBreak) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [active, atBreak]);

  const proceed = () => {
    if (proceeding.current) return; // timer-zero and a click can race
    proceeding.current = true;
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
      <h1 className="text-2xl font-bold">{isModuleBreak ? 'Module break' : 'Break'}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        {isModuleBreak ? (
          <>
            Core Module done — the real exam gives a 30-minute break here. Up next:{' '}
            <strong>{NAMES[nextSubtest]}</strong> — reading passages, single choice, 90:00.
          </>
        ) : (
          <>
            Subtest {stageIndex + 1} of {stages.length} done. Up next:{' '}
            <strong>{NAMES[nextSubtest]}</strong> — 20 tasks in 25:00.
          </>
        )}
      </p>
      <p
        className="timer-digits mt-8 text-6xl font-bold text-accent dark:text-accent-bright"
        aria-live="polite"
      >
        {formatBreak(secondsLeft)}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {isModuleBreak ? 'break remaining (skippable here)' : 'seconds of break remaining'}
      </p>
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
