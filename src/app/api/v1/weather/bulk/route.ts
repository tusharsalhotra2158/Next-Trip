// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, readJsonBody } from '@/server/http';
import { currentWeatherFor } from '@/server/data/weather';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const body = await readJsonBody(req);
  const ids = Array.isArray(body.destinationIds) ? body.destinationIds : [];
  const results = ids.map((id: string) => ({ destinationId: id, ...currentWeatherFor(id) }));
  return json(ok(results, { count: results.length }));
});
