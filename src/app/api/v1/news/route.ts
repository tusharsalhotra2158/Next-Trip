// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { getDestinationNews } from '@/server/data/news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(
  async (req) => {
    const query = (queryOf(req)('q') || '').toString().trim();
    if (!query) return json(fail('q query param is required', 400), 400);

    const news = await getDestinationNews(query);
    return json(ok(news));
  },
  { limiters: [externalApiLimiter] },
);
