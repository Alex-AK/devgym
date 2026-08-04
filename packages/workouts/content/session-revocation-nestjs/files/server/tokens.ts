import { createHash, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

/**
 * In a real service this comes from the environment and is never in the repo.
 * Here it is a constant so the checkpoints can read a token too.
 */
const JWT_SECRET = 'hone-workout-secret-not-for-anything-real';

/** jose wants bytes, not a string. */
export const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

/** How long an access token stays good for once it has left the building. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessClaims {
  userId: number;
  /** The `sid` claim: the session this token was issued against. */
  sessionId: string;
}

/**
 * Sign an access token. Given, and not part of the exercise: the subject is the
 * user, `sid` is the session, and both are already where you need them.
 */
export function signAccessToken(userId: number, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(SECRET_KEY);
}

/**
 * Verify an access token and hand back its claims. Null for anything that is not
 * a live token this app signed: junk, another signer's, or one past its expiry.
 */
export async function readAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || typeof payload.sid !== 'string') return null;

    return { sessionId: payload.sid, userId };
  } catch {
    // Bad signature, expired, malformed: one answer from out here.
    return null;
  }
}

/** A fresh refresh token. Opaque: it means nothing until the store recognises it. */
export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** What the store keeps in place of the token itself. */
export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
