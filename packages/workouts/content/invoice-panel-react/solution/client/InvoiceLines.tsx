import { useState } from 'react';

import { type Line, formatMoney } from './invoice';

export interface InvoiceLinesProps {
  lines: Line[];
  onRemove: (id: number) => void;
}

function sumPence(lines: Line[]): number {
  return lines.reduce((total, line) => total + line.quantity * line.unitPence, 0);
}

export function InvoiceLines({ lines, onRemove }: InvoiceLinesProps) {
  // The only thing here the component owns. Everything else on screen is this
  // and the invoice put through a filter, so it is worked out during the render
  // that shows it: no second copy to keep in step, and no render that shows the
  // answer to the previous keystroke.
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const visible = lines.filter((line) => line.description.toLowerCase().includes(term));
  const totalPence = sumPence(visible);

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
