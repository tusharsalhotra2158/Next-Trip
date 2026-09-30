// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, queryOf } from '@/server/http';
import { mockRouteOptions } from '@/server/mockRoutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle((req) => json(ok(mockRouteOptions(null, 'train', queryOf(req)('date')))));
