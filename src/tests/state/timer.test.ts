import { createTimer, type Clock } from '../../state/timer';

/** Deterministic fake clock: manual advance, interval callbacks fire on time. */
function fakeClock() {
  let now = 100_000;
  let wall = 1_700_000_000_000;
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
    // fire due interval callbacks in time order
    for (;;) {
      let soonest: { id: number; at: number } | null = null;
      for (const [id, iv] of intervals) {
        if (iv.nextAt <= end && (!soonest || iv.nextAt < soonest.at)) {
          soonest = { id, at: iv.nextAt };
        }
      }
      if (!soonest) break;
      const iv = intervals.get(soonest.id)!;
      now = soonest.at;
      wall += iv.ms;
      iv.nextAt += iv.ms;
      iv.fn();
    }
    now = end;
  };
  return { clock, advance };
}

describe('createTimer (deadline-based, R4)', () => {
  it('is disarmed initially and reports the configured duration only after arming', () => {
    const { clock } = fakeClock();
    const timer = createTimer(clock);
    expect(timer.isArmed()).toBe(false);
    timer.arm(25 * 60_000);
    expect(timer.isArmed()).toBe(true);
    expect(timer.remainingMs()).toBe(25 * 60_000);
  });

  it('does not drift: under 1s error across 25 minutes of jittery ticks', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    timer.arm(25 * 60_000);
    let elapsed = 0;
    // jittery advancing in odd chunks
    const chunks = [217, 483, 251, 1009, 333, 90, 754];
    let i = 0;
    while (elapsed < 24 * 60_000) {
      const step = chunks[i++ % chunks.length];
      advance(step);
      elapsed += step;
    }
    const expected = 25 * 60_000 - elapsed;
    expect(Math.abs(timer.remainingMs() - expected)).toBeLessThan(1000);
  });

  it('fires onExpire exactly once even across rapid extra ticks', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    let fired = 0;
    timer.onExpire(() => fired++);
    timer.arm(1000);
    advance(3000);
    advance(1000);
    advance(1000);
    expect(fired).toBe(1);
    expect(timer.remainingMs()).toBe(0);
  });

  it('never ticks while disarmed (R2: generating/loading costs the user 0 seconds)', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    const seen: number[] = [];
    timer.subscribe((ms) => seen.push(ms));
    advance(8000); // generation takes 8 s → user loses 0 s
    expect(seen).toHaveLength(0);
    timer.arm(60_000);
    expect(timer.remainingMs()).toBe(60_000);
  });

  it('disarm stops ticking and prevents expiry', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    let fired = 0;
    timer.onExpire(() => fired++);
    timer.arm(1000);
    timer.disarm();
    advance(5000);
    expect(fired).toBe(0);
    expect(timer.isArmed()).toBe(false);
  });

  it('freeze pauses the countdown, resume continues from the frozen remaining', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    timer.arm(10_000);
    advance(4000);
    timer.freeze();
    const frozen = timer.remainingMs();
    advance(60_000);
    expect(timer.remainingMs()).toBe(frozen);
    timer.resume();
    advance(1000);
    expect(timer.remainingMs()).toBe(frozen - 1000);
  });

  it('notifies subscribers on a 250 ms cadence while armed', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    const seen: number[] = [];
    timer.subscribe((ms) => seen.push(ms));
    timer.arm(2000);
    advance(1000);
    expect(seen.length).toBe(4);
    expect(seen[3]).toBe(1000);
  });

  it('re-arming resets the expiry guard (new session, new deadline)', () => {
    const { clock, advance } = fakeClock();
    const timer = createTimer(clock);
    let fired = 0;
    timer.onExpire(() => fired++);
    timer.arm(500);
    advance(1000);
    expect(fired).toBe(1);
    timer.arm(500);
    advance(1000);
    expect(fired).toBe(2);
  });
});
