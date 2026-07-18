import { useMemo, useRef, useState } from 'react';
import { useChartPalette } from './palette';

export interface LinePoint {
  x: number; // timestamp or index
  y: number;
  label: string; // tooltip line, pre-formatted
}

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  points: LinePoint[];
}

/** Multi-series SVG line chart: 2px lines, recessive grid, crosshair +
 *  tooltip, direct end-labels, one y-axis. */
export default function LineChart({
  series,
  yDomain,
  yTicks,
  yFormat,
  refLineY,
  refLineLabel,
  height = 220,
}: {
  series: LineSeries[];
  yDomain: [number, number];
  yTicks: number[];
  yFormat: (v: number) => string;
  refLineY?: number;
  refLineLabel?: string;
  height?: number;
}) {
  const pal = useChartPalette();
  const [hover, setHover] = useState<{ px: number; xVal: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 640;
  const pad = { left: 44, right: 84, top: 12, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const xSpan = xMax - xMin || 1;
  const toX = (x: number) => pad.left + ((x - xMin) / xSpan) * plotW;
  const toY = (y: number) =>
    pad.top + plotH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;

  const hovered = useMemo(() => {
    if (hover === null) return null;
    return series
      .map((s) => {
        let best: LinePoint | null = null;
        for (const p of s.points) {
          if (!best || Math.abs(p.x - hover.xVal) < Math.abs(best.x - hover.xVal)) best = p;
        }
        return best ? { series: s, point: best } : null;
      })
      .filter((h): h is { series: LineSeries; point: LinePoint } => h !== null);
  }, [hover, series]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const xVal = xMin + ((px - pad.left) / plotW) * xSpan;
    setHover({ px: Math.max(pad.left, Math.min(width - pad.right, px)), xVal });
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={
          series.length
            ? `Line chart. ${series.map((s) => `${s.name}: latest ${yFormat(s.points[s.points.length - 1]?.y ?? 0)}`).join('; ')}`
            : 'Line chart with no data'
        }
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} y1={toY(t)} x2={width - pad.right} y2={toY(t)} stroke={pal.grid} strokeWidth={1} />
            <text x={pad.left - 6} y={toY(t) + 4} textAnchor="end" fontSize={11} fill={pal.axisText}>
              {yFormat(t)}
            </text>
          </g>
        ))}

        {refLineY !== undefined && (
          <g>
            <line
              x1={pad.left}
              y1={toY(refLineY)}
              x2={width - pad.right}
              y2={toY(refLineY)}
              stroke={pal.refLine}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            {refLineLabel && (
              <text x={width - pad.right + 6} y={toY(refLineY) + 4} fontSize={11} fill={pal.axisText}>
                {refLineLabel}
              </text>
            )}
          </g>
        )}

        {series.map((s) => {
          const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`).join(' ');
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              {s.points.length === 1 && (
                <circle cx={toX(s.points[0].x)} cy={toY(s.points[0].y)} r={4} fill={s.color} />
              )}
              {last && refLineY === undefined && (
                <text x={toX(last.x) + 8} y={toY(last.y) + 4} fontSize={11.5} fontWeight={600} fill={pal.ink}>
                  {s.name}
                </text>
              )}
            </g>
          );
        })}

        {hover && (
          <g pointerEvents="none">
            <line x1={hover.px} y1={pad.top} x2={hover.px} y2={height - pad.bottom} stroke={pal.refLine} strokeWidth={1} strokeDasharray="3 3" />
            {hovered?.map((h) => (
              <circle
                key={h.series.key}
                cx={toX(h.point.x)}
                cy={toY(h.point.y)}
                r={4.5}
                fill={h.series.color}
                stroke={pal.surface}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {hover && hovered && hovered.length > 0 && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-xs shadow-card dark:border-zinc-700 dark:bg-surface-dark-alt"
          style={{ left: `${Math.min(80, (hover.px / 640) * 100)}%` }}
        >
          {hovered.map((h) => (
            <p key={h.series.key} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: h.series.color }} />
              {h.point.label}
            </p>
          ))}
        </div>
      )}

      {series.length >= 2 && (
        <div className="mt-1 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-300">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
