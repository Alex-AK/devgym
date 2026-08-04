import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';

import { hashToken } from './tokens';

export interface SessionRow {
  id: string;
  userId: number;
  /** Null while the session is open. A timestamp once it is not. */
  revokedAt: string | null;
}

export interface RefreshTokenRow {
  sessionId: string;
  /** 'active' while this is the token the session is holding, 'used' once it is not. */
  status: 'active' | 'used';
}

/** The slice of better-sqlite3 this workout uses. Every call is synchronous. */
interface Statement {
  run(...params: unknown[]): { changes: number };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
}

/**
 * The two tables, and one method per statement over them. Given, and not part of
 * the exercise: what to call, in what order, is.
 *
 * Rows hold `hashToken(value)` and never a refresh token you could send, so a
 * copy of this database is not a set of live logins.
 */
@Injectable()
export class SessionStore {
  private readonly db: Db = new Database(':memory:');

  constructor() {
    this.db.exec(`
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
    `);
  }

  /** A new open session for a user. One per login: two devices are two sessions. */
  openSession(userId: number): SessionRow {
    const id = randomUUID();
    this.db.prepare(`INSERT INTO sessions (id, user_id) VALUES (?, ?)`).run(id, userId);
    return { id, revokedAt: null, userId };
  }

  findSession(sessionId: string): SessionRow | undefined {
    return this.db
      .prepare(`SELECT id, user_id AS userId, revoked_at AS revokedAt FROM sessions WHERE id = ?`)
      .get<SessionRow>(sessionId);
  }

  /** Every session this user has ever opened, revoked ones included. */
  sessionsFor(userId: number): SessionRow[] {
    return this.db
      .prepare(
        `SELECT id, user_id AS userId, revoked_at AS revokedAt
         FROM sessions WHERE user_id = ? ORDER BY rowid`
      )
      .all<SessionRow>(userId);
  }

  /** Idempotent: revoking a session that is already revoked changes nothing. */
  revokeSession(sessionId: string): void {
    this.db
      .prepare(
        `UPDATE sessions SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL`
      )
      .run(sessionId);
  }

  /** Record a refresh token against a session, as the active one. */
  issueToken(sessionId: string, refreshToken: string): void {
    this.db
      .prepare(
        `INSERT INTO refresh_tokens (token_hash, session_id, status) VALUES (?, ?, 'active')`
      )
      .run(hashToken(refreshToken), sessionId);
  }

  /** Whatever is on record for this token value, whatever state it is in. */
  findToken(refreshToken: string): RefreshTokenRow | undefined {
    return this.db
      .prepare(`SELECT session_id AS sessionId, status FROM refresh_tokens WHERE token_hash = ?`)
      .get<RefreshTokenRow>(hashToken(refreshToken));
  }

  markTokenUsed(refreshToken: string): void {
    this.db
      .prepare(`UPDATE refresh_tokens SET status = 'used' WHERE token_hash = ?`)
      .run(hashToken(refreshToken));
  }
}
