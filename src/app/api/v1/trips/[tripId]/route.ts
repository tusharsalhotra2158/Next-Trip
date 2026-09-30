// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, readJsonBody } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import {
  trips,
  itinerariesByTrip,
  pickWritable,
  requireTripOwner,
  TRIP_WRITABLE_FIELDS,
} from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = RouteContext<'/api/v1/trips/[tripId]'>;

export const GET = handle(async (req, ctx: Ctx) => {
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;
  const trip = requireTripOwner(auth.userId, (await ctx.params).tripId);
  if (trip instanceof Response) return trip;

  return json(ok(trip));
});

export const PUT = handle(async (req, ctx: Ctx) => {
  const body = await readJsonBody(req);
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;
  const trip = requireTripOwner(auth.userId, (await ctx.params).tripId);
  if (trip instanceof Response) return trip;

  Object.assign(trip, pickWritable(body, TRIP_WRITABLE_FIELDS), { updatedAt: new Date().toISOString() });
  return json(ok(trip));
});

export const DELETE = handle(async (req, ctx: Ctx) => {
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;
  const { tripId } = await ctx.params;
  const trip = requireTripOwner(auth.userId, tripId);
  if (trip instanceof Response) return trip;

  trips.delete(tripId);
  itinerariesByTrip.delete(tripId);
  return json(ok(null, { message: 'Trip deleted' }));
});
