// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, clampInt, queryOf } from '@/server/http';
import { locationsByDestination } from '@/server/data/destinations';
import { suggestMinDays, buildItinerary } from '@/server/data/itinerary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (req, ctx: RouteContext<'/api/v1/destinations/[id]/itinerary-suggestion'>) => {
  const { id } = await ctx.params;
  const locations = locationsByDestination.get(id);
  if (!locations) return json(fail('Destination not found'), 404);

  const minDaysRequired = suggestMinDays(locations);
  const requestedDays = clampInt(queryOf(req)('days'), minDaysRequired, 1, 30);
  const { plan, uncoveredCount } = buildItinerary(locations, requestedDays);

  return json(
    ok(plan, {
      minDaysRequired,
      requestedDays,
      uncoveredCount,
      note:
        uncoveredCount > 0
          ? `${uncoveredCount} additional spot(s) didn't fit in ${requestedDays} day(s) — consider adding more days.`
          : 'All recommended spots fit within the selected days.',
    }),
  );
});
