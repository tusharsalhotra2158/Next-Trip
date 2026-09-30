// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json } from '@/server/http';
import { destinations } from '@/server/data/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(() => {
  const popular = destinations.slice(0, 8);
  return json(ok(popular, { count: popular.length }));
});
