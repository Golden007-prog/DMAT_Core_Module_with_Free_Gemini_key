/** Practice-mode navigation dots: answered / flagged / current. */
export default function QuestionPalette({
  total,
  currentIndex,
  answeredIds,
  flaggedIds,
  questionIds,
  onJump,
}: {
  total: number;
  currentIndex: number;
  answeredIds: Set<string>;
  flaggedIds: Set<string>;
  questionIds: string[];
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Question navigation">
      {Array.from({ length: total }, (_, i) => {
        const id = questionIds[i];
        const answered = answeredIds.has(id);
        const flagged = flaggedIds.has(id);
        const current = i === currentIndex;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${flagged ? ', flagged' : ''}${current ? ', current' : ''}`}
            aria-current={current ? 'step' : undefined}
            className={`h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
              current
                ? 'bg-accent text-white'
                : answered
                  ? 'bg-accent-tint text-accent dark:bg-accent/25 dark:text-accent-dark'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
            } ${flagged ? 'ring-2 ring-warning' : ''}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
