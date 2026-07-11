import type { Clock } from '../../state/timer';

/** Deterministic fake clock: manual advance; interval callbacks fire on time;
 *  wall clock advances in lockstep with the monotonic clock. */
export function fakeClock(startWall = 1_700_000_000_000) {
  let now = 100_000;
  let wall = startWall;
  const intervals = new Map<number, { fn: () => void; ms: number; nextAt: number }>();
  let nextId = 1;

  const clock: Clock = {
    now: () => now,
    wallNow: () => wall,
    setInterval: (fn, ms) => {
      const id = nextId++;
      intervals.set(id, { fn, ms, nextAt: now + ms });
      return id;
    },
    clearInterval: (id) => {
      intervals.delete(id);
    },
  };

  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      let soonest: { id: number; at: number } | null = null;
      for (const [id, iv] of intervals) {
        if (iv.nextAt <= end && (!soonest || iv.nextAt < soonest.at)) {
          soonest = { id, at: iv.nextAt };
        }
      }
      if (!soonest) break;
      const iv = intervals.get(soonest.id)!;
      wall += soonest.at - now;
      now = soonest.at;
      iv.nextAt += iv.ms;
      iv.fn();
    }
    wall += end - now;
    now = end;
  };

  const setWall = (ts: number) => {
    wall = ts;
  };

  return { clock, advance, setWall };
}
