// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { aiSearchPlaces } from '@/server/data/geminiSearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Natural-language place search via Gemini (see src/server/data/geminiSearch.ts).
// Separate from /locations/autocomplete: this handles free-form queries like
// "quiet beach towns in Kerala" that the offline structured search can't.
export const GET = handle(
  async (req) => {
    const query = queryOf(req);
    const q = (query('q') || '').toString().trim();
    if (!q) return json(fail('q query param is required', 400), 400);

    const limit = clampInt(query('limit'), 6, 1, 10);
    const result = await aiSearchPlaces({ q, limit });
    return json(ok(result.results, { source: result.source, disclaimer: result.disclaimer }));
  },
  { limiters: [externalApiLimiter] },
);
