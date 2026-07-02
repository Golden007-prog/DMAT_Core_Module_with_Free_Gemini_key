import { generateJson, listAvailableModels, GeminiUnavailableError } from '../../ai/gemini';
import { resetUsageForTests, getUsageToday, BudgetExceededError } from '../../ai/aiUsage';

const okBody = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] } }],
});

function mockFetchSequence(responses: Array<{ status: number; body?: unknown }>) {
  let call = 0;
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
    calls.push(String(url));
    const r = responses[Math.min(call++, responses.length - 1)];
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  resetUsageForTests();
  vi.restoreAllMocks();
});

describe('generateJson', () => {
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

  it('falls down the model chain after retries exhaust on 429', async () => {
    const calls = mockFetchSequence([
      { status: 429 },
      { status: 429 },
      { status: 429 },
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
    expect(calls.filter((c) => c.includes('model-a'))).toHaveLength(3);
    expect(calls.filter((c) => c.includes('model-b'))).toHaveLength(1);
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
  it('returns model names stripped of the models/ prefix', async () => {
    mockFetchSequence([
      {
        status: 200,
        body: { models: [{ name: 'models/gemini-2.5-flash' }, { name: 'models/gemini-3-flash' }] },
      },
    ]);
    const models = await listAvailableModels('key');
    expect(models).toContain('gemini-2.5-flash');
    expect(models).toContain('gemini-3-flash');
  });

  it('throws on an invalid key (4xx)', async () => {
    mockFetchSequence([{ status: 400 }]);
    await expect(listAvailableModels('bad')).rejects.toThrow();
  });
});
