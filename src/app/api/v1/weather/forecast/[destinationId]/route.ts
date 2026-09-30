// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, clampInt, queryOf } from '@/server/http';
import { forecastFor } from '@/server/data/weather';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/weather/forecast/[destinationId]'>) => {
  const { destinationId } = await ctx.params;
  const days = clampInt(queryOf(req)('days'), 7, 1, 30);
  return json(ok(forecastFor(destinationId, days)));
});
