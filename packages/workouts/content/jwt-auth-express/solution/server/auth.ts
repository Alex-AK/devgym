import type { NextFunction, Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';

import { SECRET_KEY, TOKEN_TTL_SECONDS } from './config';
import { findUserById, type User } from './users';

/** What `requireAuth` hands to the handlers behind it. */
export interface AuthedRequest extends Request {
  user?: User;
}

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(SECRET_KEY);
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    // jwtVerify, not decodeJwt. Decoding reads the claims of any token at all,
    // including one signed by somebody else, which is the whole ballgame.
    // Pinning the algorithm stops a token that claims alg: none as well.
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ['HS256'] });

    const user = payload.sub ? findUserById(Number(payload.sub)) : undefined;
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch {
    // Bad signature, expired, malformed: from the client's side they are one
    // answer. Letting the rejection escape would make them a 500 instead.
    res.status(401).json({ error: 'Invalid token' });
  }
}
