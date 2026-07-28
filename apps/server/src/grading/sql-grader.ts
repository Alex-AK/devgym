import type { Database as SqliteDatabase, Statement } from 'better-sqlite3';

import { stripCodeFence } from './normalize';
import type { GradeResult, SqlGraderConfig } from './types';

export const ROW_CAP = 1000;

/** Overlap needed with the expected rows before we call an answer "close". */
const CLOSE_THRESHOLD = 0.5;

const ATTACH_RE = /\b(attach|detach)\s+(database\b|['"`:])/i;

type Row = unknown[];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cellKey(value: unknown): string {
  if (value === null || value === undefined) return 'z:null';
  if (typeof value === 'number') return `n:${numericKey(value)}`;
  if (typeof value === 'bigint') return `n:${numericKey(Number(value))}`;
  if (typeof value === 'boolean') return `n:${value ? 1 : 0}`;
  if (value instanceof Uint8Array) return `b:${Buffer.from(value).toString('hex')}`;
  // Everything SQLite can hand back is covered above; this is the unreachable
  // fallback, so a lossy label is fine.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return `s:${String(value)}`;
}

/**
 * Round to 12 significant digits so float noise from a differently-ordered SUM
 * (e.g. 327.45000000000005) still matches the canonical result.
 */
function numericKey(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(12)));
}

/** Length-prefixed so no cell value can forge a row boundary. */
function rowKey(row: Row): string {
  return row
    .map((value) => {
      const key = cellKey(value);
      return `${key.length}~${key}`;
    })
    .join('~');
}

function countRows(rows: Row[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = rowKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function multisetOverlap(expected: Map<string, number>, actual: Map<string, number>): number {
  let overlap = 0;
  for (const [key, count] of expected) {
    overlap += Math.min(count, actual.get(key) ?? 0);
  }
  return overlap;
}

function sameMultiset(expected: Map<string, number>, actual: Map<string, number>): boolean {
  if (expected.size !== actual.size) return false;
  for (const [key, count] of expected) {
    if (actual.get(key) !== count) return false;
  }
  return true;
}

function sameOrder(expected: Row[], actual: Row[]): boolean {
  if (expected.length !== actual.length) return false;
  return expected.every((row, index) => rowKey(row) === rowKey(actual[index] as Row));
}

interface ExecutedQuery {
  rows: Row[];
  columnCount: number;
  truncated: boolean;
}

function execute(db: SqliteDatabase, sqlText: string): ExecutedQuery {
  const statement: Statement = db.prepare(sqlText);
  const columnCount = statement.columns().length;
  const rows = statement.raw().all() as Row[];
  return {
    rows: rows.length > ROW_CAP ? rows.slice(0, ROW_CAP) : rows,
    columnCount,
    truncated: rows.length > ROW_CAP,
  };
}

/**
 * Grade a SQL answer by running it against the read-only practice database and
 * comparing raw row values (so column names and aliases never matter) with the
 * freshly-executed canonical solution.
 */
export function gradeSql(
  rawAnswer: string,
  config: SqlGraderConfig,
  practiceDb: SqliteDatabase
): GradeResult {
  const answer = stripCodeFence(rawAnswer).trim();

  if (answer.length === 0) {
    return { verdict: 'incorrect', feedback: 'Enter a query before submitting.' };
  }
  if (ATTACH_RE.test(answer)) {
    return {
      verdict: 'incorrect',
      feedback: "ATTACH/DETACH isn't allowed. Your query can only read the practice database.",
    };
  }

  let statement: Statement;
  try {
    // better-sqlite3 rejects multiple statements here, which is what we want.
    statement = practiceDb.prepare(answer);
  } catch (error) {
    return { verdict: 'incorrect', feedback: `Your query failed to run: ${errorMessage(error)}` };
  }

  if (statement.reader !== true || statement.readonly !== true) {
    return {
      verdict: 'incorrect',
      feedback:
        "Only read-only queries are allowed here. Write a SELECT that returns rows: the practice database can't be modified.",
    };
  }

  let actual: ExecutedQuery;
  try {
    actual = execute(practiceDb, answer);
  } catch (error) {
    return { verdict: 'incorrect', feedback: `Your query failed to run: ${errorMessage(error)}` };
  }

  const expected = execute(practiceDb, config.solutionSql);

  if (expected.columnCount !== actual.columnCount) {
    return {
      verdict: 'incorrect',
      feedback: `Expected ${expected.columnCount} column(s), got ${actual.columnCount}.`,
    };
  }

  const expectedCounts = countRows(expected.rows);
  const actualCounts = countRows(actual.rows);

  if (sameMultiset(expectedCounts, actualCounts)) {
    if (!config.orderMatters || sameOrder(expected.rows, actual.rows)) {
      return { verdict: 'correct', feedback: 'Correct. Your result matches exactly.' };
    }
    return {
      verdict: 'close',
      feedback: 'Right rows, wrong order. Check your ORDER BY.',
    };
  }

  const overlap = multisetOverlap(expectedCounts, actualCounts);
  const missing = expected.rows.length - overlap;
  const extra = actual.rows.length - overlap;
  const truncationNote = actual.truncated ? ` (only the first ${ROW_CAP} rows were compared)` : '';

  if (expected.rows.length > 0 && overlap / expected.rows.length >= CLOSE_THRESHOLD) {
    let detail: string;
    if (missing === 0) {
      detail = `All ${expected.rows.length} expected rows are there, plus ${extra} extra. Tighten your filter, or add a LIMIT`;
    } else if (extra === 0) {
      detail = `You're missing ${missing} of ${expected.rows.length} expected rows. Your filter is too tight`;
    } else {
      detail = `You matched ${overlap} of ${expected.rows.length} expected rows: ${missing} missing, ${extra} extra`;
    }
    return { verdict: 'close', feedback: `${detail}${truncationNote}.` };
  }

  return {
    verdict: 'incorrect',
    feedback: `Your query returned ${actual.rows.length} rows and the expected result has ${expected.rows.length}. Only ${overlap} matched${truncationNote}.`,
  };
}
