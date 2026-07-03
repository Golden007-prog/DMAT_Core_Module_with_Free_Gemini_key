import { useChartPalette } from './palette';

/** GitHub-style practice calendar: last 12 weeks of answered questions. */
export default function PracticeHeatmap({ countsByDay }: { countsByDay: Map<string, number> }) {
  const pal = useChartPalette();
  const weeks = 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // grid starts on the Monday `weeks` back
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);

  const cell = 13;
  const gap = 3;
  const width = weeks * (cell + gap);
  const height = 7 * (cell + gap);
  const max = Math.max(1, ...countsByDay.values());

  const color = (n: number) => {
    if (n === 0) return pal.grid;
    const idx = Math.min(4, Math.ceil((n / max) * 4));
    return pal.sequential[idx];
  };

  const days: Array<{ x: number; y: number; date: Date; n: number }> = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) continue;
      const key = date.toISOString().slice(0, 10);
      days.push({ x: w * (cell + gap), y: d * (cell + gap), date, n: countsByDay.get(key) ?? 0 });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-md"
      role="img"
      aria-label="Practice calendar for the last 12 weeks"
    >
      {days.map((d) => (
        <rect
          key={d.date.toISOString()}
          x={d.x}
          y={d.y}
          width={cell}
          height={cell}
          rx={3}
          fill={color(d.n)}
        >
          <title>{`${d.date.toLocaleDateString()}: ${d.n} question${d.n === 1 ? '' : 's'}`}</title>
        </rect>
      ))}
    </svg>
  );
}
