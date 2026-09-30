// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { externalApiLimiter } from '@/server/rateLimit';
import { destinations } from '@/server/data/destinations';
import { getDestinationExplore } from '@/server/data/explore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Real popular places (with ticket details), nearby treks and nearby getaways,
// suggested by Gemini and verified against OpenStreetMap (see data/explore.ts).
// `?refresh=1` bypasses the 7-day cache (throttled to once per 5 min per destination).
export const GET = handle(
  async (req, ctx: RouteContext<'/api/v1/destinations/[id]/explore'>) => {
    const { id } = await ctx.params;
    const destination = destinations.find((d) => d.id === id);
    if (!destination) return json(fail('Destination not found'), 404);
    const refresh = queryOf(req)('refresh') === '1';
    return json(ok(await getDestinationExplore(destination, { refresh })));
  },
  { limiters: [externalApiLimiter] },
);
