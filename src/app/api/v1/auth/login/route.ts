// Shared helpers live in src/server/*.
// Node.js runtime (bcryptjs/jsonwebtoken/crypto) and never statically cached.
import { handle } from '@/server/handler';
import { ok, json, readJsonBody } from '@/server/http';
import { authLimiter } from '@/server/rateLimit';
import { login } from '@/server/data/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handle(
  async (req) => {
    const { email, password } = await readJsonBody(req);
    const { user, token } = await login({ email, password });
    return json(ok({ user, token }, { message: 'Login successful' }));
  },
  { limiters: [authLimiter] },
);
