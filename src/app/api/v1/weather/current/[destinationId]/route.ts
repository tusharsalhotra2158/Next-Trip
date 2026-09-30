// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json } from '@/server/http';
import { currentWeatherFor } from '@/server/data/weather';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (_req, ctx: RouteContext<'/api/v1/weather/current/[destinationId]'>) => {
  const { destinationId } = await ctx.params;
  return json(ok(currentWeatherFor(destinationId)));
});
