import { Fragment } from 'react';
import type { Frame } from '../../engine/types';
import FigureGrid from './FigureGrid';

/** The four given matrices with faint arrows between them; wraps 2×2 on
 *  narrow screens. Arrows sit between the flex items so all four matrices
 *  render at exactly the same size. */
export default function FrameStrip({ frames }: { frames: Frame[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-1.5">
      {frames.map((frame, i) => (
        <Fragment key={i}>
          <div className="min-w-0 sm:flex-1">
            <p className="mb-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Matrix {i + 1}
            </p>
            <FigureGrid frame={frame} />
          </div>
          {i < frames.length - 1 && (
            <span
              aria-hidden="true"
              className="hidden self-center pt-4 text-zinc-300 sm:block dark:text-zinc-600"
            >
              →
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
