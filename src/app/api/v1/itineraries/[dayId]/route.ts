// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, readJsonBody } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import { trips, itinerariesByTrip, pickWritable, ITINERARY_DAY_WRITABLE_FIELDS } from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = handle(async (req, ctx: RouteContext<'/api/v1/itineraries/[dayId]'>) => {
  const body = await readJsonBody(req);
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;

  const { dayId } = await ctx.params;
  for (const [tripId, days] of itinerariesByTrip.entries()) {
    const day = days.find((d) => d.id === dayId);
    if (day) {
      const trip = trips.get(tripId);
      if (!trip || auth.userId !== trip.userId) {
        return json(fail('You do not have access to this itinerary day', 403), 403);
      }
      Object.assign(day, pickWritable(body, ITINERARY_DAY_WRITABLE_FIELDS));
      return json(ok(day));
    }
  }
  return json(fail('Itinerary day not found'), 404);
});
