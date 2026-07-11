import { generateJson, listAvailableModels, GeminiUnavailableError } from '../../ai/gemini';
import { toGeminiSchema } from '../../ai/geminiSchema';
import {
  resetUsageForTests,
  getUsageToday,
  getModelUsageToday,
  BudgetExceededError,
} from '../../ai/aiUsage';
import {
  useSettings,
  DEFAULT_MODEL_CHAIN,
  DEFAULT_AI_DAILY_BUDGET,
  RETIRED_MODEL_IDS,
  RECOMMENDED_MODEL_PREFERENCE,
} from '../../state/settingsStore';
import { freeRequestCap } from '../../ai/modelCatalog';

const okBody = (text: string, finishReason = 'STOP') => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});

/** Google's error envelope. An invalid key arrives as a 400, not a 401/403 — only
 *  details[].reason separates it from a malformed body, which is exactly why the
 *  old status-only branching burned the whole chain on a dead key. */
const errBody = (code: number, status: string, reason?: string, message = 'nope') => ({
  error: {
    code,
    message,
    status,
    details: reason ? [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason }] : [],
  },
});

interface Call {
  url: string;
  init?: RequestInit;
}

/** A step is either a response or a rejection — fetch rejecting with the abort
 *  reason is exactly how a client-side timeout reaches the code under test. */
type FetchStep =
  | { status: number; body?: unknown; headers?: Record<string, string> }
  | { throws: unknown };

function mockFetchSequence(responses: FetchStep[]) {
  let call = 0;
  const calls: Call[] = [];
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses[Math.min(call++, responses.length - 1)];
    if ('throws' in r) throw r.throws;
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: r.headers });
  }) as typeof fetch;
  return calls;
}

/** what combineSignals aborts with, and therefore what fetch rejects with */
const timeoutError = () => new DOMException('timeout', 'TimeoutError');

const sentBody = (c: Call) => JSON.parse(String(c.init?.body)) as Record<string, unknown>;

interface SentConfig {
  responseMimeType: string;
  responseSchema: unknown;
  maxOutputTokens: number;
  thinkingConfig: { thinkingBudget: number };
}
const sentConfig = (c: Call) => sentBody(c).generationConfig as SentConfig;

/** Error.message is non-enumerable, so toMatchObject cannot see it — take the
 *  error itself and assert on its fields. */
async function rejection(p: Promise<unknown>): Promise<GeminiUnavailableError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(GeminiUnavailableError);
    return e as GeminiUnavailableError;
  }
  throw new Error('expected the call to reject');
}

beforeEach(() => {
  resetUsageForTests();
  vi.restoreAllMocks();
});

describe('toGeminiSchema', () => {
  it('uppercases type names recursively', () => {
    expect(
      toGeminiSchema({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            equations: { type: 'array', items: { type: 'string' } },
            solution: { type: 'object', properties: { A: { type: 'integer' } } },
          },
          required: ['equations', 'solution'],
        },
      }),
    ).toEqual({
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          equations: { type: 'ARRAY', items: { type: 'STRING' } },
          solution: { type: 'OBJECT', properties: { A: { type: 'INTEGER' } } },
        },
        required: ['equations', 'solution'],
      },
    });
  });

  it('drops keys the Schema proto does not declare', () => {
    // additionalProperties is a verified hard 400: Unknown name … Cannot find field
    expect(
      toGeminiSchema({
        type: 'object',
        additionalProperties: false,
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        properties: { explanation: { type: 'string', description: 'the tutor text' } },
        required: ['explanation'],
      }),
    ).toEqual({
      type: 'OBJECT',
      properties: { explanation: { type: 'STRING', description: 'the tutor text' } },
      required: ['explanation'],
    });
  });

  it('preserves enum, nullable, items and anyOf, and collapses null unions', () => {
    expect(
      toGeminiSchema({
        type: 'object',
        properties: {
          band: { type: 'string', enum: ['easy', 'hard'], nullable: true },
          note: { type: ['string', 'null'] },
          any: { anyOf: [{ type: 'string' }, { type: 'integer' }] },
        },
      }),
    ).toEqual({
      type: 'OBJECT',
      properties: {
        band: { type: 'STRING', enum: ['easy', 'hard'], nullable: true },
        note: { type: 'STRING', nullable: true },
        any: { anyOf: [{ type: 'STRING' }, { type: 'INTEGER' }] },
      },
    });
  });
});

describe('generateJson', () => {
  // clearing the Settings box used to persist modelChain: [] — the loop then ran
  // zero times, no model failed, and the user was told "all models in the chain
  // failed" and sent hunting through a key and a quota that were both fine
  it('names an empty chain instead of blaming the key: no request, no generic failure', async () => {
    const calls = mockFetchSequence([]);
    const err = await rejection(
      generateJson({ key: 'k', modelChain: [], prompt: 'hi', schema: { type: 'object' } }),
    );
    expect(calls).toHaveLength(0);
    expect(err.kind).toBe('empty-chain');
    expect(err.message).toContain('empty');
    expect(err.message).not.toContain('all models in the chain failed');
    expect(getUsageToday()).toBe(0); // a call that never went out costs no budget
  });

  it('returns parsed JSON from the first model on success', async () => {
    mockFetchSequence([{ status: 200, body: okBody('{"answer": 42}') }]);
    const result = await generateJson<{ answer: number }>({
      key: 'test-key',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ answer: 42 });
    expect(getUsageToday()).toBe(1);
  });

  it('sends the request shape v1beta accepts: JSON POST, uppercase responseSchema', async () => {
    const calls = mockFetchSequence([{ status: 200, body: okBody('{"ok":true}') }]);
    await generateJson({
      key: 'k',
      modelChain: ['model-a'],
      prompt: 'explain this',
      schema: {
        type: 'object',
        properties: { explanation: { type: 'string' } },
        required: ['explanation'],
      },
      backoffBaseMs: 1,
    });

    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(sentBody(calls[0])).toEqual({
      contents: [{ parts: [{ text: 'explain this' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { explanation: { type: 'STRING' } },
          required: ['explanation'],
        },
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  });

  it('keeps a root-array schema unwrapped — v1beta allows array roots', async () => {
    const calls = mockFetchSequence([{ status: 200, body: okBody('[{"equations":[]}]') }]);
    const result = await generateJson<unknown[]>({
      key: 'k',
      modelChain: ['model-a'],
      prompt: 'batch',
      schema: { type: 'array', items: { type: 'object' } },
      backoffBaseMs: 1,
    });
    expect(result).toEqual([{ equations: [] }]);
    expect(sentBody(calls[0])).toMatchObject({
      generationConfig: { responseSchema: { type: 'ARRAY', items: { type: 'OBJECT' } } },
    });
  });

  // Thinking is ON by default on every 2.5/3.x Flash tier, and it is what broke
  // this client: the model spent thousands of tokens reasoning, then either blew
  // the output budget (finishReason=MAX_TOKENS, unparseable JSON) or the client
  // timeout. Both defaults below are the fix, so both are pinned on every call.
  it('disables thinking and pins an output budget on every request', async () => {
    const calls = mockFetchSequence([{ status: 200, body: okBody('{}') }]);
    await generateJson({
      key: 'k',
      modelChain: ['m'],
      prompt: 'p',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(sentConfig(calls[0]).thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(sentConfig(calls[0]).maxOutputTokens).toBe(8192);
  });

  it('lets a caller raise the thinking budget and move the output cap', async () => {
    const calls = mockFetchSequence([{ status: 200, body: okBody('{}') }]);
    await generateJson({
      key: 'k',
      modelChain: ['m'],
      prompt: 'p',
      schema: { type: 'object' },
      backoffBaseMs: 1,
      thinkingBudget: 512,
      maxOutputTokens: 2048,
    });
    expect(sentConfig(calls[0])).toMatchObject({
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 512 },
    });
  });

  it('retries a timeout on the same model before falling through', async () => {
    // a slow first answer is not a dead model — the old code advanced the chain
    // on the first TimeoutError and burned the whole chain on plain slowness
    const calls = mockFetchSequence([
      { throws: timeoutError() },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('model-a'))).toHaveLength(2);
    expect(calls.filter((c) => c.url.includes('model-b'))).toHaveLength(0);
  });

  it('advances to the next model once the timeout retry also times out', async () => {
    const calls = mockFetchSequence([
      { throws: timeoutError() },
      { throws: timeoutError() },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('model-a'))).toHaveLength(2);
    expect(calls.filter((c) => c.url.includes('model-b'))).toHaveLength(1);
  });

  it('reports a chain of timeouts as timeout, not as a network failure', async () => {
    mockFetchSequence([{ throws: timeoutError() }]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('timeout');
    expect(err.message).toBe('Gemini took too long to answer.');
  });

  it('does not retry a genuine network failure — a dead route stays dead', async () => {
    const calls = mockFetchSequence([
      { throws: new TypeError('Failed to fetch') },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('model-a'))).toHaveLength(1);
  });

  it('advances to the next model on a 429 instead of burning the backoff', async () => {
    // every model has its own quota bucket, so sleeping on the first model's 429
    // cannot refill it — a mis-specified lead entry must cost ONE round trip
    const calls = mockFetchSequence([{ status: 429 }, { status: 200, body: okBody('{"ok": true}') }]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('model-a'))).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes('model-b'))).toHaveLength(1);
  });

  it('backs off on a 429 only once the chain has nowhere left to go', async () => {
    const calls = mockFetchSequence([
      { status: 429 },
      { status: 429 },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['only-model'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(3);
  });

  it('still retries a 5xx on a non-last model — a bad backend moment can recover', async () => {
    const calls = mockFetchSequence([
      { status: 500 },
      { status: 500 },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['model-a', 'model-b'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('model-a'))).toHaveLength(3);
    expect(calls.filter((c) => c.url.includes('model-b'))).toHaveLength(0);
  });

  it('reports an exhausted quota with its Retry-After hint', async () => {
    mockFetchSequence([
      {
        status: 429,
        body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'Quota exceeded'),
        headers: { 'retry-after': '42' },
      },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('quota-exceeded');
    expect(err.httpStatus).toBe(429);
    expect(err.retryAfterSec).toBe(42); // surfaced, never slept on
    expect(err.message).toBe('Free-tier daily limit reached; it resets at midnight Pacific.');
  });

  // Google returns the IDENTICAL 429 RESOURCE_EXHAUSTED for "this model needs
  // billing" and "your free quota is spent" — the status can never tell them
  // apart, so the catalogue does. The two need opposite handling: one is a wall,
  // the other refills.
  it('classifies a 429 from a billing-only model as needs-billing and never retries it', async () => {
    const calls = mockFetchSequence([
      { status: 429, body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'Quota exceeded') },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-2.5-pro'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('needs-billing');
    expect(err.httpStatus).toBe(429);
    expect(err.message).toBe(
      'gemini-2.5-pro requires billing on your Google Cloud project — pick a free-tier model in Settings.',
    );
    // one round-trip, not three: a billing wall is not a bucket, so no backoff is
    // ever spent against it
    expect(calls).toHaveLength(1);
  });

  // A billing wall is fatal TO THAT MODEL, never to the chain. Tier is a per-model
  // property: the models behind a walled one have their own, and the live build's
  // free-text chain field means a real user can be holding
  // "gemini-2.5-pro, gemini-3.1-flash-lite" right now. Throwing on the first 429
  // killed their AI outright — and blamed their billing while a healthy free model
  // sat one slot behind, never called.
  it('walks past a billing wall to the free model behind it', async () => {
    const calls = mockFetchSequence([
      { status: 429, body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'Quota exceeded') },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['gemini-2.5-pro', 'gemini-3.1-flash-lite'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    // exactly one round-trip against the wall — no backoff — and then the free model
    expect(calls.filter((c) => c.url.includes('gemini-2.5-pro'))).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes('gemini-3.1-flash-lite'))).toHaveLength(1);
  });

  it('reports needs-billing only when every model in the chain was walled', async () => {
    const calls = mockFetchSequence([
      { status: 429, body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'Quota exceeded') },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-2.5-pro', 'gemini-3.1-pro-preview'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('needs-billing');
    expect(err.model).toBe('gemini-3.1-pro-preview');
    expect(err.message).toContain('requires billing');
    expect(calls).toHaveLength(2); // one each, never a retry
  });

  // The 429's OTHER ambiguity: a per-minute throttle and a spent day arrive with
  // the same status and the same RESOURCE_EXHAUSTED. Only the QuotaFailure detail
  // names the window. Advancing on a throttle that clears in seconds would spend
  // one of a capped fallback's twenty daily requests for nothing.
  const perMinute429 = {
    status: 429,
    body: {
      error: {
        code: 429,
        message: 'Resource has been exhausted (e.g. check quota).',
        status: 'RESOURCE_EXHAUSTED',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [
              {
                quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
                quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
              },
            ],
          },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7s' },
        ],
      },
    },
  };

  it('backs off on the SAME model for a per-minute throttle instead of burning a capped fallback', async () => {
    const calls = mockFetchSequence([perMinute429, { status: 200, body: okBody('{"ok": true}') }]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['gemini-3.1-flash-lite', 'gemini-3-flash-preview'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('gemini-3.1-flash-lite'))).toHaveLength(2);
    // the fallback's 20/day allowance is untouched — the throttle lifted on its own
    expect(calls.filter((c) => c.url.includes('gemini-3-flash-preview'))).toHaveLength(0);
  });

  it('reads the retry delay from RetryInfo in the body, which is where the REST API puts it', async () => {
    mockFetchSequence([perMinute429]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-3.1-flash-lite'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('rate-limited');
    expect(err.retryAfterSec).toBe(7); // surfaced, never slept on
    expect(err.message).toContain('throttling');
    expect(err.message).not.toContain('midnight'); // the DAILY quota is fine
  });

  it('still calls a spent DAY a spent day, even when a per-minute quota is also violated', async () => {
    mockFetchSequence([
      {
        status: 429,
        body: {
          error: {
            status: 'RESOURCE_EXHAUSTED',
            message: 'Quota exceeded',
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [
                  { quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' },
                  { quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' },
                ],
              },
            ],
          },
        },
      },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-3.1-flash-lite'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    // waiting out the minute cannot help when the day is gone
    expect(err.kind).toBe('quota-exceeded');
  });

  it('skips a capped model whose measured 20/day it has already spent — no predictable 429', async () => {
    // 20 successful calls on gemini-3-flash-preview: the catalogue says that is the
    // whole day, so the 21st must not cost a round-trip to be told so
    const first = mockFetchSequence([{ status: 200, body: okBody('{"ok": true}') }]);
    for (let i = 0; i < 20; i++) {
      await generateJson({
        key: 'k',
        modelChain: ['gemini-3-flash-preview'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
        dailyBudget: 100,
      });
    }
    expect(first).toHaveLength(20);

    const calls = mockFetchSequence([{ status: 200, body: okBody('{"ok": true}') }]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
      dailyBudget: 100,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('gemini-3-flash-preview'))).toHaveLength(0);
    expect(calls.filter((c) => c.url.includes('gemini-3.1-flash-lite'))).toHaveLength(1);
    // and the uncapped lead is NOT throttled by that ceiling: it has none
    expect(getModelUsageToday('gemini-3.1-flash-lite')).toBe(1);
  });

  it('does not burn the backoff on a capped free model, even as the last model', async () => {
    // gemini-3.5-flash is capped at 20 requests/day: the bucket refills at midnight
    // Pacific, so 1s/2s/4s of sleeping buys nothing but dead latency
    const calls = mockFetchSequence([
      { status: 429, body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'limit: 20') },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-3.5-flash'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('quota-exceeded');
    expect(calls).toHaveLength(1);
    expect(err.message).toBe(
      'gemini-3.5-flash is capped at 20 requests/day on the free tier; it resets at midnight Pacific.',
    );
  });

  it('falls straight through a capped model to the uncapped one', async () => {
    const calls = mockFetchSequence([
      { status: 429, body: errBody(429, 'RESOURCE_EXHAUSTED', undefined, 'limit: 20') },
      { status: 200, body: okBody('{"ok": true}') },
    ]);
    const result = await generateJson<{ ok: boolean }>({
      key: 'k',
      modelChain: ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
      prompt: 'hi',
      schema: { type: 'object' },
      backoffBaseMs: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes('gemini-3-flash-preview'))).toHaveLength(1);
  });

  it('names a retired model on a 404 instead of blaming the chain in general', async () => {
    mockFetchSequence([{ status: 404, body: errBody(404, 'NOT_FOUND') }]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-2.5-flash-lite'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('model-not-found');
    expect(err.message).toBe(
      'gemini-2.5-flash-lite is no longer available to new keys — pick a current model in Settings.',
    );
  });

  it('fails fast on an invalid key: one call, no retries, no chain fallthrough', async () => {
    const calls = mockFetchSequence([
      {
        status: 400,
        body: errBody(
          400,
          'INVALID_ARGUMENT',
          'API_KEY_INVALID',
          'API key not valid. Please pass a valid API key.',
        ),
      },
    ]);
    const err = await rejection(
      generateJson({
        key: 'bad',
        modelChain: ['model-a', 'model-b', 'model-c'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('invalid-key');
    expect(err.httpStatus).toBe(400);
    expect(err.apiMessage).toBe('API key not valid. Please pass a valid API key.');
    expect(err.message).toBe('That key was rejected. Paste the key from aistudio.google.com/apikey.');
    expect(calls).toHaveLength(1);
  });

  it('fails fast on a referrer-restricted key', async () => {
    const calls = mockFetchSequence([
      { status: 403, body: errBody(403, 'PERMISSION_DENIED', 'API_KEY_HTTP_REFERRER_BLOCKED') },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a', 'model-b'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('key-restricted');
    expect(calls).toHaveLength(1);
  });

  it('fails fast when the free tier is unavailable in the user country', async () => {
    const calls = mockFetchSequence([
      {
        status: 400,
        body: errBody(
          400,
          'FAILED_PRECONDITION',
          undefined,
          'Gemini API free tier is not available in your country.',
        ),
      },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a', 'model-b'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('free-tier-unavailable');
    expect(calls).toHaveLength(1);
  });

  it('advances to the next model on 404 and names the model that was missing', async () => {
    const calls = mockFetchSequence([{ status: 404, body: errBody(404, 'NOT_FOUND') }]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['gemini-3-flash', 'also-missing'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('model-not-found');
    expect(err.model).toBe('also-missing');
    expect(calls).toHaveLength(2); // one per model — a 404 is never retried
  });

  it('classifies a truncated 200 as truncated, not as a parse failure', async () => {
    mockFetchSequence([{ status: 200, body: { candidates: [{ finishReason: 'MAX_TOKENS' }] } }]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('truncated');
  });

  it('classifies a blocked prompt as safety-blocked and stops the chain', async () => {
    const calls = mockFetchSequence([
      { status: 200, body: { promptFeedback: { blockReason: 'SAFETY' } } },
    ]);
    const err = await rejection(
      generateJson({
        key: 'k',
        modelChain: ['model-a', 'model-b'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    );
    expect(err.kind).toBe('safety-blocked');
    expect(calls).toHaveLength(1);
  });

  it('throws GeminiUnavailableError when the whole chain is exhausted', async () => {
    mockFetchSequence([{ status: 500 }]);
    await expect(
      generateJson({
        key: 'k',
        modelChain: ['model-a'],
        prompt: 'hi',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    ).rejects.toThrow(GeminiUnavailableError);
  });

  it('enforces the daily budget ceiling client-side', async () => {
    mockFetchSequence([{ status: 200, body: okBody('{}') }]);
    const opts = {
      key: 'k',
      modelChain: ['m'],
      prompt: 'p',
      schema: { type: 'object' },
      backoffBaseMs: 1,
      dailyBudget: 2,
    };
    await generateJson(opts);
    await generateJson(opts);
    await expect(generateJson(opts)).rejects.toThrow(BudgetExceededError);
  });

  it('does not consume budget on failure', async () => {
    mockFetchSequence([{ status: 500 }]);
    await expect(
      generateJson({
        key: 'k',
        modelChain: ['m'],
        prompt: 'p',
        schema: { type: 'object' },
        backoffBaseMs: 1,
      }),
    ).rejects.toThrow();
    expect(getUsageToday()).toBe(0);
  });
});

describe('listAvailableModels', () => {
  it('returns generateContent-capable names stripped of the models/ prefix', async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          ],
        },
      },
    ]);
    expect(await listAvailableModels('key')).toEqual(['gemini-2.5-flash', 'gemini-3.5-flash']);
  });

  it('throws a classified error on an invalid key', async () => {
    mockFetchSequence([{ status: 400, body: errBody(400, 'INVALID_ARGUMENT', 'API_KEY_INVALID') }]);
    const err = await rejection(listAvailableModels('bad'));
    expect(err.kind).toBe('invalid-key');
    expect(err.httpStatus).toBe(400);
  });
});

describe('settings model-chain migration', () => {
  interface Persisted {
    geminiKey?: string;
    modelChain?: unknown;
    aiDailyBudget?: number;
  }
  const options = useSettings.persist.getOptions();
  // migrate is declared as returning S | Promise<S>; ours is synchronous
  const migrate = (state: Persisted, version: number) =>
    options.migrate!(state, version) as unknown as Persisted & { modelChain: string[] };

  it('ships a default chain with no retired model in it', () => {
    for (const m of DEFAULT_MODEL_CHAIN) expect(RETIRED_MODEL_IDS.has(m)).toBe(false);
    expect(RECOMMENDED_MODEL_PREFERENCE.slice(0, 3)).toEqual(DEFAULT_MODEL_CHAIN);
    expect(options.version).toBe(3);
  });

  // v0 and v1 were both *shipped defaults*, so holding one is not a user choice —
  // it is a chain the user never picked and cannot be expected to debug.
  it('repairs the v0 chain and keeps the stored key', () => {
    const out = migrate(
      {
        geminiKey: 'AIza-user-key',
        modelChain: ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
        aiDailyBudget: 7,
      },
      0,
    );
    expect(out.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(out.geminiKey).toBe('AIza-user-key');
    expect(out.aiDailyBudget).toBe(7);
  });

  it('repairs the v1 chain — its tail model is dead to new keys — and keeps the stored key', () => {
    const out = migrate(
      {
        geminiKey: 'AIza-user-key',
        modelChain: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      },
      1,
    );
    expect(out.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(out.geminiKey).toBe('AIza-user-key');
  });

  // v2's entries all worked — its ORDER was the bug. It led with gemini-3.5-flash,
  // which the free tier caps at 20 requests/day, so a user got about one practice
  // session before the AI died. Holding a shipped default is not a user choice, so
  // it is replaced wholesale.
  it('reorders the v2 chain — its lead was capped at 20 requests/day — and keeps the stored key', () => {
    const out = migrate(
      {
        geminiKey: 'AIza-user-key',
        modelChain: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
      },
      2,
    );
    expect(out.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(out.modelChain[0]).toBe('gemini-3.1-flash-lite');
    expect(out.geminiKey).toBe('AIza-user-key');
  });

  it('keeps a hand-picked chain but drops the dead entries from it', () => {
    const out = migrate({ modelChain: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] }, 1);
    expect(out.modelChain).toEqual(['gemini-2.5-flash']);
  });

  it('falls back to the default when a persisted chain is entirely dead', () => {
    const out = migrate({ modelChain: ['gemini-2.0-flash', 'gemini-flash-latest'] }, 1);
    expect(out.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
  });

  it('leaves an already-migrated state alone', () => {
    const chain = ['gemini-2.5-flash'];
    const out = migrate({ geminiKey: 'k', modelChain: chain }, 3);
    expect(out.modelChain).toEqual(chain);
    expect(out.geminiKey).toBe('k');
  });

  // a blob with no version field hands migrate `undefined`, and `undefined < 3`
  // is false — an ordinal guard would wave the dead v0 chain straight through
  it('repairs a versionless blob — `undefined` must not read as "already current"', () => {
    const out = migrate(
      { geminiKey: 'k', modelChain: ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] },
      undefined as unknown as number,
    );
    expect(out.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(out.geminiKey).toBe('k');
  });

  // clearing the old Settings text field wrote modelChain: [] — a chain with
  // nowhere to go, which fails every AI call before a request is even sent. The
  // guard lives in the store so no future control can reintroduce it.
  it('refuses to persist an empty chain', () => {
    const { set } = useSettings.getState();
    set('modelChain', ['gemini-3.1-flash-lite']);
    set('modelChain', []);
    expect(useSettings.getState().modelChain).toEqual(['gemini-3.1-flash-lite']);
    set('modelChain', DEFAULT_MODEL_CHAIN);
  });

  // migrate only runs on a version *change*, so an empty chain already written by
  // the old field would survive at the current version — rehydration is the only
  // hook that sees every load
  it('repairs an empty persisted chain on rehydration', () => {
    const merged = options.merge!(
      { geminiKey: 'k', modelChain: [] },
      useSettings.getState(),
    ) as unknown as Persisted & { modelChain: string[]; geminiKey: string };
    expect(merged.modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(merged.geminiKey).toBe('k');
  });

  it('refuses to persist a chain of nothing but dead IDs', () => {
    const { set } = useSettings.getState();
    set('modelChain', ['gemini-3.1-flash-lite']);
    set('modelChain', ['gemini-3-flash', 'gemini-2.5-flash-lite']); // both 404 for any current key
    expect(useSettings.getState().modelChain).toEqual(['gemini-3.1-flash-lite']);
    set('modelChain', ['gemini-2.5-flash', 'gemini-3-flash']);
    expect(useSettings.getState().modelChain).toEqual(['gemini-2.5-flash']); // the live one survives
    set('modelChain', DEFAULT_MODEL_CHAIN);
  });

  // A UI write is a user's CHOICE, so it is not second-guessed: only storage-borne
  // chains (migrate / merge / the cloud row) get the shipped-default replacement.
  it('lets the user order the chain however they like, including a shipped default', () => {
    const { set } = useSettings.getState();
    const v2 = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
    set('modelChain', v2);
    expect(useSettings.getState().modelChain).toEqual(v2);
    set('modelChain', DEFAULT_MODEL_CHAIN);
  });
});

/**
 * The migration tests above call options.migrate() by hand, which proves the
 * function BODY handles its input and nothing at all about whether zustand ever
 * dispatches to it. It does not always: persist gates the migrate branch on
 * `typeof version === "number" && version !== options.version`
 * (node_modules/zustand/middleware.js), so a blob with no version field — or a
 * string one — falls to the else branch and its state is used VERBATIM. These
 * drive the real store through its real storage, so they can actually fail.
 */
describe('settings rehydration — the hook that sees every load', () => {
  const seed = (blob: unknown) =>
    window.localStorage.setItem('coreforge-settings', JSON.stringify(blob));

  const deadV0Chain = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  afterEach(async () => {
    window.localStorage.removeItem('coreforge-settings');
    useSettings.setState({ modelChain: [...DEFAULT_MODEL_CHAIN], geminiKey: '' });
  });

  it('repairs a versionless blob — migrate is never even called for one', async () => {
    seed({ state: { geminiKey: 'AIza-K', modelChain: deadV0Chain } });
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().modelChain).toEqual(DEFAULT_MODEL_CHAIN);
    expect(useSettings.getState().geminiKey).toBe('AIza-K'); // the key is never touched
  });

  it('repairs a blob whose version is a string — same dead branch', async () => {
    seed({ state: { geminiKey: 'AIza-K', modelChain: deadV0Chain }, version: '0' });
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().modelChain).toEqual(DEFAULT_MODEL_CHAIN);
  });

  it('repairs a dead chain already persisted AT the current version', async () => {
    // migrate is by definition never called for this one — only merge sees it
    seed({ state: { modelChain: ['gemini-2.5-flash-lite', 'gemini-2.5-flash'] }, version: 3 });
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().modelChain).toEqual(['gemini-2.5-flash']);
  });

  it('leaves a hand-picked live chain exactly as the user left it', async () => {
    seed({ state: { modelChain: ['gemini-2.5-flash', 'gemini-2.5-pro'] }, version: 3 });
    await useSettings.persist.rehydrate();
    // the billing model stays: it is a wall only for keys without billing, and the
    // chain now walks past it rather than dying on it
    expect(useSettings.getState().modelChain).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
  });
});

describe('the daily budget', () => {
  it('is not pinned to the ceiling of a model the chain demoted', () => {
    // 20 was the cap of gemini-3.5-flash and gemini-3-flash-preview — the two models
    // a healthy user never reaches, because the chain leads with an uncapped one.
    // Binding the global budget to a fallback's ceiling throttled the lead's headroom.
    expect(DEFAULT_AI_DAILY_BUDGET).toBeGreaterThan(20);
    expect(freeRequestCap(DEFAULT_MODEL_CHAIN[0])).toBeUndefined();
    // a keen day: 8 AI equation sets + 12 explanations + 4 coach refreshes
    expect(DEFAULT_AI_DAILY_BUDGET).toBeGreaterThanOrEqual(8 + 12 + 4);
  });
});
