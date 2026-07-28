import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import { PRACTICE_DB_PATH } from '../common/paths';
import {
  authors,
  books,
  customers,
  employees,
  inventory,
  orderItems,
  orders,
  reviews,
} from './practice-data';

const SCHEMA_SQL = `
CREATE TABLE authors (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  country TEXT NOT NULL
);

CREATE TABLE books (
  id             INTEGER PRIMARY KEY,
  title          TEXT NOT NULL,
  author_id      INTEGER NOT NULL REFERENCES authors(id),
  genre          TEXT NOT NULL,
  price          REAL NOT NULL,
  published_year INTEGER NOT NULL
);

CREATE TABLE customers (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT NOT NULL,
  city      TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at  TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('completed', 'cancelled'))
);

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  book_id    INTEGER NOT NULL REFERENCES books(id),
  quantity   INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  hired_at   TEXT NOT NULL,
  salary     INTEGER NOT NULL,
  city       TEXT NOT NULL
);

CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TEXT NOT NULL,
  comment     TEXT
);

CREATE TABLE inventory (
  book_id      INTEGER PRIMARY KEY REFERENCES books(id),
  stock        INTEGER NOT NULL,
  restocked_at TEXT
);
`;

/** Table order matters for the schema panel — narrative order, not alphabetical. */
export const PRACTICE_TABLE_ORDER = [
  'authors',
  'books',
  'customers',
  'orders',
  'order_items',
  'reviews',
  'inventory',
  'employees',
];

function removeDatabaseFiles(path: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${path}${suffix}`;
    if (existsSync(file)) rmSync(file);
  }
}

/** Drop and rebuild practice.db from the literal seed data. */
export function buildPracticeDatabase(path: string = PRACTICE_DB_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  removeDatabaseFiles(path);

  const db = new Database(path);
  try {
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_SQL);

    const insertAuthor = db.prepare('INSERT INTO authors (id, name, country) VALUES (?, ?, ?)');
    const insertBook = db.prepare(
      'INSERT INTO books (id, title, author_id, genre, price, published_year) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertCustomer = db.prepare(
      'INSERT INTO customers (id, name, email, city, joined_at) VALUES (?, ?, ?, ?, ?)'
    );
    const insertOrder = db.prepare(
      'INSERT INTO orders (id, customer_id, ordered_at, status) VALUES (?, ?, ?, ?)'
    );
    const insertOrderItem = db.prepare(
      'INSERT INTO order_items (id, order_id, book_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
    );
    const insertEmployee = db.prepare(
      'INSERT INTO employees (id, name, role, manager_id, hired_at, salary, city) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertReview = db.prepare(
      'INSERT INTO reviews (id, book_id, customer_id, rating, created_at, comment) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertInventory = db.prepare(
      'INSERT INTO inventory (book_id, stock, restocked_at) VALUES (?, ?, ?)'
    );

    db.transaction(() => {
      for (const a of authors) insertAuthor.run(a.id, a.name, a.country);
      for (const b of books)
        insertBook.run(b.id, b.title, b.authorId, b.genre, b.price, b.publishedYear);
      for (const c of customers) insertCustomer.run(c.id, c.name, c.email, c.city, c.joinedAt);
      for (const o of orders) insertOrder.run(o.id, o.customerId, o.orderedAt, o.status);
      for (const i of orderItems)
        insertOrderItem.run(i.id, i.orderId, i.bookId, i.quantity, i.unitPrice);
      for (const e of employees)
        insertEmployee.run(e.id, e.name, e.role, e.managerId, e.hiredAt, e.salary, e.city);
      for (const r of reviews)
        insertReview.run(r.id, r.bookId, r.customerId, r.rating, r.createdAt, r.comment);
      for (const i of inventory) insertInventory.run(i.bookId, i.stock, i.restockedAt);
    })();
  } finally {
    db.close();
  }
}

/** Open practice.db for user SQL — read-only, always. */
export function openPracticeDatabase(path: string = PRACTICE_DB_PATH): Database.Database {
  if (!existsSync(path)) buildPracticeDatabase(path);
  return new Database(path, { readonly: true, fileMustExist: true });
}
