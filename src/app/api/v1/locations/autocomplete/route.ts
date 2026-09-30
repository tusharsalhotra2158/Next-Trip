// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { searchPlaces } from '@/server/data/citySearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(
  async (req) => {
    const query = queryOf(req);
    const q = (query('q') || '').toString().trim();
    if (!q) return json(fail('q query param is required', 400), 400);

    const limit = clampInt(query('limit'), 10, 1, 25);
    const result = await searchPlaces({
      q,
      type: query('type'),
      country: query('country'),
      state: query('state'),
      limit,
      locale: query('locale'),
    });
    return json(ok(result.results, { source: result.source, disclaimer: result.disclaimer }));
  },
  { limiters: [externalApiLimiter] },
);
