import { useChartPalette } from './palette';
import { formatPercent } from '../format';

/** Difficulty heat strip: sequential berry ramp encodes accuracy magnitude;
 *  values always printed in text ink, never colour-alone. */
export default function HeatStrip({
  cells,
}: {
  cells: Array<{ label: string; accuracy: number | null; total: number }>;
}) {
  const pal = useChartPalette();
  const rampIndex = (a: number) => Math.min(4, Math.floor(a * 5));
  return (
    <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
      {cells.map((c) => (
        <div
          key={c.label}
          className="px-3 py-3 text-center"
          style={{
            background: c.accuracy === null ? pal.grid : pal.sequential[rampIndex(c.accuracy)],
          }}
          title={
            c.accuracy === null
              ? `${c.label}: no attempts yet`
              : `${c.label}: ${formatPercent(c.accuracy)} over ${c.total} questions`
          }
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: c.accuracy !== null && c.accuracy >= 0.6 ? '#FFFFFF' : pal.ink }}
          >
            {c.label}
          </p>
          <p
            className="mt-0.5 text-lg font-bold tabular-nums"
            style={{ color: c.accuracy !== null && c.accuracy >= 0.6 ? '#FFFFFF' : pal.ink }}
          >
            {c.accuracy === null ? '—' : formatPercent(c.accuracy)}
          </p>
        </div>
      ))}
    </div>
  );
}
