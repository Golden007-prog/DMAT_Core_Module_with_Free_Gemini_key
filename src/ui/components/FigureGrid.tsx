import type { Frame } from '../../engine/types';
import { SymbolGlyph } from '../../engine/figureSequences/symbols';

/** One 4×4 matrix. Question surfaces stay white in both themes — the real
 *  exam is rendered on a light surface and symbols are tuned for it. */
export default function FigureGrid({
  frame,
  size = 160,
  className,
}: {
  frame: Frame;
  size?: number;
  className?: string;
}) {
  const cell = size / 4;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label={`4 by 4 matrix with ${frame.length} symbol${frame.length === 1 ? '' : 's'}`}
    >
      <rect x={0} y={0} width={size} height={size} fill="#FFFFFF" stroke="#C9C9D1" strokeWidth={1.5} />
      {[1, 2, 3].map((i) => (
        <g key={i} stroke="#E2E2E8" strokeWidth={1}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
      {frame.map((s) => (
        <SymbolGlyph key={s.symbolId} symbol={s} cellSize={cell} />
      ))}
    </svg>
  );
}
