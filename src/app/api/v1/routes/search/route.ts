// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, queryOf } from '@/server/http';
import { mockRouteOptions } from '@/server/mockRoutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle((req) => {
  const query = queryOf(req);
  return json(ok(mockRouteOptions(query('tripId'), query('mode') || 'flight', query('date'))));
});
