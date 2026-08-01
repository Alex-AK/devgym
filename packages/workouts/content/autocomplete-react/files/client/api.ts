export interface Product {
  id: number;
  name: string;
  sku: string;
}

const CATALOGUE: Product[] = [
  { id: 1, name: 'Bracket, heavy', sku: 'BRK-HVY' },
  { id: 2, name: 'Brass hinge', sku: 'BRS-HNG' },
  { id: 3, name: 'Cable tidy', sku: 'CAB-TDY' },
  { id: 4, name: 'Desk lamp', sku: 'LMP-DSK' },
  { id: 5, name: 'Monitor arm', sku: 'ARM-MON' },
  { id: 6, name: 'Laptop stand', sku: 'STD-LAP' },
];

export interface SearchOptions {
  signal?: AbortSignal;
}

export interface RecordedCall {
  query: string;
  signal?: AbortSignal;
  settled: 'pending' | 'resolved' | 'aborted';
}

/** Every search the component has asked for, in order. The checkpoints read this. */
export const calls: RecordedCall[] = [];

const delays = new Map<string, number>();

/**
 * Test controls. A real API has none of this; it is here so a checkpoint can
 * make one answer arrive late without the suite sitting around waiting.
 */
export const fixture = {
  reset(): void {
    calls.length = 0;
    delays.clear();
  },
  /** Make searches for this exact term take `ms` to come back. */
  delay(query: string, ms: number): void {
    delays.set(query, ms);
  },
};

/**
 * Search the catalogue by name. Behaves like `fetch` in the way that matters:
 * pass a signal and abort it, and the promise rejects with an AbortError rather
 * than resolving with something you no longer want.
 */
export function searchProducts(query: string, options: SearchOptions = {}): Promise<Product[]> {
  const record: RecordedCall = { query, signal: options.signal, settled: 'pending' };
  calls.push(record);

  const term = query.trim().toLowerCase();
  const matches = CATALOGUE.filter((product) => product.name.toLowerCase().includes(term));

  return new Promise<Product[]>((resolve, reject) => {
    const { signal } = options;

    const abort = () => {
      if (record.settled !== 'pending') return;
      record.settled = 'aborted';
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    const timer = setTimeout(
      () => {
        if (record.settled !== 'pending') return;
        record.settled = 'resolved';
        resolve(matches);
      },
      delays.get(query) ?? 0
    );

    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort);
  });
}
