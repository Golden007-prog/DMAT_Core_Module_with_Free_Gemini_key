import { useState } from 'react';
import type { Session } from '../../engine/types';
import type { AttemptRow } from '../../storage/db';
import { useSettings } from '../../state/settingsStore';
import { coachNarrative } from '../../ai/coach';

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
  const [text, setText] = useState('');

  if (!geminiKey || sessions.length < 3) return null;

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      {state === 'idle' && (
        <button
          type="button"
          onClick={async () => {
            setState('loading');
            try {
              setText(await coachNarrative(sessions, attempts));
              setState('done');
            } catch {
              setState('error');
            }
          }}
          className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/15"
        >
          Get an AI coaching plan
        </button>
      )}
      {state === 'loading' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Analysing your stats…</p>
      )}
      {state === 'done' && (
        <div className="rounded-lg bg-accent-tint/60 p-4 text-sm whitespace-pre-wrap dark:bg-accent/10">{text}</div>
      )}
      {state === 'error' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          AI unavailable right now — the deterministic insights above stay accurate.
        </p>
      )}
    </div>
  );
}
