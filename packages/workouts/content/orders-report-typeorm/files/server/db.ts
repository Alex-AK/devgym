import 'reflect-metadata';

import { DataSource, type Repository } from 'typeorm';

import {
  type Customer,
  CustomerSchema,
  type Order,
  type OrderItem,
  OrderItemSchema,
  OrderSchema,
} from './entities';

export interface LoggedQuery {
  sql: string;
  /** How many rows came back across the wire, not how many entities you got. */
  rowCount: number;
}

export interface Workspace {
  dataSource: DataSource;
  orders: Repository<Order>;
  items: Repository<OrderItem>;
  customers: Repository<Customer>;
  /** Every statement the report ran. The checkpoints read this. */
  queries: LoggedQuery[];
  close: () => Promise<void>;
}

export interface SeedOptions {
  /** How many orders the report has to cover. */
  orders?: number;
}

/**
 * A fresh database, seeded the same way every time.
 *
 * The sqlite drivers keep a single query runner, so wrapping its `query` once is
 * enough to see everything a repository does, row counts included. That is the
 * only way to tell a report that asks for five rows from one that asks for five
 * hundred and adds them up in JavaScript.
 */
export async function createWorkspace(options: SeedOptions = {}): Promise<Workspace> {
  const orderCount = options.orders ?? 40;

  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    synchronize: true,
    entities: [CustomerSchema, OrderSchema, OrderItemSchema],
  });
  await dataSource.initialize();

  const customers = dataSource.getRepository<Customer>('Customer');
  const orders = dataSource.getRepository<Order>('Order');
  const items = dataSource.getRepository<OrderItem>('OrderItem');

  const people: Customer[] = [];
  for (let i = 1; i <= 12; i += 1) {
    people.push(await customers.save({ name: `Customer ${i}`, email: `c${i}@example.com` }));
  }

  for (let i = 1; i <= orderCount; i += 1) {
    const order = await orders.save({
      reference: `ORD-${String(i).padStart(4, '0')}`,
      placedAt: `2024-${String(1 + (i % 12)).padStart(2, '0')}-15`,
      customer: people[i % people.length],
    });

    // The last order is left empty on purpose: cancelled before anything was
    // added to it, and it still belongs on the report.
    if (i === orderCount) continue;

    for (let line = 1; line <= 1 + (i % 4); line += 1) {
      await items.save({
        description: `Line ${line} of ${order.reference}`,
        quantity: 1 + ((i + line) % 3),
        priceCents: 500 + ((i * 37 + line * 11) % 4000),
        order,
      });
    }
  }

  const queries: LoggedQuery[] = [];
  const runner = dataSource.driver.createQueryRunner('master');
  const original = runner.query.bind(runner);
  runner.query = async (...args: Parameters<typeof original>) => {
    const result: unknown = await original(...args);
    const rows = Array.isArray(result)
      ? result
      : ((result as { records?: unknown[] })?.records ?? []);
    queries.push({ sql: String(args[0]), rowCount: rows.length });
    return result as never;
  };

  return {
    dataSource,
    orders,
    items,
    customers,
    queries,
    close: () => dataSource.destroy(),
  };
}
