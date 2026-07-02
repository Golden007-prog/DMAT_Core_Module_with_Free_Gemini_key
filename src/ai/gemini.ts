import { assertBudget, incrementUsage } from './aiUsage';
import { DEFAULT_AI_DAILY_BUDGET } from '../state/settingsStore';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiUnavailableError extends Error {
  constructor(message = 'AI unavailable — all models in the chain failed.') {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

/** Model discovery: which chain entries actually exist for this key. */
export async function listAvailableModels(key: string): Promise<string[]> {
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(key)}&pageSize=200`);
  if (!res.ok) throw new Error(`model list failed (${res.status}) — check the API key`);
  const body = (await res.json()) as { models?: Array<{ name: string }> };
  return (body.models ?? []).map((m) => m.name.replace(/^models\//, ''));
}

export interface GenerateJsonOpts {
  key: string;
  modelChain: string[];
  prompt: string;
  /** Gemini responseSchema (JSON Schema subset) — forces application/json output */
  schema: object;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** test hook — production uses 1000 ms base */
  backoffBaseMs?: number;
  dailyBudget?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function combineSignals(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * §6 client rules: JSON-schema-constrained call; on 429/5xx retry ×3 with
 * exponential backoff + jitter; then fall down the MODEL_CHAIN; on chain
 * exhaustion throw (callers fall back to the deterministic generator and show
 * a quiet toast — never a blocking error dialog). Budget checked before the
 * call, spent only on success.
 */
export async function generateJson<T>(opts: GenerateJsonOpts): Promise<T> {
  assertBudget(opts.dailyBudget ?? DEFAULT_AI_DAILY_BUDGET);
  const backoffBase = opts.backoffBaseMs ?? 1000;
  const timeoutMs = opts.timeoutMs ?? 20_000;

  for (const model of opts.modelChain) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (opts.signal?.aborted) throw new GeminiUnavailableError('aborted');
      let res: Response;
      try {
        res = await fetch(
          `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: combineSignals(timeoutMs, opts.signal),
            body: JSON.stringify({
              contents: [{ parts: [{ text: opts.prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: opts.schema,
              },
            }),
          },
        );
      } catch {
        break; // network/timeout/abort on this model → try the next one
      }

      if (res.ok) {
        try {
          const body = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text !== 'string') break;
          const parsed = JSON.parse(text) as T;
          incrementUsage();
          return parsed;
        } catch {
          break; // unparseable response → next model
        }
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt < 2) {
          await sleep(backoffBase * 2 ** attempt + Math.random() * backoffBase * 0.25);
        }
        continue;
      }
      break; // other 4xx (bad model name, key problem) → next model
    }
  }
  throw new GeminiUnavailableError();
}
