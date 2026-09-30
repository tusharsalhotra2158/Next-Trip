// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { destinations } from '@/server/data/destinations';
import { getWeatherOutlook } from '@/server/data/openMeteo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Real, free, no-key weather outlook (Open-Meteo) for a specific date range,
// used by the trip planner's Weather & Vehicle tab.
export const GET = handle(async (req, ctx: RouteContext<'/api/v1/destinations/[id]/weather-outlook'>) => {
  const { id } = await ctx.params;
  const destination = destinations.find((d) => d.id === id);
  if (!destination) return json(fail('Destination not found'), 404);

  const query = queryOf(req);
  const startDate = query('startDate');
  const endDate = query('endDate');
  if (!startDate || !endDate) {
    return json(fail('startDate and endDate query params are required', 400), 400);
  }

  try {
    const outlook = await getWeatherOutlook(destination.lat, destination.lng, new Date(startDate), new Date(endDate));
    return json(ok(outlook));
  } catch (error) {
    console.error('Weather outlook failed:', (error as Error).message);
    return json(fail('Could not fetch live weather right now. Please try again.', 502), 502);
  }
});
