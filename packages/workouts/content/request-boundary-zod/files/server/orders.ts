/**
 * The orders behind `GET /orders`, and the listing itself. Read-only: the work
 * is at the boundary, not here.
 */

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'refunded'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: number;
  reference: string;
  status: OrderStatus;
  totalPence: number;
  archived: boolean;
  placedAt: string;
}

/** What the listing needs to know. Producing one of these is the endpoint's job. */
export interface ListCriteria {
  page: number;
  perPage: number;
  status?: OrderStatus;
  sort: 'newest' | 'oldest';
  includeArchived: boolean;
}

export interface ListResult {
  /** The criteria the listing ran with. The dashboard draws its filter chips from this. */
  query: ListCriteria;
  /** Matching orders before paging. */
  total: number;
  orders: Order[];
}

export class Orders {
  /** Every order, oldest first. 120 of them, 12 archived. */
  readonly all: Order[] = build();

  /**
   * How many listings have been produced. No real service counts this; a
   * checkpoint reads it to find out whether a request reached the listing.
   */
  listed = 0;

  list(criteria: ListCriteria): ListResult {
    this.listed += 1;

    const matching = this.all.filter(
      (order) =>
        (criteria.includeArchived || !order.archived) &&
        (criteria.status === undefined || order.status === criteria.status)
    );
    // `matching` is a fresh array, so reversing it in place is safe.
    const sorted = criteria.sort === 'oldest' ? matching : matching.reverse();
    const start = (criteria.page - 1) * criteria.perPage;

    return {
      query: criteria,
      total: sorted.length,
      orders: sorted.slice(start, start + criteria.perPage),
    };
  }
}

function build(): Order[] {
  return Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    reference: `ORD-${String(index + 1).padStart(4, '0')}`,
    status: ORDER_STATUSES[index % ORDER_STATUSES.length] ?? 'pending',
    totalPence: 1200 + index * 37,
    archived: index % 10 === 0,
    placedAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
  }));
}
