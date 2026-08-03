import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { books, customers, employees, orderItems, orders } from './practice-data';
import { buildPracticeDatabase, openPracticeDatabase } from './practice-db';

let dir: string;
let db: SqliteDatabase;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'hone-data-'));
  const path = join(dir, 'practice.db');
  buildPracticeDatabase(path);
  db = openPracticeDatabase(path);
});

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const all = <T>(sqlText: string): T[] => db.prepare(sqlText).all() as T[];

describe('practice dataset', () => {
  it('has the row counts the problems assume', () => {
    expect(books).toHaveLength(15);
    expect(customers).toHaveLength(10);
    expect(orders).toHaveLength(20);
    expect(orderItems.length).toBeGreaterThanOrEqual(35);
    expect(all<{ n: number }>('SELECT COUNT(*) AS n FROM order_items')[0]?.n).toBe(
      orderItems.length
    );
  });

  it('has at least three genres with exactly one Fantasy holding 4-6 books', () => {
    const genres = all<{ genre: string; n: number }>(
      'SELECT genre, COUNT(*) AS n FROM books GROUP BY genre'
    );
    expect(genres.length).toBeGreaterThanOrEqual(3);
    const fantasy = genres.filter((row) => row.genre === 'Fantasy');
    expect(fantasy).toHaveLength(1);
    expect(fantasy[0]?.n).toBeGreaterThanOrEqual(4);
    expect(fantasy[0]?.n).toBeLessThanOrEqual(6);
  });

  it('has 8+ books after 2015 and no duplicate prices', () => {
    const recent = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM books WHERE published_year > 2015'
    )[0]?.n;
    expect(recent).toBeGreaterThanOrEqual(8);
    expect(new Set(books.map((book) => book.price)).size).toBe(books.length);
  });

  it('leaves at least two customers with zero completed orders', () => {
    const zero = all<{ name: string }>(
      "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed' GROUP BY c.id, c.name HAVING COUNT(o.id) = 0"
    );
    expect(zero.length).toBeGreaterThanOrEqual(2);
  });

  it('has 4+ cancelled orders carrying items', () => {
    const cancelled = all<{ n: number }>(
      "SELECT COUNT(DISTINCT o.id) AS n FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'cancelled'"
    )[0]?.n;
    expect(cancelled).toBeGreaterThanOrEqual(4);
  });

  it('gives every genre a distinct completed-order revenue', () => {
    const revenue = all<{ genre: string; revenue: number }>(
      "SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY b.genre"
    );
    const rounded = revenue.map((row) => Math.round(row.revenue * 100));
    expect(new Set(rounded).size).toBe(revenue.length);
  });

  it('changes the genre ranking if cancelled orders are not excluded', () => {
    const rank = (where: string): string[] =>
      all<{ genre: string }>(
        `SELECT b.genre FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id ${where} GROUP BY b.genre ORDER BY SUM(oi.quantity * oi.unit_price) DESC`
      ).map((row) => row.genre);
    expect(rank("WHERE o.status = 'completed'")).not.toEqual(rank(''));
  });

  it('gives employees exactly one root and a reachable tree', () => {
    const roots = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM employees WHERE manager_id IS NULL'
    )[0]?.n;
    expect(roots).toBe(1);
    expect(
      employees.every((e) => e.managerId === null || employees.some((m) => m.id === e.managerId))
    ).toBe(true);
    expect(new Set(employees.map((e) => e.salary)).size).toBe(employees.length);
  });

  it('leaves some books unreviewed and gives the rest distinct averages', () => {
    const unreviewed = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM books b WHERE NOT EXISTS (SELECT 1 FROM reviews r WHERE r.book_id = b.id)'
    )[0]?.n;
    expect(unreviewed).toBeGreaterThanOrEqual(2);

    const averages = all<{ avg: number }>(
      'SELECT AVG(rating) AS avg FROM reviews GROUP BY book_id'
    ).map((row) => Math.round(row.avg * 1e6));
    expect(new Set(averages).size).toBe(averages.length);

    const nullComments = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM reviews WHERE comment IS NULL'
    )[0]?.n;
    expect(nullComments).toBeGreaterThan(0);
  });

  it('leaves some books with no inventory row and some with zero stock', () => {
    const missing = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM books b LEFT JOIN inventory i ON i.book_id = b.id WHERE i.book_id IS NULL'
    )[0]?.n;
    expect(missing).toBeGreaterThanOrEqual(2);

    const zero = all<{ n: number }>('SELECT COUNT(*) AS n FROM inventory WHERE stock = 0')[0]?.n;
    expect(zero).toBeGreaterThanOrEqual(2);

    const nullRestock = all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM inventory WHERE restocked_at IS NULL'
    )[0]?.n;
    expect(nullRestock).toBeGreaterThan(0);
  });

  it('is opened read-only for user SQL', () => {
    expect(db.readonly).toBe(true);
    expect(() => db.prepare('DELETE FROM books').run()).toThrow();
  });
});
