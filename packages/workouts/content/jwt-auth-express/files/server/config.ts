/**
 * In a real service this comes from the environment and is never in the repo.
 * Here it is a constant so the checkpoints can sign tokens too.
 */
export const JWT_SECRET = 'hone-workout-secret-not-for-anything-real';

/** jose wants bytes, not a string. Sign and verify with this. */
export const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

/** How long an issued token stays good for. */
export const TOKEN_TTL_SECONDS = 15 * 60;
