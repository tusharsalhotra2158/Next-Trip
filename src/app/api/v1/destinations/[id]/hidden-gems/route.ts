// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json } from '@/server/http';
import { locationsByDestination } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (_req, ctx: RouteContext<'/api/v1/destinations/[id]/hidden-gems'>) => {
  const { id } = await ctx.params;
  const locations = (locationsByDestination.get(id) || []).filter((l) => l.type === 'hidden_gem');
  return json(ok(locations, { count: locations.length }));
});
