import Database from 'better-sqlite3';

/** The slice of better-sqlite3 this workout uses. Every call is synchronous. */
export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: bigint | number };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  /**
   * Returns a function that runs `fn` between BEGIN and COMMIT, and rolls the
   * whole thing back if `fn` throws. Call it inside another one and you get a
   * SAVEPOINT rather than a second transaction.
   */
  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
  /** True while a transaction on this connection is open. */
  readonly inTransaction: boolean;
  /**
   * Test-only. The checkpoints call this to stop a call part-way through, the
   * way a constraint violation or a lost connection would. The next prepared
   * statement whose SQL contains `fragment` throws instead of running, and the
   * arming is spent. `skip` lets that many matching statements through first,
   * which is how a checkpoint interrupts the middle of a batch.
   */
  failNextWrite(fragment: string, skip?: number): void;
}

const SCHEMA = `
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by TEXT
  );

  CREATE TABLE approval_log (
    id INTEGER PRIMARY KEY,
    expense_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    note TEXT NOT NULL,
    logged_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT INTO expenses (id, description, amount_cents, status, approved_by) VALUES
    (1, 'Taxi to the airport', 4250, 'pending', NULL),
    (2, 'Conference ticket', 39900, 'pending', NULL),
    (3, 'Team lunch', 8600, 'pending', NULL),
    (4, 'Monitor stand', 5500, 'approved', 'ana'),
    (5, 'Hotel minibar', 2300, 'rejected', NULL);
`;

/** A fresh in-memory database with the two tables and five expenses in it. */
export function createDb(): Db {
  const db = new Database(':memory:') as unknown as Db;
  db.exec(SCHEMA);

  let armed: { fragment: string; skip: number } | null = null;
  const prepare = db.prepare.bind(db);

  db.prepare = (sql: string): Statement => {
    const statement = prepare(sql);
    const run = statement.run.bind(statement);
    statement.run = (...params: unknown[]) => {
      if (armed && sql.toLowerCase().includes(armed.fragment.toLowerCase())) {
        if (armed.skip > 0) {
          armed.skip -= 1;
        } else {
          armed = null;
          throw new Error('the connection dropped part-way through the call');
        }
      }
      return run(...params);
    };
    return statement;
  };

  db.failNextWrite = (fragment: string, skip = 0) => {
    armed = { fragment, skip };
  };

  return db;
}
