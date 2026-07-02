import { useState } from 'react';
import type { Question } from '../../engine/types';
import { useSettings } from '../../state/settingsStore';
import { explainMistake } from '../../ai/coach';

/** G2: on-demand alternative explanation, only offered when the user has a
 *  Gemini key. Deterministic explanations above never depend on this. */
export default function ExplainWithAi({
  question,
  userAnswer,
}: {
  question: Question;
  userAnswer: unknown;
}) {
  const geminiKey = useSettings((s) => s.geminiKey);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');

  if (!geminiKey) return null;

  return (
    <div className="mt-4">
      {state === 'idle' && (
        <button
          type="button"
          onClick={async () => {
            setState('loading');
            try {
              const result = await explainMistake(question, userAnswer);
              setText(result);
              setState('done');
            } catch {
              setState('error');
            }
          }}
          className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/15"
        >
          Explain with AI
        </button>
      )}
      {state === 'loading' && <p className="text-sm text-zinc-500 dark:text-zinc-400">Asking the tutor…</p>}
      {state === 'done' && (
        <div className="rounded-lg bg-accent-tint/60 p-4 text-sm whitespace-pre-wrap dark:bg-accent/10">{text}</div>
      )}
      {state === 'error' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          AI unavailable right now — the explanation above covers the full solution.
        </p>
      )}
    </div>
  );
}
