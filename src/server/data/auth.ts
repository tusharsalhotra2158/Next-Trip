/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Minimal real authentication for the in-memory Travel API.
//
// This intentionally mirrors the rest of the backend's "in-memory, resets on
// restart" design (see ../tripStore.ts) — it's a working demo of real auth
// (hashed passwords, signed session tokens), not a production user store.
// Swap `users` for a real database before deploying this anywhere that
// matters. On serverless hosting (Netlify) the user store resets on every
// cold start and isn't shared between function instances.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { persistent } from '../store';

// A JWT secret MUST be stable across restarts in any real deployment
// (otherwise every restart invalidates all sessions) — set JWT_SECRET in
// .env for that. For local/demo use we fall back to a random per-process
// secret so the app still works out of the box, and log a clear warning so
// this isn't mistaken for a production-ready default. The fallback is kept
// in the process-wide store so all route modules (and dev hot reloads)
// share it — otherwise a token issued by /auth/login wouldn't verify in
// /trips.
const JWT_SECRET: string =
  process.env.JWT_SECRET ||
  persistent('auth.fallbackJwtSecret', () => {
    console.warn(
      'JWT_SECRET is not set — using a random secret for this process only. ' +
        'Every restart will invalidate existing sessions. Set JWT_SECRET in .env for stable sessions.',
    );
    return crypto.randomBytes(32).toString('hex');
  });

const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

// email (lowercased) -> { id, email, firstName, lastName, passwordHash }
const users = persistent('auth.users', () => new Map<string, User>());
const counters = persistent('auth.counters', () => ({ userCounter: 1 }));

const httpError = (message: string, status: number) => Object.assign(new Error(message), { status });

function sanitizeUser(user: User): PublicUser {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

function issueToken(user: User) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export async function signup({ email, password, firstName, lastName }: { email?: any; password?: any; firstName?: any; lastName?: any }) {
  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  if (!normalizedEmail || !password || !firstName || !lastName) {
    throw httpError('firstName, lastName, email, and password are all required', 400);
  }
  if (password.length < 8) {
    throw httpError('Password must be at least 8 characters long', 400);
  }
  if (users.has(normalizedEmail)) {
    throw httpError('Email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user: User = {
    id: `user_${counters.userCounter++}`,
    email: normalizedEmail,
    firstName: firstName.toString().trim(),
    lastName: lastName.toString().trim(),
    passwordHash,
  };
  users.set(normalizedEmail, user);

  return sanitizeUser(user);
}

export async function login({ email, password }: { email?: any; password?: any }) {
  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  const user = users.get(normalizedEmail);

  // Compare against a dummy hash when the user doesn't exist so the
  // response time doesn't reveal whether the email is registered.
  const hashToCompare = user ? user.passwordHash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidi';
  const matches = await bcrypt.compare(password || '', hashToCompare);

  if (!user || !matches) {
    throw httpError('Invalid email or password', 401);
  }

  return { user: sanitizeUser(user), token: issueToken(user) };
}

export interface AuthContext {
  userId: string;
  userEmail: string | undefined;
}

/**
 * Route-handler equivalent of the Express `authenticate` middleware: verifies
 * the `Authorization: Bearer <token>` header and returns the userId/email
 * from the signed token — never from a client-supplied header, so a caller
 * can't just claim to be another user. Returns a 401 Response on failure;
 * callers do `if (auth instanceof Response) return auth;`.
 */
export function authenticate(req: Request): AuthContext | Response {
  const header = req.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return Response.json({ success: false, error: 'Authentication required', message: 'Authentication required' }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return { userId: payload.sub as string, userEmail: payload.email };
  } catch {
    return Response.json({ success: false, error: 'Invalid or expired token', message: 'Invalid or expired token' }, { status: 401 });
  }
}
