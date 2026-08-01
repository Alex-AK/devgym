import Database from 'better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  department: text('department').notNull(),
  salary: integer('salary').notNull(),
  /** Nullable on purpose: two rows have never started. */
  startedAt: text('started_at'),
});

const SEED: { name: string; department: string; salary: number; startedAt: string | null }[] = [
  { name: 'Ada Bell', department: 'Engineering', salary: 141000, startedAt: '2021-03-01' },
  { name: 'Bruno Vale', department: 'Engineering', salary: 118000, startedAt: '2019-11-14' },
  { name: 'Cara Nix', department: 'Engineering', salary: 152000, startedAt: '2023-06-02' },
  { name: 'Dev Raman', department: 'Engineering', salary: 97000, startedAt: null },
  { name: 'Elin Marsh', department: 'Design', salary: 104000, startedAt: '2020-01-20' },
  { name: 'Femi Okoro', department: 'Design', salary: 121000, startedAt: '2022-09-05' },
  { name: 'Gia Sorel', department: 'Design', salary: 88000, startedAt: '2024-02-17' },
  { name: 'Hal Preston', department: 'Support', salary: 71000, startedAt: '2018-07-30' },
  { name: 'Ivy Chen', department: 'Support', salary: 79000, startedAt: '2021-12-06' },
  { name: 'Jonas Ek', department: 'Support', salary: 68000, startedAt: null },
  { name: 'Kit Alvarez', department: 'Support', salary: 83000, startedAt: '2023-04-11' },
  { name: 'Lena Voss', department: 'Engineering', salary: 133000, startedAt: '2022-02-28' },
];

/** A fresh in-memory database, seeded identically every time. */
export function createDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      salary INTEGER NOT NULL,
      started_at TEXT
    );
  `);

  const insert = sqlite.prepare(
    'INSERT INTO employees (name, department, salary, started_at) VALUES (?, ?, ?, ?)'
  );
  for (const row of SEED) {
    insert.run(row.name, row.department, row.salary, row.startedAt);
  }

  return drizzle(sqlite, { schema: { employees } });
}

export type Db = ReturnType<typeof createDb>;
