/**
 * OPTIONAL Cloudflare Worker proxy for teams that want to share one Gemini key
 * instead of BYOK. OFF by default — the app talks to Google directly with the
 * user's own key. To use: `wrangler deploy`, set the GEMINI_KEY secret, and
 * point the model chain base URL at this worker.
 */
export interface Env {
  GEMINI_KEY: string;
}

const UPSTREAM = 'https://generativelanguage.googleapis.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response('method not allowed', { status: 405 });
    }
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v1beta/models')) {
      return new Response('not found', { status: 404 });
    }
    const upstream = new URL(UPSTREAM + url.pathname);
    upstream.searchParams.set('key', env.GEMINI_KEY);
    const response = await fetch(upstream, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: request.method === 'POST' ? await request.text() : undefined,
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
