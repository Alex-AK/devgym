# Logging out does not log anybody out

A customer left their laptop on a train. Support told them to log out from their phone, they did, and
the laptop went on loading their dashboard for another quarter of an hour.

Logging in works and the access token works. This is everything after that.

## The task

Two files.

**`src/server/sessions.service.ts`** — `open` is written. `rotate`, `revoke` and
`revokeEverythingFor` are not.

**`src/server/session.guard.ts`** — what runs in front of the two routes that need a caller. Today
it reads the access token and nothing else.

The behaviour, across the routes `auth.controller.ts` already wires up:

- **`POST /auth/refresh`** takes `{ refreshToken }` and answers `200` with a new
  `{ accessToken, refreshToken }`. The refresh token it was handed does not work a second time. The
  session carries on: refreshing is not a new login.
- **`POST /auth/logout`** takes `{ refreshToken }` and answers `204` whatever it was handed. The
  session that token belongs to ends, and that person's other sessions do not.
- **`POST /auth/logout-everywhere`** ends every session that person has, the one that asked included.
- **`GET /me`** answers `200` on an open session. A session somebody logged out a moment ago is not
  one, on the very next request, whether or not its access token has expired.
- A refresh token presented for a second time means two parties are holding it, and there is no way
  from here to tell which of them is the customer. End that session.

Every refusal is a `401`, none of them is a `500`, and none of them says which of the reasons it was.

## Notes

`session-store.ts` is the two tables and one method per statement over them. It needs no changes:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE TABLE refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'used')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- The methods are `openSession`, `findSession`, `sessionsFor`, `revokeSession`, `issueToken`,
  `findToken` and `markTokenUsed`. Pass refresh tokens to them as they are: rows hold
  `hashToken(value)` and never a value you could send, and the store does that itself.
- `tokens.ts` signs and reads the access token for you. `readAccessToken` answers with the user id
  and the session id, or null for anything that is not a live token this app signed.
- The guard puts `{ user, sessionId }` on `request.auth`, which is where the handlers read it.
- Returning `false` from a Nest guard is a `403`. Throw `UnauthorizedException` for a `401`.
- A session here has no expiry of its own and an access token lasts fifteen minutes. Nothing in the
  checkpoints waits on a clock.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Give a session an idle timeout, and work out where "last used" has to be written for it to mean
  anything, and what that costs on a read-heavy route.
- Build what a "your devices" screen needs out of these two tables, and decide what you would have to
  start storing to say where each session signed in from.
- The guard now reads the database on every request, which is the lookup the signature was there to
  save. Work out what you would cache, and what a stale cache costs you the moment somebody logs out.
