import { useState } from 'react';
import type { LatinLetter } from '../../engine/types';
import { glyphFor, type LatinAlphabetId } from '../../engine/latinSquares/alphabets';

/** 5×5 Latin square with the red "?" cell, exactly like the official
 *  material. Supports display alphabets (letters, digits, greek, shapes);
 *  practice-only hover aid highlights the full row + column. Row/column rulers
 *  sit outside the square so the explanations can name cells ("R4C2") without
 *  the learner counting squares. */
export default function LatinGrid({
  grid,
  question,
  hoverAid = false,
  resolvedLetter,
  alphabet,
}: {
  grid: (LatinLetter | null)[][];
  question: { row: number; col: number };
  hoverAid?: boolean;
  /** review mode: show the solution inside the "?" cell */
  resolvedLetter?: LatinLetter;
  alphabet?: LatinAlphabetId;
}) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const cell = 48;
  const gutter = 16; // ruler lane, outside the square itself
  const size = cell * 5;
  const isShapes = alphabet === 'shapes';
  const lanes = [0, 1, 2, 3, 4];

  return (
    <svg
      viewBox={`0 0 ${gutter + size} ${gutter + size}`}
      className="mx-auto w-full max-w-[300px] touch-manipulation"
      role="img"
      aria-label={`5 by 5 symbol grid with one cell marked by a question mark`}
    >
      {lanes.map((i) => (
        <g key={`ruler-${i}`} aria-hidden="true">
          <text
            x={gutter + i * cell + cell / 2}
            y={gutter - 5}
            textAnchor="middle"
            fontSize={11}
            fontWeight={i === question.col ? 700 : 500}
            fill={i === question.col ? '#C43D3D' : '#8A8A94'}
          >
            {i + 1}
          </text>
          <text
            x={gutter - 5}
            y={gutter + i * cell + cell / 2 + 4}
            textAnchor="end"
            fontSize={11}
            fontWeight={i === question.row ? 700 : 500}
            fill={i === question.row ? '#C43D3D' : '#8A8A94'}
          >
            {i + 1}
          </text>
        </g>
      ))}
      <rect x={gutter} y={gutter} width={size} height={size} fill="#FFFFFF" />
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
                x={gutter + c * cell}
                y={gutter + r * cell}
                width={cell}
                height={cell}
                fill={highlighted ? '#F7E6EE' : '#FFFFFF'}
                stroke="#B9B9C2"
                strokeWidth={1}
              />
              {isTarget ? (
                <text
                  x={gutter + c * cell + cell / 2}
                  y={gutter + r * cell + cell / 2 + 8}
                  textAnchor="middle"
                  fontSize={26}
                  fontWeight={700}
                  fill={resolvedLetter ? '#2E8B57' : '#C43D3D'}
                >
                  {resolvedLetter ? glyphFor(alphabet, resolvedLetter) : '?'}
                </text>
              ) : (
                letter && (
                  <text
                    x={gutter + c * cell + cell / 2}
                    y={gutter + r * cell + cell / 2 + (isShapes ? 7 : 8)}
                    textAnchor="middle"
                    fontSize={isShapes ? 20 : 24}
                    fontWeight={600}
                    fill="#1A1A1A"
                  >
                    {glyphFor(alphabet, letter)}
                  </text>
                )
              )}
            </g>
          );
        }),
      )}
      <rect
        x={gutter}
        y={gutter}
        width={size}
        height={size}
        fill="none"
        stroke="#8A8A94"
        strokeWidth={2}
      />
    </svg>
  );
}
