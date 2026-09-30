// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, fail, json, queryOf } from '@/server/http';
import { mockRoadConditions } from '@/server/data/transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle((req) => {
  const query = queryOf(req);
  const originId = query('originId');
  const originLat = query('originLat');
  const originLng = query('originLng');
  const destLat = query('destLat');
  const destLng = query('destLng');
  const date = query('date');
  if (!destLat || !destLng) {
    return json(fail('destLat and destLng query params are required', 400), 400);
  }

  const dateStr = date || new Date().toISOString().split('T')[0];
  const originKey = originLat && originLng ? `${originLat},${originLng}` : originId || 'origin';
  return json(ok(mockRoadConditions(originKey, Number(destLat), Number(destLng), dateStr)));
});
