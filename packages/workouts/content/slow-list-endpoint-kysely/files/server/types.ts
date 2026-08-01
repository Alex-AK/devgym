import type { Generated } from 'kysely';

export interface CustomersTable {
  id: Generated<number>;
  name: string;
  email: string;
}

export interface OrdersTable {
  id: Generated<number>;
  customer_id: number;
  status: string;
  total_cents: number;
  created_at: Date;
}

export interface Database {
  customers: CustomersTable;
  orders: OrdersTable;
}

/** One row of the list endpoint, whatever query you build to get it. */
export interface OrderListItem {
  id: number;
  status: string;
  totalCents: number;
  createdAt: Date;
  customerName: string;
}

export interface OrderListResult {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}
