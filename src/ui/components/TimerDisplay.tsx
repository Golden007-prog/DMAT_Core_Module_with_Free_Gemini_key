import { useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { formatMs } from '../format';

/** mm:ss, tabular digits; amber under 5:00, pulsing red under 1:00. The
 *  "hide timer" anxiety option hides the digits — time is still enforced. */
export default function TimerDisplay() {
  const remainingMs = useSession((s) => s.remainingMs);
  const running = useSession((s) => s.session?.state === 'running');
  const hideTimer = useSettings((s) => s.hideTimer);
  const set = useSettings((s) => s.set);

  const warn = remainingMs < 5 * 60_000;
  const critical = remainingMs < 60_000;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`timer-digits rounded-md px-2 py-0.5 text-lg font-semibold ${
          !running
            ? 'text-zinc-400 dark:text-zinc-500'
            : critical
              ? 'animate-pulse bg-error/10 text-error motion-reduce:animate-none'
              : warn
                ? 'bg-warning/10 text-warning'
                : 'text-ink dark:text-zinc-100'
        }`}
        aria-live={critical && running ? 'polite' : 'off'}
        aria-label={hideTimer ? 'Timer hidden' : `Time remaining ${formatMs(remainingMs)}`}
      >
        {hideTimer ? '––:––' : formatMs(remainingMs)}
      </span>
      <button
        type="button"
        onClick={() => set('hideTimer', !hideTimer)}
        className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        title={hideTimer ? 'Show timer' : 'Hide timer (time is still enforced)'}
        aria-label={hideTimer ? 'Show timer' : 'Hide timer'}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {hideTimer ? (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <path d="m4 4 16 16" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
