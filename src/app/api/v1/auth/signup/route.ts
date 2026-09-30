// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, readJsonBody } from '@/server/http';
import { authLimiter } from '@/server/rateLimit';
import { signup } from '@/server/data/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Errors thrown by signup() carry a `status` (400/409); handle() turns them
// into the same `fail('Internal server error', status)` body as Express's
// centralized error handler.
export const POST = handle(
  async (req) => {
    const { firstName, lastName, email, password } = await readJsonBody(req);
    const user = await signup({ firstName, lastName, email, password });
    return json(ok({ user }, { message: 'Account created successfully. Please login.' }), 201);
  },
  { limiters: [authLimiter] },
);
