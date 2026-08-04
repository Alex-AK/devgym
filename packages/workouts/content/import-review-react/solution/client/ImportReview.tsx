import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { List, type RowComponentProps } from 'react-window';

import { ERROR_LINE_HEIGHT, ROW_HEIGHT, type ImportRow } from './rows';

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
  skipped: ReadonlySet<number>;
  activeIndex: number;
  keyboardIsInTheList: boolean;
  onToggle: (id: number) => void;
  onCursorTo: (index: number) => void;
}

/**
 * The list works out where every row sits before any of them exist, so a height
 * has to come from the row's own data rather than from what it turns out to
 * occupy. Errors render one line each underneath the row.
 */
function rowHeight(index: number, { rows }: RowProps): number {
  const row = rows[index];
  return ROW_HEIGHT + (row?.errors.length ?? 0) * ERROR_LINE_HEIGHT;
}

function Row({
  index,
  style,
  ariaAttributes,
  rows,
  skipped,
  activeIndex,
  keyboardIsInTheList,
  onToggle,
  onCursorTo,
}: RowComponentProps<RowProps>) {
  const element = useRef<HTMLDivElement>(null);
  const isActive = index === activeIndex;

  // The row under the cursor is unmounted every time it scrolls out of range,
  // and the focus goes to the body with it. Taking the focus back when the row
  // mounts again is what makes the cursor survive being recycled. The flag is
  // what stops that happening on load, when nobody has asked for it.
  useEffect(() => {
    if (isActive && keyboardIsInTheList) element.current?.focus();
  }, [isActive, keyboardIsInTheList]);

  const row = rows[index];
  if (!row) return null;

  const move = (delta: number) => onCursorTo(Math.min(Math.max(index + delta, 0), rows.length - 1));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') move(1);
    else if (event.key === 'ArrowUp') move(-1);
    else if (event.key === ' ' || event.key === 'Enter') onToggle(row.id);
    else return;

    event.preventDefault();
  };

  const isSkipped = skipped.has(row.id);

  return (
    <div
      {...ariaAttributes}
      className="import-row"
      role="option"
      aria-selected={isSkipped}
      // A roving tabindex: one stop for the whole list rather than one per row.
      tabIndex={isActive ? 0 : -1}
      ref={element}
      style={style}
      onClick={() => onToggle(row.id)}
      onFocus={() => onCursorTo(index)}
      onKeyDown={onKeyDown}
    >
      <span className="reference">{row.reference}</span>
      <span className="email">{row.email}</span>
      <span className="amount">{row.amount}</span>
      {isSkipped && <span className="skip-tag">Skip</span>}
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
 * Everything a row would otherwise remember for itself lives up here, because a
 * row is a view of a record for as long as that record is near the scroll
 * position, and nothing it holds outlives that.
 */
export function ImportReview({ rows }: ImportReviewProps) {
  const [skipped, setSkipped] = useState<ReadonlySet<number>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardIsInTheList, setKeyboardIsInTheList] = useState(false);

  const onToggle = useCallback((id: number) => {
    setSkipped((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const onCursorTo = useCallback((index: number) => {
    setActiveIndex(index);
    setKeyboardIsInTheList(true);
  }, []);

  /**
   * A row leaving the DOM moves the focus to the body without naming anywhere it
   * went, so only a move to somewhere else on the page means the keyboard has
   * really left the list.
   */
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
      setKeyboardIsInTheList(false);
    }
  };

  return (
    <div className="import-review" onBlur={onBlur}>
      <p>
        <output aria-label="Rows to skip">{skipped.size}</output> of {rows.length} rows will be
        skipped.
      </p>

      <List
        role="listbox"
        aria-label="Uploaded rows"
        rowComponent={Row}
        rowCount={rows.length}
        rowHeight={rowHeight}
        rowProps={{ rows, skipped, activeIndex, keyboardIsInTheList, onToggle, onCursorTo }}
        style={{ height: VIEWPORT_HEIGHT }}
      />
    </div>
  );
}
