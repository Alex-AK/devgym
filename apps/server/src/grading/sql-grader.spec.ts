import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildPracticeDatabase, openPracticeDatabase } from '../seed/practice-db';
import { gradeSql } from './sql-grader';
import type { SqlGraderConfig } from './types';

let dir: string;
let db: SqliteDatabase;

const unordered: SqlGraderConfig = {
  solutionSql: "SELECT title FROM books WHERE genre = 'Fantasy';",
  orderMatters: false,
  hints: [],
};

const ordered: SqlGraderConfig = {
  solutionSql:
    'SELECT title, price FROM books WHERE published_year > 2015 ORDER BY price DESC LIMIT 5;',
  orderMatters: true,
  hints: [],
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'devgym-sql-'));
  const path = join(dir, 'practice.db');
  buildPracticeDatabase(path);
  db = openPracticeDatabase(path);
});

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('gradeSql', () => {
  it('grades the canonical query correct', () => {
    expect(gradeSql(unordered.solutionSql, unordered, db).verdict).toBe('correct');
  });

  it('ignores column aliases and formatting', () => {
    const result = gradeSql(
      "select  b.title as n\nfrom books b\nwhere b.genre = 'Fantasy'",
      unordered,
      db
    );
    expect(result.verdict).toBe('correct');
  });

  it('accepts any row order when orderMatters is false', () => {
    const result = gradeSql(
      "SELECT title FROM books WHERE genre = 'Fantasy' ORDER BY title DESC;",
      unordered,
      db
    );
    expect(result.verdict).toBe('correct');
  });

  it('is close when the rows are right but the order is wrong', () => {
    const result = gradeSql(
      'SELECT title, price FROM (SELECT title, price FROM books WHERE published_year > 2015 ORDER BY price DESC LIMIT 5) ORDER BY price ASC;',
      ordered,
      db
    );
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('ORDER BY');
  });

  it('is close when the rows overlap by at least half', () => {
    const result = gradeSql(
      "SELECT title FROM books WHERE genre = 'Fantasy' AND published_year > 2015;",
      unordered,
      db
    );
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('missing 1');
  });

  it('is close when every expected row is there plus extras', () => {
    const result = gradeSql('SELECT title FROM books;', unordered, db);
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('10 extra');
  });

  it('reports a column count mismatch', () => {
    const result = gradeSql(
      "SELECT title, price FROM books WHERE genre = 'Fantasy';",
      unordered,
      db
    );
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toBe('Expected 1 column(s), got 2.');
  });

  it('is incorrect when barely anything overlaps', () => {
    const result = gradeSql("SELECT title FROM books WHERE genre = 'History';", unordered, db);
    expect(result.verdict).toBe('incorrect');
  });

  it('refuses statements that are not reads', () => {
    for (const statement of [
      'DELETE FROM books',
      "UPDATE books SET price = 0 WHERE genre = 'Fantasy'",
      "INSERT INTO books (id, title, author_id, genre, price, published_year) VALUES (99, 'x', 1, 'Fantasy', 1, 2020)",
      'DROP TABLE books',
    ]) {
      const result = gradeSql(statement, unordered, db);
      expect(result.verdict).toBe('incorrect');
      expect(result.feedback).toContain('read-only');
    }
  });

  it('refuses ATTACH so app.db can never be reached', () => {
    const result = gradeSql("ATTACH DATABASE 'app.db' AS app; SELECT 1", unordered, db);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('ATTACH');
  });

  it('refuses multiple statements', () => {
    const result = gradeSql('SELECT title FROM books; SELECT 1;', unordered, db);
    expect(result.verdict).toBe('incorrect');
  });

  it('surfaces the SQLite error for a syntax error', () => {
    const result = gradeSql('SELEKT title FROM books', unordered, db);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('Your query failed to run:');
    expect(result.feedback.toLowerCase()).toContain('syntax error');
  });

  it('surfaces the SQLite error for an unknown column', () => {
    const result = gradeSql('SELECT nope FROM books', unordered, db);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('no such column');
  });

  it('rejects an empty answer', () => {
    expect(gradeSql('   ', unordered, db).verdict).toBe('incorrect');
  });

  it('compares numbers numerically, not textually', () => {
    const config: SqlGraderConfig = {
      solutionSql: 'SELECT 1 AS n;',
      orderMatters: false,
      hints: [],
    };
    expect(gradeSql('SELECT 1.0 AS n;', config, db).verdict).toBe('correct');
  });
});
