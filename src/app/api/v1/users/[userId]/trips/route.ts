// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json } from '@/server/http';
import { authenticate } from '@/server/data/auth';
import { trips } from '@/server/tripStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A user may only list their own trips: the verified session's userId must
// match the userId they're asking for.
export const GET = handle(async (req, ctx: RouteContext<'/api/v1/users/[userId]/trips'>) => {
  const auth = authenticate(req);
  if (auth instanceof Response) return auth;

  const { userId } = await ctx.params;
  if (auth.userId !== userId) {
    return json(fail("You do not have access to this user's trips", 403), 403);
  }
  const userTrips = Array.from(trips.values()).filter((t) => t.userId === userId);
  return json(ok(userTrips, { count: userTrips.length }));
});
