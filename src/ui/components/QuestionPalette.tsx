/** Practice-mode navigation dots: answered / flagged / current. `groupKeys`
 *  (e.g. GAM passage ids, index-aligned with questionIds) draws a subtle
 *  divider whenever the group changes, so passage blocks read as blocks. */
export default function QuestionPalette({
  total,
  currentIndex,
  answeredIds,
  flaggedIds,
  questionIds,
  groupKeys,
  onJump,
}: {
  total: number;
  currentIndex: number;
  answeredIds: Set<string>;
  flaggedIds: Set<string>;
  questionIds: string[];
  groupKeys?: string[];
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Question navigation">
      {Array.from({ length: total }, (_, i) => {
        const id = questionIds[i];
        const answered = answeredIds.has(id);
        const flagged = flaggedIds.has(id);
        const current = i === currentIndex;
        const newGroup = groupKeys && i > 0 && groupKeys[i] !== groupKeys[i - 1];
        return (
          <span key={id} className="flex items-center gap-1.5">
            {newGroup && (
              <span
                aria-hidden="true"
                className="h-5 w-px bg-zinc-300 dark:bg-zinc-700"
              />
            )}
            <button
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${flagged ? ', flagged' : ''}${current ? ', current' : ''}`}
              aria-current={current ? 'step' : undefined}
              className={`h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                current
                  ? 'bg-accent text-white'
                  : answered
                    ? 'bg-accent-tint text-accent dark:bg-accent/25 dark:text-accent-bright'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
              } ${flagged ? 'ring-2 ring-warning' : ''}`}
            >
              {i + 1}
            </button>
          </span>
        );
      })}
    </div>
  );
}
