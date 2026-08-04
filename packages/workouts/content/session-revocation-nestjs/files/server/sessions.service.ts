import { Injectable, NotImplementedException } from '@nestjs/common';

import { SessionStore } from './session-store';
import { newRefreshToken, signAccessToken } from './tokens';
import type { User } from './users';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Everything that happens to a session between a login and a logout.
 *
 * `store` is the two tables and one method per statement over them. See
 * `session-store.ts`; it needs no changes.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly store: SessionStore) {}

  /**
   * A login, and the only method here that is already written. It opens a
   * session, records a refresh token against it, and signs an access token
   * carrying that session's id.
   */
  async open(user: User): Promise<TokenPair> {
    const session = this.store.openSession(user.id);
    const refreshToken = newRefreshToken();
    this.store.issueToken(session.id, refreshToken);

    return { accessToken: await signAccessToken(user.id, session.id), refreshToken };
  }

  /**
   * POST /auth/refresh.
   *
   * TODO: hand back a new pair for the session this token belongs to, and leave
   * the token you were handed worth nothing. Anything that is not a live token
   * on an open session is a 401. A refresh token turning up for a second time is
   * not a mistake somebody made: end the session it came from.
   */
  rotate(refreshToken: string): Promise<TokenPair> {
    throw new NotImplementedException(`rotate is not implemented (given ${refreshToken})`);
  }

  /**
   * POST /auth/logout.
   *
   * TODO: end the one session this refresh token belongs to, and no others. A
   * token nobody recognises is not an error out here: the route answers 204
   * whatever you do with it.
   */
  revoke(_refreshToken: string): void {
    // TODO
  }

  /**
   * POST /auth/logout-everywhere.
   *
   * TODO: end every session this user has, the one doing the asking included.
   */
  revokeEverythingFor(_userId: number): void {
    // TODO
  }
}
