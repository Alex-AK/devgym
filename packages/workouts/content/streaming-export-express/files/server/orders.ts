export interface Order {
  id: number;
  placedAt: string;
  customer: string;
  region: string;
  units: number;
  totalPence: number;
}

const REGIONS = ['north', 'south', 'east', 'west'];

/**
 * Seven customers, and three of them have a name CSV has an opinion about.
 * Production has thousands, and the awkward ones are not rare.
 */
const CUSTOMERS = [
  'Marlow Freight',
  'Halden, Ross & Co',
  'Ashby and Sons',
  'The "Quiet" Bakery',
  'Penrose Logistics, Ltd',
  'Kite Supply',
  'Deveraux Group',
];

/** 2026-01-01T00:00:00.000Z, and one order a minute after it. */
const FIRST_ORDER_MS = Date.UTC(2026, 0, 1);

/**
 * The orders table.
 *
 * `rows()` is a cursor: it yields one order at a time and holds none of them,
 * the same as a database cursor does. Nothing here is a bottleneck, and nothing
 * here needs changing.
 */
export class Orders {
  constructor(readonly count: number) {}

  *rows(): Generator<Order> {
    for (let i = 0; i < this.count; i += 1) {
      yield {
        id: 100000 + i,
        placedAt: new Date(FIRST_ORDER_MS + i * 60_000).toISOString(),
        customer: CUSTOMERS[i % CUSTOMERS.length],
        region: REGIONS[i % REGIONS.length],
        units: (i % 40) + 1,
        totalPence: 1995 + (i % 733) * 7,
      };
    }
  }
}
