// Wraps a Route Handler with the Express server's cross-cutting middleware:
// the general rate limiter (+ any route-specific limiters, applied in order
// like Express middleware), draft-6 RateLimit-* headers, and the centralized
// error handler that never leaks stack traces or raw error internals.

import type { NextRequest } from 'next/server';
import { fail, json, type HttpError } from './http';
import { generalLimiter, hit, type Limiter } from './rateLimit';

type Handler<C> = (req: NextRequest, ctx: C) => Response | Promise<Response>;

export function handle<C = unknown>(fn: Handler<C>, opts: { limiters?: Limiter[] } = {}) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    const rateHeaders: Record<string, string> = {};
    for (const limiter of [generalLimiter, ...(opts.limiters ?? [])]) {
      const result = hit(limiter, req);
      Object.assign(rateHeaders, result.headers); // later (route-specific) limiters override, as in Express
      if (!result.allowed) return result.response!;
    }

    let res: Response;
    try {
      res = await fn(req, ctx);
    } catch (err) {
      const error = err as HttpError;
      const status = error?.status || 500;
      console.error('Unhandled error:', error?.stack || error?.message);
      res = json(fail('Internal server error', status), status);
    }

    for (const [k, v] of Object.entries(rateHeaders)) res.headers.set(k, v);
    return res;
  };
}
