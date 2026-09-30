// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { destinations } from '@/server/data/destinations';
import { getWeatherOutlook, type OutlookDay } from '@/server/data/openMeteo';
import { buildPackingList } from '@/server/data/packing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/destinations/[id]/packing-list'>) => {
  const { id } = await ctx.params;
  const destination = destinations.find((d) => d.id === id);
  if (!destination) return json(fail('Destination not found'), 404);

  const query = queryOf(req);
  const startDate = query('startDate');
  const endDate = query('endDate');
  const days = clampInt(query('days'), 3, 1, 30);

  try {
    let weatherDays: OutlookDay[] = [];
    if (startDate && endDate) {
      const outlook = await getWeatherOutlook(destination.lat, destination.lng, new Date(startDate), new Date(endDate));
      weatherDays = outlook.days;
    }
    return json(ok(buildPackingList(weatherDays, days)));
  } catch (error) {
    console.error('Packing list weather lookup failed, using defaults:', (error as Error).message);
    return json(ok(buildPackingList([], days)));
  }
});
