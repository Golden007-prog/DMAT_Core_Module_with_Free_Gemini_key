import { useEffect, useRef, useState } from 'react';
import type { Frame } from '../../engine/types';
import FigureGrid from './FigureGrid';

/** Animates the six frames of a figure task (400 ms/frame) — the single best
 *  learning feature for this task type. Respects prefers-reduced-motion by
 *  starting paused; manual stepping always works. */
export default function SequencePlayer({ frames }: { frames: Frame[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= frames.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 400);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  const restart = () => {
    setIndex(0);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) setPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-40">
        <FigureGrid frame={frames[index]} />
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Frame {index + 1} / {frames.length}
        {index >= 4 && <span className="ml-1 font-medium text-accent dark:text-accent-dark">(Image {index - 3})</span>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          aria-label="Previous frame"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => (playing ? setPlaying(false) : index >= frames.length - 1 ? restart() : setPlaying(true))}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {playing ? 'Pause' : index >= frames.length - 1 ? 'Replay' : 'Play sequence'}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(frames.length - 1, i + 1))}
          disabled={index === frames.length - 1}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          aria-label="Next frame"
        >
          →
        </button>
      </div>
    </div>
  );
}
