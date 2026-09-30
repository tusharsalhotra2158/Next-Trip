// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import { itinerariesByTrip, requireTripOwner } from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/trips/[tripId]/itineraries'>) => {
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;
  const { tripId } = await ctx.params;
  const trip = requireTripOwner(auth.userId, tripId);
  if (trip instanceof Response) return trip;

  const itinerary = itinerariesByTrip.get(tripId) || [];
  return json(ok(itinerary, { count: itinerary.length }));
});
