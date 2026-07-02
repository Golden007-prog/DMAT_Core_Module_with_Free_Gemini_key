/** Client-side daily budget guard: a heavy practice day must never burn the
 *  user's whole free-tier quota (§6). */
const STORAGE_KEY = 'coreforge-ai-usage';

export class BudgetExceededError extends Error {
  constructor(budget: number) {
    super(`Daily AI budget of ${budget} calls reached — using the built-in generator until tomorrow.`);
    this.name = 'BudgetExceededError';
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): { date: string; count: number } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; count: number };
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    /* storage unavailable → in-memory day only */
  }
  return { date: todayKey(), count: 0 };
}

let memory = read();

function write() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* fine — memory copy still guards this tab */
  }
}

export function getUsageToday(): number {
  if (memory.date !== todayKey()) memory = { date: todayKey(), count: 0 };
  return memory.count;
}

export function incrementUsage(): void {
  getUsageToday();
  memory.count++;
  write();
}

export function assertBudget(dailyBudget: number): void {
  if (getUsageToday() >= dailyBudget) throw new BudgetExceededError(dailyBudget);
}

export function resetUsageForTests(): void {
  memory = { date: todayKey(), count: 0 };
  write();
}
