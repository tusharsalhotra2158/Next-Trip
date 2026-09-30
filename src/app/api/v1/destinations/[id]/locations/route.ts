// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, queryOf } from '@/server/http';
import { locationsByDestination } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/destinations/[id]/locations'>) => {
  const { id } = await ctx.params;
  const locations = locationsByDestination.get(id) || [];
  const type = queryOf(req)('type');
  const filtered = type ? locations.filter((l) => l.type === type) : locations;
  return json(ok(filtered, { count: filtered.length }));
});
