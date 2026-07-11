import { useState } from 'react';
import type { Session } from '../../engine/types';
import type { AttemptRow } from '../../storage/db';
import { useSettings } from '../../state/settingsStore';
import { coachNarrative, type AiCoachPlan } from '../../ai/coach';
import { sanitizePlainText } from '../../ai/validateAi';
import { ruleTagLabel } from '../ruleTagLabels';

/** G3: optional AI coaching narrative from aggregated stats only. Appears
 *  after ≥3 sessions and only when a Gemini key is configured. */
export default function CoachCard({
  sessions,
  attempts,
}: {
  sessions: Session[];
  attempts: AttemptRow[];
}) {
  const geminiKey = useSettings((s) => s.geminiKey);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [plan, setPlan] = useState<AiCoachPlan | null>(null);
  const [reason, setReason] = useState('');

  if (!geminiKey || sessions.length < 3) return null;

  const ask = async () => {
    setState('loading');
    try {
      setPlan(await coachNarrative(sessions, attempts));
      setState('done');
    } catch (err) {
      // The AI layer already phrases its failures as cause + fix.
      const message = err instanceof Error ? sanitizePlainText(err.message) : '';
      setReason(message.slice(0, 240));
      setState('error');
    }
  };

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      {(state === 'idle' || state === 'error') && (
        <button
          type="button"
          onClick={ask}
          className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/15"
        >
          {state === 'error' ? 'Try the AI coach again' : 'Get an AI coaching plan'}
        </button>
      )}
      {state === 'loading' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Analysing your stats…</p>
      )}

      {state === 'done' && plan && (
        <div className="space-y-4 rounded-card bg-accent-tint/60 p-4 text-sm dark:bg-accent/10">
          <p className="font-semibold text-ink dark:text-zinc-100">{plan.headline}</p>

          <ul className="space-y-2.5">
            {plan.leveragePoints.map((point, i) => (
              <li key={i}>
                <p className="font-semibold text-ink dark:text-zinc-100">{point.title}</p>
                <p className="text-zinc-700 dark:text-zinc-300">{point.why}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{point.evidence}</p>
              </li>
            ))}
          </ul>

          <div className="border-t border-accent/15 pt-3 dark:border-accent-dark/20">
            <h4 className="text-xs font-bold tracking-wide uppercase text-accent dark:text-accent-dark">
              This week's drills
            </h4>
            <ol className="mt-2 space-y-2">
              {plan.drills.map((drill, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white dark:bg-accent-dark"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-300">
                    {drill.drill}
                  </span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
                    {ruleTagLabel(drill.tag)} · {drill.minutes} min
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="border-t border-accent/15 pt-3 text-zinc-700 dark:border-accent-dark/20 dark:text-zinc-300">
            <span className="font-semibold text-ink dark:text-zinc-100">Pacing — </span>
            {plan.pacing}
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-semibold">The AI coach did not answer</p>
          {reason && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{reason}</p>}
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            The deterministic insights above stay accurate.
          </p>
        </div>
      )}
    </div>
  );
}
