// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json } from '@/server/http';
import { destinations } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (_req, ctx: RouteContext<'/api/v1/destinations/[id]'>) => {
  const { id } = await ctx.params;
  const destination = destinations.find((d) => d.id === id);
  if (!destination) return json(fail('Destination not found'), 404);
  return json(ok(destination));
});
