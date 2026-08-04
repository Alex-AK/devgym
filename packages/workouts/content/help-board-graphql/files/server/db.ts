import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const authors = sqliteTable('authors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  teamId: integer('team_id').notNull(),
});

export const threads = sqliteTable('threads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadId: integer('thread_id').notNull(),
  authorId: integer('author_id').notNull(),
  body: text('body').notNull(),
});

export type TeamRow = typeof teams.$inferSelect;
export type AuthorRow = typeof authors.$inferSelect;
export type ThreadRow = typeof threads.$inferSelect;
export type PostRow = typeof posts.$inferSelect;

export interface LoggedQuery {
  sql: string;
  parameters: unknown[];
}

const TEAM_NAMES = ['Billing', 'Platform', 'Community', 'Moderation'];

const AUTHOR_NAMES = [
  'Priya Raman',
  'Tomas Iversen',
  'Noor Hadid',
  'Wes Calder',
  'Mei Lin',
  'Otto Brandt',
  'Sasha Ferrer',
  'Ines Duarte',
  'Kwame Adjei',
  'Lotte Visser',
  'Bram Osei',
  'Yuki Sato',
  'Nadia Farouk',
  'Ruben Salas',
  'Anneke Roos',
  'Ilya Sorokin',
  'Maya Chandra',
  'Theo Bakker',
];

const SUBJECTS = [
  'Import stops halfway and says nothing',
  'Webhook retries arrive out of order',
  'Invoice PDF is blank for one customer',
  'SSO login loops back to the sign-in page',
  'Export includes rows I archived last week',
  'Rate limit headers disagree with the docs',
  'Two-factor codes rejected on the mobile app',
  'Scheduled report ran twice on Sunday',
  'Search misses names with an apostrophe',
  'Billing address will not save',
];

const THREAD_COUNT = 40;

/** Nobody has replied to this one yet. It still belongs on the board. */
const QUIET_THREAD_ID = 2;

/** Somebody who deleted their account. One reply still carries their id. */
const REMOVED_AUTHOR_ID = 999;

const SCHEMA_SQL = `
  CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team_id INTEGER NOT NULL
  );

  CREATE TABLE threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    body TEXT NOT NULL
  );

  CREATE INDEX posts_thread_id ON posts (thread_id);
`;

function createDb(sqlite: Database.Database, queries: LoggedQuery[]) {
  return drizzle(sqlite, {
    schema: { authors, posts, teams, threads },
    logger: {
      logQuery(sql: string, parameters: unknown[]) {
        queries.push({ sql, parameters });
      },
    },
  });
}

export type Db = ReturnType<typeof createDb>;

export interface Workspace {
  db: Db;
  /** Straight to sqlite, so setup and expectations stay out of the query log. */
  sqlite: Database.Database;
  /** Every statement drizzle has run, in order. The checkpoints read this. */
  queries: LoggedQuery[];
  close: () => void;
}

/**
 * A fresh in-memory board, seeded identically every time: 4 teams, 18 authors,
 * 40 threads and a few replies on each. Two rows are awkward on purpose.
 *
 * The log is the whole instrument here. Nothing on this board is slow enough to
 * time reliably, and a stopwatch would not say what went wrong anyway. What the
 * request asked the database for does.
 */
export function createWorkspace(): Workspace {
  const sqlite = new Database(':memory:');
  sqlite.exec(SCHEMA_SQL);

  const insertTeam = sqlite.prepare('INSERT INTO teams (name) VALUES (?)');
  for (const name of TEAM_NAMES) insertTeam.run(name);

  const insertAuthor = sqlite.prepare('INSERT INTO authors (name, team_id) VALUES (?, ?)');
  AUTHOR_NAMES.forEach((name, index) => {
    insertAuthor.run(name, 1 + (index % TEAM_NAMES.length));
  });

  const insertThread = sqlite.prepare('INSERT INTO threads (title) VALUES (?)');
  const insertPost = sqlite.prepare(
    'INSERT INTO posts (thread_id, author_id, body) VALUES (?, ?, ?)'
  );

  for (let i = 1; i <= THREAD_COUNT; i += 1) {
    insertThread.run(`${SUBJECTS[(i - 1) % SUBJECTS.length]} (#${i})`);
    if (i === QUIET_THREAD_ID) continue;

    for (let line = 1; line <= 1 + (i % 4); line += 1) {
      const authorId =
        i === 1 && line === 1 ? REMOVED_AUTHOR_ID : 1 + ((i * 3 + line) % AUTHOR_NAMES.length);
      insertPost.run(i, authorId, `Reply ${line} on thread ${i}`);
    }
  }

  const queries: LoggedQuery[] = [];
  return {
    db: createDb(sqlite, queries),
    sqlite,
    queries,
    close: () => sqlite.close(),
  };
}
