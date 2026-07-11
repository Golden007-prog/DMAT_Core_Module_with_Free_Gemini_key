import { assertBudget, incrementUsage } from './aiUsage';
import { toGeminiSchema } from './geminiSchema';
import { DEFAULT_AI_DAILY_BUDGET } from '../state/settingsStore';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Why the call failed. Branch on this, never on the HTTP status: Google returns
 *  an invalid key as a **400**, not a 401/403, so status alone cannot tell a dead
 *  key apart from a dead model — which is how one bad key used to look exactly
 *  like quota exhaustion, CORS and a typo'd model name. */
export type GeminiErrorKind =
  | 'invalid-key'
  | 'key-restricted'
  | 'free-tier-unavailable'
  | 'model-not-found'
  | 'quota-exceeded'
  | 'safety-blocked'
  | 'truncated'
  | 'invalid-json'
  | 'bad-request'
  | 'network'
  | 'timeout'
  | 'server'
  | 'aborted'
  /** local misconfiguration, not a Gemini failure: the chain has no models in it,
   *  so no request was ever made and blaming the key or the quota would misdirect */
  | 'empty-chain'
  | 'unknown';

/** Failures no other model in the chain can rescue: the key, the country and the
 *  prompt are identical for every model, so retrying just burns round-trips. */
const FATAL: ReadonlySet<GeminiErrorKind> = new Set<GeminiErrorKind>([
  'invalid-key',
  'key-restricted',
  'free-tier-unavailable',
  'safety-blocked',
]);

export interface GeminiErrorInfo {
  kind: GeminiErrorKind;
  httpStatus?: number;
  /** Google's own error.message, verbatim — the detail a user can act on. */
  apiMessage?: string;
  model?: string;
  retryAfterSec?: number;
}

/** Plain-language cause + the fix, in one sentence. Rendered directly by
 *  Settings, ExplainWithAi, CoachCard and the equation toast. */
export function geminiErrorMessage(info: GeminiErrorInfo): string {
  switch (info.kind) {
    case 'invalid-key':
      return 'That key was rejected. Paste the key from aistudio.google.com/apikey.';
    case 'key-restricted':
      return 'This key is restricted and blocked the call from this site. Remove its HTTP-referrer/website restriction in Google Cloud Console, or create a fresh unrestricted key in AI Studio.';
    case 'free-tier-unavailable':
      return 'The Gemini free tier is not available in your country — this key needs billing enabled on its Google Cloud project.';
    case 'model-not-found':
      return `No model named ${info.model ?? 'that'} exists for this key — fix the model chain in Settings.`;
    case 'quota-exceeded':
      return 'Free-tier daily limit reached; it resets at midnight Pacific.';
    case 'safety-blocked':
      return 'Gemini blocked this request under its safety filters.';
    case 'truncated':
      return 'Gemini ran out of output tokens before finishing the answer.';
    case 'invalid-json':
      return 'Gemini returned text that was not valid JSON.';
    case 'bad-request':
      return `Gemini rejected the request${info.apiMessage ? `: ${info.apiMessage}` : '.'}`;
    case 'network':
      return 'Could not reach Gemini — check your connection.';
    case 'timeout':
      return 'Gemini took too long to answer.';
    case 'server':
      return 'Gemini is having problems right now — try again shortly.';
    case 'aborted':
      return 'AI request cancelled.';
    case 'empty-chain':
      return 'The model chain in Settings is empty — add a model, or press "Use the recommended chain".';
    default:
      return 'AI unavailable — all models in the chain failed.';
  }
}

export class GeminiUnavailableError extends Error {
  readonly kind: GeminiErrorKind;
  readonly httpStatus?: number;
  readonly apiMessage?: string;
  readonly model?: string;
  readonly retryAfterSec?: number;

  constructor(info: GeminiErrorInfo) {
    super(geminiErrorMessage(info));
    this.name = 'GeminiUnavailableError';
    this.kind = info.kind;
    this.httpStatus = info.httpStatus;
    this.apiMessage = info.apiMessage;
    this.model = info.model;
    this.retryAfterSec = info.retryAfterSec;
  }
}

interface GoogleErrorEnvelope {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ reason?: string }>;
  };
}

/** Read the body — the whole point. Google's envelope carries the only fields
 *  that separate a dead key from a dead model: `error.status` and the ErrorInfo
 *  `reason`. A non-JSON body (an HTML error page from a proxy) still yields the
 *  status, which is more than the old code kept. */
async function classifyResponse(res: Response, model: string): Promise<GeminiErrorInfo> {
  const raw = await res.text().catch(() => '');
  let err: GoogleErrorEnvelope['error'];
  try {
    err = (JSON.parse(raw) as GoogleErrorEnvelope).error;
  } catch {
    /* not JSON → status-only classification below */
  }
  const reason = err?.details?.find((d) => typeof d.reason === 'string')?.reason;
  const apiMessage = err?.message ?? (raw ? raw.slice(0, 300) : undefined);
  const retryAfterSec = Number(res.headers.get('retry-after')) || undefined;

  let kind: GeminiErrorKind;
  if (reason === 'API_KEY_INVALID') kind = 'invalid-key';
  else if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || res.status === 403) kind = 'key-restricted';
  else if (err?.status === 'FAILED_PRECONDITION') kind = 'free-tier-unavailable';
  else if (res.status === 404) kind = 'model-not-found';
  else if (res.status === 429) kind = 'quota-exceeded';
  else if (res.status >= 500) kind = 'server';
  else if (res.status === 400) kind = 'bad-request';
  else kind = 'unknown';

  return { kind, httpStatus: res.status, apiMessage, model, retryAfterSec };
}

interface GenerateContentBody {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

/** A 200 is not a success: the model can stop on MAX_TOKENS or SAFETY and send
 *  back a candidate with no parts at all. Those used to be indistinguishable
 *  from a crash. */
function readCandidate<T>(body: GenerateContentBody, model: string): { value: T } | { error: GeminiErrorInfo } {
  if (body.promptFeedback?.blockReason) {
    return {
      error: { kind: 'safety-blocked', model, apiMessage: body.promptFeedback.blockReason },
    };
  }
  const candidate = body.candidates?.[0];
  const finish = candidate?.finishReason;
  const text = candidate?.content?.parts?.[0]?.text;

  if (typeof text !== 'string') {
    if (finish === 'MAX_TOKENS') return { error: { kind: 'truncated', model } };
    if (finish === 'SAFETY' || finish === 'RECITATION') {
      return { error: { kind: 'safety-blocked', model, apiMessage: finish } };
    }
    return { error: { kind: 'unknown', model, apiMessage: finish } };
  }

  try {
    return { value: JSON.parse(text) as T };
  } catch {
    // partial JSON is the tell-tale of a cut-off stream, not of a broken model
    if (finish === 'MAX_TOKENS') return { error: { kind: 'truncated', model } };
    return { error: { kind: 'invalid-json', model } };
  }
}

export interface GenerateJsonOpts {
  key: string;
  modelChain: string[];
  prompt: string;
  /** JSON Schema as authored in prompts.ts — normalised to Gemini's dialect here */
  schema: object;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** test hook — production uses 1000 ms base */
  backoffBaseMs?: number;
  dailyBudget?: number;
  /** Output cap, default 8192. It is NOT safe to leave this unset and trust the
   *  model default: measured 2026-07-11, a 20-system batch on gemini-2.5-flash
   *  spent 7,860 tokens *thinking*, ate the default budget from the inside and
   *  came back finishReason=MAX_TOKENS with unparseable JSON. The same batch
   *  needs ~1,900 output tokens with thinking off, so 8192 is deep headroom. */
  maxOutputTokens?: number;
  /** Thinking tokens the model may spend before it writes a character, default 0
   *  (off). Thinking is ON by default on every 2.5/3.x Flash tier and it is what
   *  broke this client: measured, the same 20-system batch took 32.9 s with
   *  thinking on and 16.6 s with it off — the slower models simply blew the
   *  client timeout or the output budget. Raise it only for short, quality-
   *  sensitive single-item calls, and only if the model can still answer inside
   *  timeoutMs. */
  thinkingBudget?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** AbortSignal.any lands only in Safari 17.4 — using it would have thrown a
 *  TypeError inside the try and killed every AI feature on older Safari with the
 *  same opaque message. Hand-rolled so the fallback path stays observable. */
function combineSignals(timeoutMs: number, signal?: AbortSignal): { signal: AbortSignal; done(): void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

/** Did the request die on OUR clock rather than on the network? combineSignals
 *  aborts with a DOMException named TimeoutError, and fetch rejects with that
 *  same reason — but a mocked or older fetch may reject with a bare AbortError
 *  instead, so the signal's own reason is checked too. The distinction matters:
 *  a timeout is a slow model and deserves a second try, a network error is a
 *  dead route and does not. */
function nameOf(v: unknown): string | undefined {
  return typeof v === 'object' && v !== null && 'name' in v
    ? String((v as { name: unknown }).name)
    : undefined;
}

function isTimeout(thrown: unknown, signal: AbortSignal): boolean {
  return nameOf(thrown) === 'TimeoutError' || nameOf(signal.reason) === 'TimeoutError';
}

/** Retry-After on a free-tier 429 runs to tens of seconds — far longer than a
 *  practice session can block, and the deterministic generator is the better
 *  answer by then. So it is carried on the error for the UI to show, never slept
 *  on; the retry itself stays on the bounded backoff. */
const retryDelayMs = (base: number, attempt: number) =>
  base * 2 ** attempt + Math.random() * base * 0.25;

/**
 * §6 client rules: JSON-schema-constrained call; retry with exponential backoff
 * + jitter, then fall down the MODEL_CHAIN; on chain exhaustion throw (callers
 * fall back to the deterministic generator and show a quiet toast — never a
 * blocking error dialog). Budget checked before the call, spent only on success.
 *
 * Retry policy is not uniform, because 429 and 5xx do not mean the same thing.
 * A 5xx is that model's backend having a bad moment, so a backoff can genuinely
 * rescue it. A 429 is a quota bucket that is empty and will stay empty for
 * seconds-to-hours — but every model in the chain has its OWN bucket, so the
 * next model is a far better bet than sleeping. Sleeping three times on the
 * first model's 429 (the free-tier norm on the newest Flash tiers) buys nothing
 * and costs ~3 s of dead latency on every single AI call. So a 429 advances
 * immediately while a next model exists, and only backs off on the last one,
 * where there is nothing left to advance to.
 *
 * A timeout is retried once on the SAME model before the chain advances: the
 * models are slow, not dead, and burning the next model's quota on a single
 * slow round-trip is how a working key ends up reading "AI unavailable".
 *
 * Every request pins generationConfig.thinkingConfig — see thinkingBudget.
 *
 * The thrown GeminiUnavailableError carries {kind, httpStatus, apiMessage,
 * model} — R7 still holds (AI never gates), but a failure is finally
 * diagnosable instead of being one generic line for six different causes.
 */
export async function generateJson<T>(opts: GenerateJsonOpts): Promise<T> {
  assertBudget(opts.dailyBudget ?? DEFAULT_AI_DAILY_BUDGET);
  const backoffBase = opts.backoffBaseMs ?? 1000;
  // 20 s used to cut off a healthy model mid-answer: measured, the frontier
  // free-tier model needs 16.6 s on a full batch even with thinking disabled.
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;
  const thinkingBudget = opts.thinkingBudget ?? 0;
  const responseSchema = toGeminiSchema(opts.schema);

  // An empty chain makes zero requests, so no model can fail and `last` would
  // still hold its initialiser — the generic "all models failed" line, which
  // sends the user hunting through their key and their quota for a fault that
  // is neither. Name the real cause instead.
  if (opts.modelChain.length === 0) throw new GeminiUnavailableError({ kind: 'empty-chain' });

  let last: GeminiErrorInfo = { kind: 'unknown' };

  for (let m = 0; m < opts.modelChain.length; m++) {
    const model = opts.modelChain[m];
    const isLastModel = m === opts.modelChain.length - 1;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (opts.signal?.aborted) throw new GeminiUnavailableError({ kind: 'aborted' });

      const combined = combineSignals(timeoutMs, opts.signal);
      let res: Response | null = null;
      let thrown: unknown;
      try {
        res = await fetch(
          `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: combined.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: opts.prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema,
                maxOutputTokens,
                // Sent on every call, never omitted: leaving it out is what let
                // the model think for thousands of tokens and miss the deadline.
                thinkingConfig: { thinkingBudget },
              },
            }),
          },
        );
      } catch (e) {
        /* classified below: a timeout is ours to recognise (we set the reason),
           everything else the browser deliberately blurs — DNS, CORS and a
           refused connection are one indistinguishable TypeError */
        thrown = e;
      } finally {
        combined.done();
      }

      if (!res) {
        if (opts.signal?.aborted) throw new GeminiUnavailableError({ kind: 'aborted' });

        if (isTimeout(thrown, combined.signal)) {
          last = { kind: 'timeout', model };
          // a slow first answer is not a dead model — give it one more go before
          // spending the next model's quota
          if (attempt < 1) continue;
          break;
        }

        last = { kind: 'network', model };
        break; // no point retrying the same dead route → next model
      }

      if (res.ok) {
        const outcome = readCandidate<T>(
          (await res.json().catch(() => ({}))) as GenerateContentBody,
          model,
        );
        if ('value' in outcome) {
          incrementUsage();
          return outcome.value;
        }
        last = outcome.error;
        if (FATAL.has(last.kind)) throw new GeminiUnavailableError(last);
        break;
      }

      last = await classifyResponse(res, model);
      // a dead key is dead on every model — failing fast here is the difference
      // between one round-trip and nine
      if (FATAL.has(last.kind)) throw new GeminiUnavailableError(last);

      // an empty quota bucket is this model's alone — hand the call to the next
      // model rather than sleeping out a backoff that cannot refill it
      if (last.kind === 'quota-exceeded' && !isLastModel) break;

      if (last.kind === 'quota-exceeded' || last.kind === 'server') {
        if (attempt < 2) {
          await sleep(retryDelayMs(backoffBase, attempt));
          continue;
        }
      }
      break; // 404 / 400 / retries exhausted → next model
    }
  }
  throw new GeminiUnavailableError(last);
}

/** Model discovery: which chain entries actually exist for this key, and can
 *  actually generate — an embedding-only model listing is not a usable chain
 *  entry. Paginated because ListModels caps its own page size. */
export async function listAvailableModels(key: string): Promise<string[]> {
  const names: string[] = [];
  let pageToken = '';

  for (let page = 0; page < 5; page++) {
    const url = `${BASE}/models?key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new GeminiUnavailableError({ kind: 'network' });
    }
    if (!res.ok) throw new GeminiUnavailableError(await classifyResponse(res, 'models.list'));

    const body = (await res.json().catch(() => ({}))) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      nextPageToken?: string;
    };
    for (const m of body.models ?? []) {
      if (!m.name || !m.supportedGenerationMethods?.includes('generateContent')) continue;
      names.push(m.name.replace(/^models\//, ''));
    }
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return names;
}
