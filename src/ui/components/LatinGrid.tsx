import { useState } from 'react';
import type { LatinLetter } from '../../engine/types';

/** 5×5 Latin square with the red "?" cell, exactly like the official
 *  material. Practice-only hover aid highlights the full row + column. */
export default function LatinGrid({
  grid,
  question,
  hoverAid = false,
  resolvedLetter,
}: {
  grid: (LatinLetter | null)[][];
  question: { row: number; col: number };
  hoverAid?: boolean;
  /** review mode: show the solution letter inside the "?" cell */
  resolvedLetter?: LatinLetter;
}) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const cell = 48;
  const size = cell * 5;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[280px]"
      role="img"
      aria-label="5 by 5 letter grid with one cell marked by a question mark"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {grid.map((row, r) =>
        row.map((letter, c) => {
          const isTarget = r === question.row && c === question.col;
          const highlighted =
            hoverAid && hover !== null && (hover.row === r || hover.col === c);
          return (
            <g
              key={`${r}-${c}`}
              onMouseEnter={hoverAid ? () => setHover({ row: r, col: c }) : undefined}
              onMouseLeave={hoverAid ? () => setHover(null) : undefined}
            >
              <rect
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill={highlighted ? '#F7E6EE' : '#FFFFFF'}
                stroke="#B9B9C2"
                strokeWidth={1}
              />
              {isTarget ? (
                <text
                  x={c * cell + cell / 2}
                  y={r * cell + cell / 2 + 8}
                  textAnchor="middle"
                  fontSize={26}
                  fontWeight={700}
                  fill={resolvedLetter ? '#2E8B57' : '#C43D3D'}
                >
                  {resolvedLetter ?? '?'}
                </text>
              ) : (
                letter && (
                  <text
                    x={c * cell + cell / 2}
                    y={r * cell + cell / 2 + 8}
                    textAnchor="middle"
                    fontSize={24}
                    fontWeight={600}
                    fill="#1A1A1A"
                  >
                    {letter}
                  </text>
                )
              )}
            </g>
          );
        }),
      )}
      <rect width={size} height={size} fill="none" stroke="#8A8A94" strokeWidth={2} />
    </svg>
  );
}
