/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Shared request/response helpers for the /api/v1 Route Handlers, mirroring
// the envelope helpers and body parsing of the original Express server.

import type { NextRequest } from 'next/server';

export const ok = (data: unknown, extra: Record<string, unknown> = {}) => ({ success: true, data, ...extra });

// `code` is accepted (and ignored) for parity with the Express helper's signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fail = (message: string, code: number = 404) => ({ success: false, error: message, message });

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** An error carrying an HTTP status, like the `{ status }` errors thrown by auth.ts. */
export type HttpError = Error & { status?: number };

export const httpError = (message: string, status: number): HttpError => Object.assign(new Error(message), { status });

// Clamp a request-supplied number into [min, max], falling back to `def` when
// missing/invalid. Used anywhere a client-controlled count (days, limit, …)
// would otherwise drive an unbounded loop or array allocation.
export const clampInt = (value: unknown, def: number, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

/**
 * Query-string accessor that returns `undefined` (not `null`) for a missing
 * param, matching Express's `req.query.x`. This matters: `Number(null)` is 0
 * but `Number(undefined)` is NaN, and clampInt() relies on the latter to
 * apply its default.
 */
export function queryOf(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return (name: string): string | undefined => params.get(name) ?? undefined;
}

// Same limit as the Express server's `express.json({ limit: '100kb' })`.
const JSON_BODY_LIMIT_BYTES = 100 * 1024;

/**
 * Parse a JSON request body the way Express 4's `express.json()` does:
 * - non-JSON content types (or an empty body) yield `{}`;
 * - bodies over 100kb are rejected with status 413;
 * - malformed JSON, or a top-level value that isn't an object/array
 *   (body-parser's `strict` mode), is rejected with status 400.
 * Rejections are thrown as HttpErrors, which `handle()` turns into the same
 * `fail('Internal server error', status)` response Express's error handler sent.
 */
export async function readJsonBody(req: Request): Promise<any> {
  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  if (!contentType.split(';')[0].trim().startsWith('application/json')) return {};

  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > JSON_BODY_LIMIT_BYTES) {
    throw httpError('request entity too large', 413);
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > JSON_BODY_LIMIT_BYTES) throw httpError('request entity too large', 413);

  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed[0] !== '{' && trimmed[0] !== '[') throw httpError('Invalid JSON body', 400);

  try {
    return JSON.parse(trimmed);
  } catch {
    throw httpError('Invalid JSON body', 400);
  }
}
