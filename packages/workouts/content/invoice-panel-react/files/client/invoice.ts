export interface Line {
  id: number;
  description: string;
  quantity: number;
  unitPence: number;
}

/** Invoice 1042, as it comes back from the API. */
export const INVOICE_LINES: Line[] = [
  { id: 1, description: 'Design discovery workshop', quantity: 2, unitPence: 45_000 },
  { id: 2, description: 'Design system audit', quantity: 1, unitPence: 82_000 },
  { id: 3, description: 'Frontend build, sprint 1', quantity: 10, unitPence: 9_500 },
  { id: 4, description: 'Frontend build, sprint 2', quantity: 8, unitPence: 9_500 },
  { id: 5, description: 'Accessibility review', quantity: 1, unitPence: 36_000 },
  { id: 6, description: 'Hosting, twelve months', quantity: 12, unitPence: 2_400 },
];

/** Pence to pounds, for display. */
export function formatMoney(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
