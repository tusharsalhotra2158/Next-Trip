// Minimal real authentication for the in-memory Travel API.
//
// This intentionally mirrors the rest of the backend's "in-memory, resets on
// restart" design (see server.js's trips/itinerariesByTrip Maps) — it's a
// working demo of real auth (hashed passwords, signed session tokens),
// not a production user store. Swap `users` for a real database before
// deploying this anywhere that matters.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// A JWT secret MUST be stable across restarts in any real deployment
// (otherwise every restart invalidates all sessions) — set JWT_SECRET in
// backend/.env for that. For local/demo use we fall back to a random
// per-process secret so the app still works out of the box, and log a clear
// warning so this isn't mistaken for a production-ready default.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn(
    'JWT_SECRET is not set — using a random secret for this process only. ' +
      'Every restart will invalidate existing sessions. Set JWT_SECRET in backend/.env for stable sessions.',
  );
}

const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

// email (lowercased) -> { id, email, firstName, lastName, passwordHash }
const users = new Map();
let userCounter = 1;

function sanitizeUser(user) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function signup({ email, password, firstName, lastName }) {
  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  if (!normalizedEmail || !password || !firstName || !lastName) {
    throw Object.assign(new Error('firstName, lastName, email, and password are all required'), { status: 400 });
  }
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters long'), { status: 400 });
  }
  if (users.has(normalizedEmail)) {
    throw Object.assign(new Error('Email already exists'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = {
    id: `user_${userCounter++}`,
    email: normalizedEmail,
    firstName: firstName.toString().trim(),
    lastName: lastName.toString().trim(),
    passwordHash,
  };
  users.set(normalizedEmail, user);

  return sanitizeUser(user);
}

async function login({ email, password }) {
  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  const user = users.get(normalizedEmail);

  // Compare against a dummy hash when the user doesn't exist so the
  // response time doesn't reveal whether the email is registered.
  const hashToCompare = user ? user.passwordHash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidi';
  const matches = await bcrypt.compare(password || '', hashToCompare);

  if (!user || !matches) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  return { user: sanitizeUser(user), token: issueToken(user) };
}

// Express middleware: verifies the Authorization: Bearer <token> header and
// sets req.userId / req.userEmail from the signed token — never from a
// client-supplied header, so a caller can't just claim to be another user.
function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'Authentication required', message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token', message: 'Invalid or expired token' });
  }
}

module.exports = { signup, login, authenticate };
