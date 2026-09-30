// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { destinations } from '@/server/data/destinations';
import { mockTransportOptions } from '@/server/data/transport';
import { getDisplayFx } from '@/server/data/fx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/destinations/[id]/transport'>) => {
  const { id } = await ctx.params;
  const destination = destinations.find((d) => d.id === id);
  if (!destination) return json(fail('Destination not found'), 404);

  const query = queryOf(req);
  const date = query('date') || new Date().toISOString().split('T')[0];
  const rawDistance = query('distanceKm');
  const distanceKm = rawDistance !== undefined ? Number(rawDistance) : undefined;
  const fx = await getDisplayFx();
  return json(ok({ ...mockTransportOptions(destination.id, date, distanceKm, fx), currency: fx.currency }));
});
