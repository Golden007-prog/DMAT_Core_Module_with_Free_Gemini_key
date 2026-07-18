import { useState } from 'react';
import type { Trick, TrickLevel } from '../../content/tricks';
import { TRICK_LEVEL_LABELS } from '../../content/tricks';
import { ruleTagLabel } from '../ruleTagLabels';

const LEVEL_STYLES: Record<TrickLevel, string> = {
  core: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  sharp: 'bg-accent-tint text-accent dark:bg-zinc-800 dark:text-accent-bright',
  elite: 'bg-accent text-white dark:bg-accent-dark',
};

/** One trick, collapsed to its title until opened. The body stays mounted and
 *  merely hidden so aria-controls always resolves (and Ctrl+F still finds it). */
export default function TrickCard({
  trick,
  learned,
  onToggleLearned,
}: {
  trick: Trick;
  learned: boolean;
  onToggleLearned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = `trick-${trick.id}`;

  return (
    <li className="rounded-card border border-zinc-200 bg-surface shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span aria-hidden="true" className="mt-0.5 text-accent dark:text-accent-bright">
            {open ? '▾' : '▸'}
          </span>
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${learned ? 'text-zinc-500 dark:text-zinc-400' : ''}`}>
              {trick.title}
            </span>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_STYLES[trick.level]}`}
            >
              {TRICK_LEVEL_LABELS[trick.level]}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleLearned}
          aria-pressed={learned}
          aria-label={`Mark "${trick.title}" as learned`}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${
            learned
              ? 'border-success bg-success text-white'
              : 'border-zinc-200 text-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          ✓
        </button>
      </div>

      <div
        id={bodyId}
        hidden={!open}
        className="border-t border-zinc-100 px-3 py-3 sm:px-4 dark:border-zinc-800"
      >
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{trick.body}</p>
        {trick.example && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-alt p-3 font-mono text-xs leading-5 text-ink dark:bg-zinc-900 dark:text-zinc-200">
            {trick.example}
          </pre>
        )}
        {trick.ruleTags && trick.ruleTags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {trick.ruleTags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {ruleTagLabel(tag)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
