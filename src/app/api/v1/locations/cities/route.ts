// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { listCities } from '@/server/data/citySearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle((req) => {
  const query = queryOf(req);
  const country = query('country');
  if (!country) return json(fail('country query param is required', 400), 400);
  const result = listCities({ country, state: query('state'), q: query('q'), limit: query('limit') });
  return json(ok(result.results, { count: result.results.length, total: result.total }));
});
