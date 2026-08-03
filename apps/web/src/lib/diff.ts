/**
 * A line diff, hand-written for the same reason the shadcn components are: it
 * is fifty lines, workout files are small, and a dependency here would be a
 * dependency in the runtime bundle forever.
 */

export interface DiffRow {
  kind: 'same' | 'added' | 'removed';
  /** 1-based line number on the left, or null when the line is only on the right. */
  left: number | null;
  /** 1-based line number on the right, or null when the line is only on the left. */
  right: number | null;
  text: string;
}

/** A run of unchanged lines the view folded away. */
export interface DiffGap {
  kind: 'gap';
  count: number;
}

export type DiffEntry = DiffRow | DiffGap;

/**
 * The LCS table is quadratic, and a pathological pair of files would freeze the
 * tab it renders in. Past this, every line is reported as replaced: coarse, but
 * it arrives, and no workout file comes near it.
 */
const MAX_CELLS = 4_000_000;

export function diffLines(from: string, to: string): DiffRow[] {
  const a = from.split('\n');
  const b = to.split('\n');

  // Trim the matching head and tail first. Editing three lines of a hundred-line
  // file should not cost a hundred-by-hundred table.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;

  let endA = a.length;
  let endB = b.length;
  while (endA > head && endB > head && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const rows: DiffRow[] = [];
  for (let i = 0; i < head; i += 1) {
    rows.push({ kind: 'same', left: i + 1, right: i + 1, text: a[i] ?? '' });
  }

  rows.push(...align(a.slice(head, endA), b.slice(head, endB), head));

  for (let i = endA; i < a.length; i += 1) {
    rows.push({ kind: 'same', left: i + 1, right: i - endA + endB + 1, text: a[i] ?? '' });
  }
  return rows;
}

function align(a: string[], b: string[], offset: number): DiffRow[] {
  const removed = (text: string, i: number): DiffRow => ({
    kind: 'removed',
    left: offset + i + 1,
    right: null,
    text,
  });
  const added = (text: string, j: number): DiffRow => ({
    kind: 'added',
    left: null,
    right: offset + j + 1,
    text,
  });

  if (a.length === 0 && b.length === 0) return [];
  if (a.length === 0) return b.map(added);
  if (b.length === 0) return a.map(removed);
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) {
    return [...a.map(removed), ...b.map(added)];
  }

  // table[i][j] is the LCS length of a[i..] and b[j..], filled from the back so
  // the walk forward below can read it greedily.
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'same', left: offset + i + 1, right: offset + j + 1, text: a[i] ?? '' });
      i += 1;
      j += 1;
      // Removals before additions at a change, so a replaced block reads as the
      // old lines then the new ones rather than interleaved.
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
      rows.push(removed(a[i] ?? '', i));
      i += 1;
    } else {
      rows.push(added(b[j] ?? '', j));
      j += 1;
    }
  }
  while (i < a.length) {
    rows.push(removed(a[i] ?? '', i));
    i += 1;
  }
  while (j < b.length) {
    rows.push(added(b[j] ?? '', j));
    j += 1;
  }
  return rows;
}

export function countChanges(rows: DiffRow[]): { added: number; removed: number } {
  return {
    added: rows.filter((row) => row.kind === 'added').length,
    removed: rows.filter((row) => row.kind === 'removed').length,
  };
}

/**
 * Fold long runs of unchanged lines, keeping `context` either side of a change.
 * A diff you have to scroll past forty identical lines to read is a file, not a
 * comparison.
 */
export function collapseUnchanged(rows: DiffRow[], context = 3): DiffEntry[] {
  const changed = rows.map((row) => row.kind !== 'same');
  const keep = rows.map((_, index) =>
    changed.slice(Math.max(0, index - context), index + context + 1).some(Boolean)
  );

  const entries: DiffEntry[] = [];
  let run = 0;
  for (const [index, row] of rows.entries()) {
    if (keep[index]) {
      if (run > 0) {
        entries.push({ kind: 'gap', count: run });
        run = 0;
      }
      entries.push(row);
    } else {
      run += 1;
    }
  }
  if (run > 0) entries.push({ kind: 'gap', count: run });
  return entries;
}
