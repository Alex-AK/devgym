import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SessionStore } from './session-store';
import { newRefreshToken, signAccessToken } from './tokens';
import { findUserById, type User } from './users';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly store: SessionStore) {}

  async open(user: User): Promise<TokenPair> {
    const session = this.store.openSession(user.id);
    const refreshToken = newRefreshToken();
    this.store.issueToken(session.id, refreshToken);

    return { accessToken: await signAccessToken(user.id, session.id), refreshToken };
  }

  async rotate(refreshToken: string): Promise<TokenPair> {
    const record = this.store.findToken(refreshToken);
    if (!record) throw new UnauthorizedException();

    // Spent once already, and here it is again. Two parties are holding this
    // value and there is no way to tell from here which of them is the user, so
    // the session goes: the copy handed out a moment ago dies with it.
    if (record.status === 'used') {
      this.store.revokeSession(record.sessionId);
      throw new UnauthorizedException();
    }

    const session = this.store.findSession(record.sessionId);
    // A live token on a revoked session. This is the refresh half of a logout
    // taking effect, and it is why the token alone is not the answer.
    if (!session || session.revokedAt) throw new UnauthorizedException();

    const user = findUserById(session.userId);
    if (!user) throw new UnauthorizedException();

    // Spend the old one before issuing its replacement. The session id does not
    // change: refreshing is not a second login, so the access tokens already out
    // there go on naming the same session.
    this.store.markTokenUsed(refreshToken);
    const next = newRefreshToken();
    this.store.issueToken(session.id, next);

    return { accessToken: await signAccessToken(user.id, session.id), refreshToken: next };
  }

  revoke(refreshToken: string): void {
    const record = this.store.findToken(refreshToken);
    // Nothing on record is nothing to end, and the route answers 204 either way.
    if (record) this.store.revokeSession(record.sessionId);
  }

  revokeEverythingFor(userId: number): void {
    for (const session of this.store.sessionsFor(userId)) {
      this.store.revokeSession(session.id);
    }
  }
}
