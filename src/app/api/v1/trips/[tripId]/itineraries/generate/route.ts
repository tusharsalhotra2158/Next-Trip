// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, clampInt, readJsonBody } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import { counters, itinerariesByTrip, requireTripOwner, type ItineraryDayRecord } from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handle(async (req, ctx: RouteContext<'/api/v1/trips/[tripId]/itineraries/generate'>) => {
  const body = await readJsonBody(req);
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;
  const trip = requireTripOwner(auth.userId, (await ctx.params).tripId);
  if (trip instanceof Response) return trip;

  const days = clampInt(body.days, 3, 1, 30);
  const perDayBudget = trip.budget ? Math.round(trip.budget / days) : 0;

  const generatedDays: ItineraryDayRecord[] = Array.from({ length: days }, (_, i) => ({
    id: `day_${counters.dayCounter++}`,
    tripId: trip.id,
    dayNumber: i + 1,
    title: `Day ${i + 1}`,
    description: `Explore the highlights of ${trip.destinationId || 'your destination'}.`,
    budgetAllocated: perDayBudget,
    activities: [
      { id: `act_${i}_1`, name: 'Breakfast at a local cafe', time: '08:00', duration: '1h', type: 'restaurant' },
      { id: `act_${i}_2`, name: 'Guided sightseeing tour', time: '10:00', duration: '3h', type: 'attraction' },
      { id: `act_${i}_3`, name: 'Dinner and evening walk', time: '19:00', duration: '2h', type: 'activity' },
    ],
    createdAt: new Date().toISOString(),
  }));

  itinerariesByTrip.set(trip.id, generatedDays);
  return json(ok(generatedDays, { count: generatedDays.length }));
});
