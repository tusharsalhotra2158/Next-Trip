// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, readJsonBody } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import { trips, counters, pickWritable, TRIP_WRITABLE_FIELDS, type Trip } from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const body = await readJsonBody(req);
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;

  const id = `trip_${counters.tripCounter++}`;
  const now = new Date().toISOString();
  const trip: Trip = {
    id,
    userId: auth.userId,
    ...pickWritable(body, TRIP_WRITABLE_FIELDS),
    name: body.name || 'Untitled Trip',
    startDate: body.startDate || now,
    endDate: body.endDate || now,
    status: 'draft',
    budget: body.budget ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  trips.set(id, trip);
  return json(ok(trip), 201);
});
