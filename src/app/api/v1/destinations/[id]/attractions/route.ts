// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json } from '@/server/http';
import { locationsByDestination } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (_req, ctx: RouteContext<'/api/v1/destinations/[id]/attractions'>) => {
  const { id } = await ctx.params;
  const locations = (locationsByDestination.get(id) || []).filter(
    (l) => l.type === 'tourist_site' || l.type === 'attraction',
  );
  return json(ok(locations, { count: locations.length }));
});
