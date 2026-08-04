import { useState } from 'react';
import { List, type RowComponentProps } from 'react-window';

import { ROW_HEIGHT, type ImportRow } from './rows';

/**
 * Height of the scrolling area. Given rather than measured: the checkpoints run
 * in jsdom, which has no layout for the list to read a height out of.
 */
const VIEWPORT_HEIGHT = 400;

export interface ImportReviewProps {
  rows: ImportRow[];
}

interface RowProps {
  rows: ImportRow[];
  onSkipChanged: (skipped: boolean) => void;
}

function Row({ index, style, rows, onSkipChanged }: RowComponentProps<RowProps>) {
  const [skipped, setSkipped] = useState(false);
  const row = rows[index];

  if (!row) return null;

  const toggle = () => {
    setSkipped(!skipped);
    onSkipChanged(!skipped);
  };

  return (
    <div
      className="import-row"
      role="option"
      aria-selected={skipped}
      style={style}
      onClick={toggle}
    >
      <span className="reference">{row.reference}</span>
      <span className="email">{row.email}</span>
      <span className="amount">{row.amount}</span>
      {skipped && <span className="skip-tag">Skip</span>}
      {row.errors.map((error) => (
        <p className="error" key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}

/**
 * Review screen for a bulk import. An uploaded file runs to tens of thousands of
 * rows, so the list is windowed: only the rows near the scroll position are in
 * the DOM, and the rest exist only in the array.
 *
 * TODO: three things have come back about it. See brief.md.
 */
export function ImportReview({ rows }: ImportReviewProps) {
  const [skipCount, setSkipCount] = useState(0);

  const onSkipChanged = (skipped: boolean) => {
    setSkipCount((count) => count + (skipped ? 1 : -1));
  };

  return (
    <div className="import-review">
      <p>
        <output aria-label="Rows to skip">{skipCount}</output> of {rows.length} rows will be
        skipped.
      </p>

      <List
        role="listbox"
        aria-label="Uploaded rows"
        rowComponent={Row}
        rowCount={rows.length}
        rowHeight={ROW_HEIGHT}
        rowProps={{ rows, onSkipChanged }}
        style={{ height: VIEWPORT_HEIGHT }}
      />
    </div>
  );
}
