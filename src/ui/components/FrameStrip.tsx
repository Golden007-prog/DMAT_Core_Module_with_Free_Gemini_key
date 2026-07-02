import type { Frame } from '../../engine/types';
import FigureGrid from './FigureGrid';

/** The four given matrices with faint arrows between them; wraps 2×2 on
 *  narrow screens. */
export default function FrameStrip({ frames }: { frames: Frame[] }) {
  return (
    <div className="grid grid-cols-2 items-center gap-3 sm:flex sm:flex-nowrap sm:gap-2">
      {frames.map((frame, i) => (
        <div key={i} className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Matrix {i + 1}
            </p>
            <FigureGrid frame={frame} />
          </div>
          {i < frames.length - 1 && (
            <span aria-hidden="true" className="hidden pt-4 text-zinc-300 sm:block dark:text-zinc-600">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
