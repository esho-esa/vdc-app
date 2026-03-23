// JWT Authentication helpers
// In production, use proper secret management (env vars, vault, etc.)

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dental-clinic-dev-secret-key-change-in-production';

/**
 * Simple JWT-like token generation (for demo).
 * In production, use the `jsonwebtoken` package.
 */
export function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Simple password hashing (demo).
 * In production, use bcrypt: await bcrypt.hash(password, 12)
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}
