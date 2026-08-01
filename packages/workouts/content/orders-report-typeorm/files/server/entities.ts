import { EntitySchema } from 'typeorm';

export interface Customer {
  id: number;
  name: string;
  email: string;
}

export interface Order {
  id: number;
  reference: string;
  placedAt: string;
  customer: Customer;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  description: string;
  quantity: number;
  priceCents: number;
  order: Order;
}

/**
 * Schemas rather than decorated classes, so the entities are plain data and the
 * column names match the property names. That matters once you start writing
 * raw expressions into a query builder.
 */
export const CustomerSchema = new EntitySchema<Customer>({
  name: 'Customer',
  tableName: 'customers',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
    email: { type: String },
  },
});

export const OrderSchema = new EntitySchema<Order>({
  name: 'Order',
  tableName: 'orders',
  columns: {
    id: { type: Number, primary: true, generated: true },
    reference: { type: String },
    placedAt: { type: String },
  },
  relations: {
    customer: { type: 'many-to-one', target: 'Customer', joinColumn: true, nullable: false },
    items: { type: 'one-to-many', target: 'OrderItem', inverseSide: 'order' },
  },
});

export const OrderItemSchema = new EntitySchema<OrderItem>({
  name: 'OrderItem',
  tableName: 'order_items',
  columns: {
    id: { type: Number, primary: true, generated: true },
    description: { type: String },
    quantity: { type: Number },
    priceCents: { type: Number },
  },
  relations: {
    order: { type: 'many-to-one', target: 'Order', joinColumn: true, nullable: false },
  },
});
