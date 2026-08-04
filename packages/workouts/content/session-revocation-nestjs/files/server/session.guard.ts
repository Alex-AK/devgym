import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthedRequest } from './authed-request';
import { readAccessToken } from './tokens';
import { findUserById } from './users';

/**
 * What runs in front of GET /me and POST /auth/logout-everywhere.
 *
 * Returning false from a Nest guard is a 403, not a 401, so every refusal here
 * is a thrown UnauthorizedException instead.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    const [scheme, token] = String(request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    const claims = await readAccessToken(token);
    if (!claims) throw new UnauthorizedException();

    const user = findUserById(claims.userId);
    if (!user) throw new UnauthorizedException();

    // TODO: this token is genuine and it has not expired. That is a different
    // question from whether the session named by claims.sessionId is still open,
    // and only one of the two survives somebody pressing log out.

    request.auth = { sessionId: claims.sessionId, user };
    return true;
  }
}
