// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { destinations } from '@/server/data/destinations';
import { buildBudgetEstimate } from '@/server/data/budget';
import { getDisplayFx } from '@/server/data/fx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  const query = queryOf(req);
  const destination = destinations.find((d) => d.id === query('destinationId'));
  if (!destination) return json(fail('Destination not found'), 404);

  const days = clampInt(query('days'), 1, 1, 60);
  const travelers = clampInt(query('travelers'), 1, 1, 20);
  const vehicleType = query('vehicleType');
  const rawDistance = query('distanceKm');
  const distanceKm = rawDistance ? Number(rawDistance) : undefined;

  const estimate = buildBudgetEstimate({
    country: destination.country,
    days,
    travelers,
    vehicleType,
    distanceKm,
    fx: await getDisplayFx(),
  });

  return json(ok(estimate));
});
