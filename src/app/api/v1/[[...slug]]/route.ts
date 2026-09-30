// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import type { NextRequest } from 'next/server';
import { handle } from '@/server/handler';
import { fail, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// JSON 404 for any unknown /api/v1 path, like the Express server's final
// `app.use((req, res) => res.status(404).json(fail(...)))`. (Unsupported
// methods on a *known* path get Next's automatic 405 instead.)
const notFound = handle((req: NextRequest) => json(fail(`Not found: ${req.method} ${req.nextUrl.pathname}`), 404));

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
