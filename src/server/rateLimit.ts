// Small in-memory fixed-window rate limiter standing in for
// express-rate-limit (v8, `standardHeaders: true` → draft-6 `RateLimit-*`
// headers). Keyed by client IP. Counters live in the process-wide store (see
// store.ts), so on serverless hosting they are per-instance and reset on cold
// starts — a best-effort guard, same as express-rate-limit's default
// MemoryStore.

import { persistent } from './store';

export interface Limiter {
  name: string;
  windowMs: number;
  limit: number;
  /** JSON body sent on 429. When omitted, express-rate-limit's default plain-text message is sent. */
  message?: unknown;
}

export interface LimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  response?: Response;
}

type Window = { resetAt: number; hits: number };

const DEFAULT_MESSAGE = 'Too many requests, please try again later.';

/**
 * Best-effort client IP. Netlify sets `x-nf-client-connection-ip` itself, so
 * prefer it; otherwise use the first `x-forwarded-for` hop (set by Next's own
 * server and most proxies — note a client can spoof this when the app isn't
 * behind a proxy that overwrites it).
 */
export function clientIp(req: Request): string {
  const nf = req.headers.get('x-nf-client-connection-ip');
  if (nf) return nf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function createLimiter(opts: Limiter): Limiter {
  return opts;
}

function windowsFor(name: string) {
  return persistent(`rateLimit.${name}`, () => new Map<string, Window>());
}

let lastSweep = 0;
// Drop expired windows now and then so the Maps don't grow without bound.
function sweep(now: number, limiters: Limiter[]) {
  if (now - lastSweep < 60 * 1000) return;
  lastSweep = now;
  for (const l of limiters) {
    const windows = windowsFor(l.name);
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
  }
}

/** Count one hit against `limiter` for this request's client. */
export function hit(limiter: Limiter, req: Request): LimitResult {
  const now = Date.now();
  sweep(now, [limiter]);
  const windows = windowsFor(limiter.name);
  const key = clientIp(req);

  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { resetAt: now + limiter.windowMs, hits: 0 };
    windows.set(key, w);
  }
  w.hits += 1;

  const resetSeconds = Math.max(0, Math.ceil((w.resetAt - now) / 1000));
  const headers: Record<string, string> = {
    'RateLimit-Policy': `${limiter.limit};w=${Math.ceil(limiter.windowMs / 1000)}`,
    'RateLimit-Limit': String(limiter.limit),
    'RateLimit-Remaining': String(Math.max(0, limiter.limit - w.hits)),
    'RateLimit-Reset': String(resetSeconds),
  };

  if (w.hits <= limiter.limit) return { allowed: true, headers };

  headers['Retry-After'] = String(resetSeconds);
  const response =
    limiter.message !== undefined
      ? Response.json(limiter.message, { status: 429, headers })
      : new Response(DEFAULT_MESSAGE, { status: 429, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
  return { allowed: false, headers, response };
}

// General limiter for the whole API, plus a stricter one for routes that
// proxy to metered/paid third-party APIs (Gemini, GNews, Unsplash/Pexels, YouTube, Instagram) to bound cost/quota
// exposure from a single abusive client.
export const generalLimiter = createLimiter({ name: 'general', windowMs: 60 * 1000, limit: 120 });

export const externalApiLimiter = createLimiter({
  name: 'externalApi',
  windowMs: 60 * 1000,
  limit: 20,
  message: { success: false, error: 'Too many requests, please try again shortly.' },
});

export const authLimiter = createLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { success: false, error: 'Too many attempts, please try again later.' },
});
