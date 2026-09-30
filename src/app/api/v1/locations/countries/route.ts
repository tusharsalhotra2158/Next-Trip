// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, queryOf } from '@/server/http';
import { listCountries } from '@/server/data/citySearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cascading dropdown endpoints: countries -> states (per country) -> cities
// (per country + optional state), each with an optional `q` search filter.
// Backed by the offline `country-state-city` dataset; see src/server/data/citySearch.ts.
export const GET = handle((req) => {
  const query = queryOf(req);
  const result = listCountries({ q: query('q'), limit: query('limit') });
  return json(ok(result.results, { count: result.results.length }));
});
