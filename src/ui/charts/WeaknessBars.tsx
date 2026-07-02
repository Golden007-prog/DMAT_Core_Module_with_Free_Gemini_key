import { useChartPalette } from './palette';
import { ruleTagLabel } from '../ruleTagLabels';

/** Horizontal single-hue bars, weakest first; counts printed as text. */
export default function WeaknessBars({
  rows,
}: {
  rows: Array<{ tag: string; correct: number; total: number }>;
}) {
  const pal = useChartPalette();
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const accuracy = r.correct / r.total;
        return (
          <div key={r.tag} className="flex items-center gap-3" title={`${ruleTagLabel(r.tag)}: ${r.correct}/${r.total}`}>
            <span className="w-52 shrink-0 truncate text-sm">{ruleTagLabel(r.tag)}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-r"
                style={{ width: `${accuracy * 100}%`, background: pal.series.figures }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
              {r.correct}/{r.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
