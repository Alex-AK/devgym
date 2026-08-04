import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthedRequest } from './authed-request';
import { SessionStore } from './session-store';
import { readAccessToken } from './tokens';
import { findUserById } from './users';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly store: SessionStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    const [scheme, token] = String(request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    const claims = await readAccessToken(token);
    if (!claims) throw new UnauthorizedException();

    const user = findUserById(claims.userId);
    if (!user) throw new UnauthorizedException();

    // The lookup the signature was supposed to save you. It is what a revocation
    // has to run into to take effect, and it runs on every request, which is the
    // price of being able to end a session before its tokens expire.
    const session = this.store.findSession(claims.sessionId);
    if (!session || session.revokedAt) throw new UnauthorizedException();

    request.auth = { sessionId: claims.sessionId, user };
    return true;
  }
}
