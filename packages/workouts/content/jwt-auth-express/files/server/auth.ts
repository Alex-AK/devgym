import type { NextFunction, Request, Response } from 'express';

import { SECRET_KEY, TOKEN_TTL_SECONDS } from './config';
import { findUserById, type User } from './users';

/** What `requireAuth` hands to the handlers behind it. */
export interface AuthedRequest extends Request {
  user?: User;
}

/**
 * Sign a token for a user.
 *
 * TODO: HS256, signed with SECRET_KEY. The user's id goes in the subject claim,
 * and the token has to expire — TOKEN_TTL_SECONDS is the budget.
 */
export async function signToken(user: User): Promise<string> {
  throw new Error(`signToken is not implemented (asked for ${user.email})`);
}

/**
 * Express middleware: pull the bearer token off the request, verify it, and put
 * the user it belongs to on `req.user` before calling next().
 *
 * TODO: 401 for a missing header, a token this app did not sign, an expired one,
 * or a subject that is nobody (findUserById is imported for that last one). A bad
 * token is never a 500.
 */
export async function requireAuth(
  _req: AuthedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(501).json({ error: 'requireAuth is not implemented' });
}
