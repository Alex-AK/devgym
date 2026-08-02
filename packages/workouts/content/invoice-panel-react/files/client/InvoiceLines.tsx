import { useEffect, useState } from 'react';

import { type Line, formatMoney } from './invoice';

export interface InvoiceLinesProps {
  lines: Line[];
  onRemove: (id: number) => void;
}

function sumPence(lines: Line[]): number {
  return lines.reduce((total, line) => total + line.quantity * line.unitPence, 0);
}

/**
 * The lines on the invoice, a box to filter them with, and the total.
 *
 * TODO: three things have come back about it. See brief.md.
 */
export function InvoiceLines({ lines, onRemove }: InvoiceLinesProps) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState<Line[]>(lines);
  const [totalPence, setTotalPence] = useState(() => sumPence(lines));

  useEffect(() => {
    const term = query.trim().toLowerCase();
    setVisible(lines.filter((line) => line.description.toLowerCase().includes(term)));
    setTotalPence(sumPence(lines));
  }, [query]);

  return (
    <div>
      <label htmlFor="line-filter">Filter lines</label>
      <input
        id="line-filter"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <table>
        <caption>Invoice lines</caption>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Qty</th>
            <th scope="col">Amount</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((line) => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{formatMoney(line.quantity * line.unitPence)}</td>
              <td>
                <button type="button" onClick={() => onRemove(line.id)}>
                  Remove {line.description}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        Total <output aria-label="Invoice total">{formatMoney(totalPence)}</output>
      </p>
    </div>
  );
}
