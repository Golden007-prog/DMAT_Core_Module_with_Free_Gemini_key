/** Injectable clock: monotonic time drives the countdown (immune to system
 *  clock changes); wall time is used only for persistence reconciliation. */
export interface Clock {
  now(): number;
  wallNow(): number;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
}

export const realClock: Clock = {
  now: () => performance.now(),
  wallNow: () => Date.now(),
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
};

const TICK_MS = 250;

export interface Timer {
  /** Start counting down `durationMs` from now. Resets the expiry guard. */
  arm(durationMs: number): void;
  disarm(): void;
  /** Practice-mode pause. Exam mode never calls this. */
  freeze(): void;
  resume(): void;
  isArmed(): boolean;
  remainingMs(): number;
  subscribe(cb: (remainingMs: number) => void): () => void;
  onExpire(cb: () => void): void;
}

/**
 * Deadline-based countdown (R4): stores a monotonic deadline and renders
 * max(0, deadline − now()) on a 250 ms tick — never accumulates interval
 * decrements, so jittery ticks cannot drift. Expiry fires exactly once per
 * arming.
 */
export function createTimer(clock: Clock = realClock): Timer {
  let deadline: number | null = null;
  let frozenRemaining: number | null = null;
  let expired = false;
  let intervalId: number | null = null;
  const subscribers = new Set<(ms: number) => void>();
  const expireCbs = new Set<() => void>();

  function remainingMs(): number {
    if (frozenRemaining !== null) return frozenRemaining;
    if (deadline === null) return 0;
    return Math.max(0, deadline - clock.now());
  }

  function stopTicking() {
    if (intervalId !== null) {
      clock.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    const remaining = remainingMs();
    for (const cb of subscribers) cb(remaining);
    if (remaining <= 0 && !expired) {
      expired = true; // idempotent guard: time-up → auto-submit exactly once
      stopTicking();
      for (const cb of expireCbs) cb();
    }
  }

  function startTicking() {
    stopTicking();
    intervalId = clock.setInterval(tick, TICK_MS);
  }

  return {
    arm(durationMs) {
      deadline = clock.now() + durationMs;
      frozenRemaining = null;
      expired = false;
      startTicking();
    },
    disarm() {
      deadline = null;
      frozenRemaining = null;
      expired = false;
      stopTicking();
    },
    freeze() {
      if (deadline === null || frozenRemaining !== null) return;
      frozenRemaining = Math.max(0, deadline - clock.now());
      stopTicking();
    },
    resume() {
      if (frozenRemaining === null) return;
      deadline = clock.now() + frozenRemaining;
      frozenRemaining = null;
      startTicking();
    },
    isArmed() {
      return deadline !== null && frozenRemaining === null;
    },
    remainingMs,
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    onExpire(cb) {
      expireCbs.add(cb);
    },
  };
}
