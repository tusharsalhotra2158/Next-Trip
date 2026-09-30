// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { getDestinationVideos } from '@/server/data/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(
  async (req) => {
    const params = queryOf(req);
    const query = (params('q') || '').toString().trim().slice(0, 100);
    if (!query) return json(fail('q query param is required', 400), 400);

    const limit = clampInt(params('limit'), 6, 1, 12);
    const videos = await getDestinationVideos(query, limit);
    return json(ok(videos));
  },
  { limiters: [externalApiLimiter] },
);
