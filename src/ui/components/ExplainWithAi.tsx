import { useState } from 'react';
import type { Question } from '../../engine/types';
import { useSettings } from '../../state/settingsStore';
import { explainMistake, type AiExplanation } from '../../ai/coach';
import { sanitizePlainText } from '../../ai/validateAi';

/** The AI layer already phrases every failure as cause + fix (see
 *  geminiErrorMessage), and BudgetExceededError does the same, so the thrown
 *  message is the line to show. `kind` is read defensively — it only adds the
 *  one thing the message cannot know: whether trying again can help. */
const RETRYABLE: ReadonlySet<string> = new Set(['quota-exceeded', 'server', 'network', 'truncated']);

function readFailure(err: unknown): { reason: string; retryable: boolean } {
  if (typeof err !== 'object' || err === null) return { reason: '', retryable: true };
  const e = err as { kind?: unknown; message?: unknown };
  const kind = typeof e.kind === 'string' ? e.kind : '';
  const message = typeof e.message === 'string' ? sanitizePlainText(e.message) : '';
  return {
    reason: message.slice(0, 240),
    // Unclassified errors (a plain Error) stay retryable — the old behaviour.
    retryable: kind === '' || RETRYABLE.has(kind),
  };
}

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
  const [explanation, setExplanation] = useState<AiExplanation | null>(null);
  const [reason, setReason] = useState('');
  const [retryable, setRetryable] = useState(true);

  if (!geminiKey) return null;

  const ask = async () => {
    setState('loading');
    try {
      setExplanation(await explainMistake(question, userAnswer));
      setState('done');
    } catch (err) {
      const failure = readFailure(err);
      setReason(failure.reason);
      setRetryable(failure.retryable);
      setState('error');
    }
  };

  return (
    <div className="mt-4">
      {(state === 'idle' || (state === 'error' && retryable)) && (
        <button
          type="button"
          onClick={ask}
          className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark dark:text-accent-bright dark:hover:bg-accent/15"
        >
          {state === 'error' ? 'Try the AI tutor again' : 'Explain with AI'}
        </button>
      )}
      {state === 'loading' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Asking the tutor…</p>
      )}

      {state === 'done' && explanation && (
        <div className="space-y-4 rounded-card border border-accent/20 bg-accent-tint/60 p-4 dark:border-accent-dark/25 dark:bg-accent/10">
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-accent dark:text-accent-bright">
              What went wrong
            </h4>
            <p className="mt-1 text-sm font-medium text-ink dark:text-zinc-100">{explanation.diagnosis}</p>
          </div>

          <ol className="space-y-2.5">
            {explanation.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white dark:bg-accent-dark"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold">{step.title}</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="grid gap-2 border-t border-accent/15 pt-3 text-sm sm:grid-cols-2 dark:border-accent-dark/20">
            <p className="text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-ink dark:text-zinc-100">Key insight — </span>
              {explanation.keyInsight}
            </p>
            <p className="text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-ink dark:text-zinc-100">Next time — </span>
              {explanation.tactic}
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-semibold">The AI tutor did not answer</p>
          {reason && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{reason}</p>}
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            The explanation above is the full, verified solution — you lose nothing by skipping this.
          </p>
        </div>
      )}
    </div>
  );
}
