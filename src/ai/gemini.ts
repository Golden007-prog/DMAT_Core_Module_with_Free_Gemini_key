import { assertBudget, getModelUsageToday, incrementUsage } from './aiUsage';
import { toGeminiSchema } from './geminiSchema';
import { catalogEntry, freeRequestCap, isBillingOnly } from './modelCatalog';
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
  /** the day's bucket is empty — it refills at midnight Pacific, so nothing this
   *  session does can bring it back */
  | 'quota-exceeded'
  /** a 429 that names a PER-MINUTE quota: the same status and the same
   *  RESOURCE_EXHAUSTED as a spent day, but it clears in seconds. Only the
   *  QuotaFailure detail in the body says which window was violated, and the
   *  difference decides whether to sleep on this model or to spend one of a capped
   *  fallback's twenty daily requests on a throttle that was about to lift. */
  | 'rate-limited'
  /** 429 from a model the catalogue knows is billing-only. Google returns the
   *  IDENTICAL RESOURCE_EXHAUSTED for "your free quota is spent" and "this model
   *  needs billing", so the status can never tell them apart — only the registry
   *  can, and the two need opposite advice: wait vs. never retry. */
  | 'needs-billing'
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
 *  prompt are identical for every model, so retrying just burns round-trips.
 *
 *  'needs-billing' is deliberately NOT here, and that is the whole distinction the
 *  catalogue exists to make. A billing wall is fatal to ONE MODEL, not to the
 *  chain: tier is a per-model property, and the models behind a billing-walled one
 *  have their own — a user whose chain reads gemini-2.5-pro, gemini-3.1-flash-lite
 *  has a perfectly healthy free model sitting one slot back. Treating it as fatal
 *  threw out of the loop on the first 429 and killed the AI outright while telling
 *  the user to fix their billing. So it ends the model (no backoff: a wall is not
 *  a bucket that refills) and advances, and its message is only what the user sees
 *  when EVERY model in the chain was walled. */
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
    case 'model-not-found': {
      // a retired ID 404s for a reason we already know — say it, instead of
      // sending the user to check a chain they never typed
      if (info.model && catalogEntry(info.model)?.status === 'retired') {
        return `${info.model} is no longer available to new keys — pick a current model in Settings.`;
      }
      return `No model named ${info.model ?? 'that'} exists for this key — fix the model chain in Settings.`;
    }
    case 'quota-exceeded': {
      // naming the measured cap is the difference between "try later" and
      // "stop putting this model first"
      const cap = info.model ? freeRequestCap(info.model) : undefined;
      if (cap !== undefined) {
        return `${info.model} is capped at ${cap} requests/day on the free tier; it resets at midnight Pacific.`;
      }
      return 'Free-tier daily limit reached; it resets at midnight Pacific.';
    }
    case 'rate-limited':
      return `Gemini is throttling this key by the minute${
        info.retryAfterSec ? ` (retry in about ${Math.ceil(info.retryAfterSec)} s)` : ''
      } — the daily quota is fine, so try again shortly.`;
    case 'needs-billing':
      return `${info.model ?? 'That model'} requires billing on your Google Cloud project — pick a free-tier model in Settings.`;
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

/** The `details` array is a heterogeneous list of google.rpc types, discriminated
 *  by '@type'. Three of them matter here: ErrorInfo carries `reason` (the only
 *  thing that separates a dead key from a malformed body, since Google returns an
 *  invalid key as a 400), QuotaFailure names the quota that was actually violated,
 *  and RetryInfo carries the delay — which the REST API puts in the BODY and not
 *  in a Retry-After header. */
interface GoogleErrorDetail {
  '@type'?: string;
  reason?: string;
  violations?: Array<{ quotaId?: string; quotaMetric?: string; quotaDimensions?: unknown }>;
  retryDelay?: string;
}

interface GoogleErrorEnvelope {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GoogleErrorDetail[];
  };
}

/** RetryInfo.retryDelay is a protobuf Duration serialised as "38s" / "1.5s". */
function parseRetryDelay(value: string | undefined): number | undefined {
  const m = value ? /^([\d.]+)s$/.exec(value.trim()) : null;
  const sec = m ? Number(m[1]) : NaN;
  return Number.isFinite(sec) && sec > 0 ? sec : undefined;
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
  const details = err?.details ?? [];
  const isType = (d: GoogleErrorDetail, name: string) => (d['@type'] ?? '').endsWith(name);
  const reason = details.find((d) => typeof d.reason === 'string')?.reason;
  const apiMessage = err?.message ?? (raw ? raw.slice(0, 300) : undefined);

  // Which quota bucket was violated — the second half of the 429 puzzle. `tier`
  // says whether the wall is billing; this says whether the bucket refills in
  // sixty seconds or at midnight Pacific, and the two demand opposite handling.
  const violated = details
    .filter((d) => isType(d, 'QuotaFailure'))
    .flatMap((d) => d.violations ?? [])
    .map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`)
    .join(' ');
  const perMinute = /per[\s_-]*minute/i.test(violated);
  const perDay = /per[\s_-]*day/i.test(violated);

  // Retry-After is what a proxy sets; the Gemini REST API puts RetryInfo in the
  // body instead, so reading only the header found nothing on a real 429.
  const retryAfterSec =
    Number(res.headers.get('retry-after')) ||
    parseRetryDelay(details.find((d) => isType(d, 'RetryInfo'))?.retryDelay);

  let kind: GeminiErrorKind;
  if (reason === 'API_KEY_INVALID') kind = 'invalid-key';
  else if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || res.status === 403) kind = 'key-restricted';
  else if (err?.status === 'FAILED_PRECONDITION') kind = 'free-tier-unavailable';
  else if (res.status === 404) kind = 'model-not-found';
  // the one branch the HTTP status cannot decide on its own: a billing-walled
  // model, a spent day and a per-minute throttle all return 429 RESOURCE_EXHAUSTED,
  // verbatim. The registry knows the tier and the body names the window; the status
  // never will. A day that is spent wins over a minute that is: when both are
  // reported, waiting out the minute changes nothing.
  else if (res.status === 429) {
    kind = isBillingOnly(model)
      ? 'needs-billing'
      : perMinute && !perDay
        ? 'rate-limited'
        : 'quota-exceeded';
  } else if (res.status >= 500) kind = 'server';
  else if (res.status === 400) kind = 'bad-request';
  else kind = 'unknown';

  return { kind, httpStatus: res.status, apiMessage, model, retryAfterSec: retryAfterSec || undefined };
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
 * Retry policy is not uniform, because a 429 and a 5xx do not mean the same
 * thing — and neither do two 429s. A 5xx is that model's backend having a bad
 * moment, so a backoff can genuinely rescue it. A 429 is one of THREE different
 * failures wearing the same status, and the catalogue plus the QuotaFailure
 * detail are what tell them apart:
 *
 *   spent day       every model has its OWN daily bucket, so the next model is a
 *                   far better bet than sleeping. Sleeping three times on the
 *                   first model's 429 buys nothing and costs ~3 s of dead latency
 *                   on every AI call. It advances immediately while a next model
 *                   exists, and backs off only on the last one — unless the
 *                   catalogue knows that model has a daily cap (20/day on
 *                   gemini-3.5-flash and gemini-3-flash-preview), in which case
 *                   the bucket refills at midnight Pacific and no backoff helps.
 *   per-minute      the body's QuotaFailure names the window. This one clears in
 *                   seconds, so it backs off on the SAME model. Advancing on it
 *                   would spend one of a capped fallback's twenty daily requests
 *                   to dodge a throttle that was about to lift on its own.
 *   billing wall    not a bucket at all. No backoff (nothing refills) — but the
 *                   models BEHIND it have their own tier, so the chain advances.
 *                   One round-trip against the wall, not nine, and not the death
 *                   of the whole chain.
 *
 * A model whose measured daily cap is already spent (per-model ledger in
 * aiUsage) is skipped without a request: the 429 is predictable, so the
 * round-trip is pure latency.
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

    // A model we have already spent today's twenty requests on will answer 429
    // and nothing else. Asking anyway costs a round-trip to be told what the
    // ledger already knows, so skip it and keep the latency for a model that can
    // actually answer. (Only the capped models have a cap to spend — the lead has
    // none, so this never throttles it; that is the whole point of a per-model
    // ledger rather than one global counter.)
    const cap = freeRequestCap(model);
    if (cap !== undefined && getModelUsageToday(model) >= cap) {
      last = { kind: 'quota-exceeded', model };
      continue;
    }

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
          incrementUsage(model);
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

      // A billing wall ends THIS model and nothing more. No backoff — a wall does
      // not refill — but the next model has its own tier and may well be free and
      // healthy, so the chain goes on. Throwing here (as this code briefly did)
      // killed the AI for every user whose chain merely CONTAINED a Pro model, and
      // blamed their billing for it.
      if (last.kind === 'needs-billing') break;

      // A per-minute throttle is the one 429 a short sleep really does clear. The
      // retryDelay Google sends runs to tens of seconds, which is longer than a
      // practice session will wait, so it is carried on the error for the UI and
      // never slept on; the bounded backoff is tried instead. If 1 s + 2 s does
      // not clear it, only then is a fallback's scarce 20/day worth spending.
      if (last.kind === 'rate-limited') {
        if (attempt < 2) {
          await sleep(retryDelayMs(backoffBase, attempt));
          continue;
        }
        break;
      }

      // an empty quota bucket is this model's alone — hand the call to the next
      // model rather than sleeping out a backoff that cannot refill it.
      // On a model with a MEASURED daily cap (20/day on the 3.x Flash tiers) that
      // holds even as the last model: the bucket refills at midnight Pacific, so
      // 1s/2s/4s of backoff buys nothing but three seconds of dead latency.
      const dailyCapped = last.kind === 'quota-exceeded' && cap !== undefined;
      if (last.kind === 'quota-exceeded' && (!isLastModel || dailyCapped)) break;

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
