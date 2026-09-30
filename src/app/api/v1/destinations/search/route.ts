// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, queryOf } from '@/server/http';
import { destinations } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle((req) => {
  const q = (queryOf(req)('q') || '').toString().trim().toLowerCase();
  const results = q
    ? destinations.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      )
    : destinations;

  return json(ok(results, { count: results.length }));
});
