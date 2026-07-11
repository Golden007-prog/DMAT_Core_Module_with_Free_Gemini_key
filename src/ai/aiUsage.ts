/** Client-side daily budget guard: a heavy practice day must never burn the
 *  user's whole free-tier quota (§6). */
const STORAGE_KEY = 'coreforge-ai-usage';

export class BudgetExceededError extends Error {
  constructor(budget: number) {
    super(`Daily AI budget of ${budget} calls reached — using the built-in generator until tomorrow.`);
    this.name = 'BudgetExceededError';
  }
}

/** Local calendar day, not UTC: at UTC+5:30 the old key rolled over at 05:30
 *  local, so a midnight session silently spent "yesterday's" budget. Google's own
 *  free-tier quota resets on Pacific midnight — no client window can match that,
 *  so the user's own day is the honest one to bill against. */
function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Usage {
  date: string;
  count: number;
}

/** null only when storage itself is unusable (private mode) — then the in-memory
 *  copy is all there is. Otherwise every read goes to disk, so two open tabs share
 *  one counter instead of clobbering each other's whole-object writes. */
function readStored(): Usage | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw ?? '') as Partial<Usage>;
    if (parsed.date === todayKey() && typeof parsed.count === 'number') {
      return { date: parsed.date, count: parsed.count };
    }
  } catch {
    /* absent or corrupt → today starts at zero */
  }
  return { date: todayKey(), count: 0 };
}

let memory: Usage = { date: todayKey(), count: 0 };

export function getUsageToday(): number {
  const stored = readStored();
  if (stored) memory = stored;
  else if (memory.date !== todayKey()) memory = { date: todayKey(), count: 0 };
  return memory.count;
}

export function incrementUsage(): void {
  memory = { date: todayKey(), count: getUsageToday() + 1 };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* fine — the memory copy still guards this tab */
  }
}

export function assertBudget(dailyBudget: number): void {
  if (getUsageToday() >= dailyBudget) throw new BudgetExceededError(dailyBudget);
}

export function resetUsageForTests(): void {
  memory = { date: todayKey(), count: 0 };
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing persisted to clear */
  }
}
