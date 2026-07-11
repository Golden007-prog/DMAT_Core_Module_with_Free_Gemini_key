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
  /** Spend per model, because the models do not share a ceiling. The chain leads
   *  with an uncapped model and escalates into two that Google caps at 20
   *  requests/day, so one global counter can only ever be wrong for one of them:
   *  set it to the cap and it throttles the uncapped lead; set it to the lead's
   *  headroom and it cannot see a capped fallback being drained. Each model is
   *  therefore billed against its OWN catalogue cap (see freeRequestCap). */
  perModel: Record<string, number>;
}

const emptyUsage = (): Usage => ({ date: todayKey(), count: 0, perModel: {} });

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
      // perModel is absent in rows written before it existed: an old row is a
      // valid row with no per-model detail, never a reason to drop the count
      const perModel =
        typeof parsed.perModel === 'object' && parsed.perModel !== null ? parsed.perModel : {};
      return { date: parsed.date, count: parsed.count, perModel };
    }
  } catch {
    /* absent or corrupt → today starts at zero */
  }
  return emptyUsage();
}

let memory: Usage = emptyUsage();

function usageToday(): Usage {
  const stored = readStored();
  if (stored) memory = stored;
  else if (memory.date !== todayKey()) memory = emptyUsage();
  return memory;
}

export function getUsageToday(): number {
  return usageToday().count;
}

/** How many times this model has ANSWERED today. Compared against the model's own
 *  measured cap, it is what stops the chain spending a round-trip (and a 429 we
 *  could have predicted) on a bucket we know is empty. */
export function getModelUsageToday(model: string): number {
  return usageToday().perModel[model] ?? 0;
}

export function incrementUsage(model?: string): void {
  const current = usageToday();
  const perModel = { ...current.perModel };
  if (model) perModel[model] = (perModel[model] ?? 0) + 1;
  memory = { date: todayKey(), count: current.count + 1, perModel };
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
  memory = emptyUsage();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing persisted to clear */
  }
}
