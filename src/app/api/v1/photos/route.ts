// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { getDestinationPhotos } from '@/server/data/photos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(
  async (req) => {
    const params = queryOf(req);
    const query = (params('q') || '').toString().trim().slice(0, 100);
    if (!query) return json(fail('q query param is required', 400), 400);

    const limit = clampInt(params('limit'), 8, 1, 20);
    const photos = await getDestinationPhotos(query, limit);
    return json(ok(photos));
  },
  { limiters: [externalApiLimiter] },
);
