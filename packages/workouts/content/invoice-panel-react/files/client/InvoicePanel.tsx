import { useState } from 'react';

import { InvoiceLines } from './InvoiceLines';
import { INVOICE_LINES, type Line } from './invoice';

/**
 * The page around the panel. It owns the invoice, because the invoice is what
 * the API hands back and the panel is one view of it.
 *
 * This file is wiring; the work is in InvoiceLines.tsx.
 */
export function InvoicePanel() {
  const [lines, setLines] = useState<Line[]>(INVOICE_LINES);

  const remove = (id: number): void => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  return (
    <section>
      <h1>Invoice 1042</h1>
      <InvoiceLines lines={lines} onRemove={remove} />
    </section>
  );
}
