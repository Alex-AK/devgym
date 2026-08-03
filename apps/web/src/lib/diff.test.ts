import { describe, expect, it } from 'vitest';

import { collapseUnchanged, countChanges, diffLines } from '@/lib/diff';

const shape = (from: string, to: string): string =>
  diffLines(from, to)
    .map((row) => `${row.kind === 'added' ? '+' : row.kind === 'removed' ? '-' : ' '}${row.text}`)
    .join('\n');

describe('diffLines', () => {
  it('reports nothing when the two sides match', () => {
    const rows = diffLines('a\nb\nc', 'a\nb\nc');
    expect(rows.every((row) => row.kind === 'same')).toBe(true);
    expect(countChanges(rows)).toEqual({ added: 0, removed: 0 });
  });

  it('marks a replaced line as a removal then an addition', () => {
    expect(shape('a\nb\nc', 'a\nB\nc')).toBe(' a\n-b\n+B\n c');
  });

  it('keeps line numbers pointing at their own side', () => {
    const rows = diffLines('a\nb', 'a\nx\nb');
    const addition = rows.find((row) => row.kind === 'added');
    expect(addition?.left).toBeNull();
    expect(addition?.right).toBe(2);
    expect(rows.at(-1)).toMatchObject({ kind: 'same', left: 2, right: 3 });
  });

  it('handles one side being empty', () => {
    expect(countChanges(diffLines('', 'a\nb'))).toEqual({ added: 2, removed: 1 });
    expect(countChanges(diffLines('a\nb', ''))).toEqual({ added: 1, removed: 2 });
  });

  /**
   * The head and tail trim is an optimisation, so it has to be invisible: an
   * edit in the middle of a long file must diff exactly as it would without it.
   */
  it('trims a shared head and tail without moving the change', () => {
    const before = ['1', '2', '3', 'old', '5', '6', '7'].join('\n');
    const after = ['1', '2', '3', 'new', '5', '6', '7'].join('\n');
    const rows = diffLines(before, after);

    expect(countChanges(rows)).toEqual({ added: 1, removed: 1 });
    expect(rows.find((row) => row.kind === 'removed')).toMatchObject({ left: 4, text: 'old' });
    expect(rows.find((row) => row.kind === 'added')).toMatchObject({ right: 4, text: 'new' });
  });

  it('finds the smallest edit rather than replacing everything', () => {
    // A pure insertion in the middle: the common lines must stay common.
    const rows = diffLines('a\nb\nc\nd', 'a\nb\nx\nc\nd');
    expect(countChanges(rows)).toEqual({ added: 1, removed: 0 });
  });
});

describe('collapseUnchanged', () => {
  it('folds a long unchanged run and keeps context around the change', () => {
    const lines = Array.from({ length: 30 }, (_, index) => `line ${index}`);
    const edited = [...lines];
    edited[15] = 'changed';

    const entries = collapseUnchanged(diffLines(lines.join('\n'), edited.join('\n')), 3);
    const gaps = entries.filter((entry) => entry.kind === 'gap');

    expect(gaps.length).toBe(2);
    expect(entries.filter((entry) => entry.kind !== 'gap').length).toBe(8);
  });

  it('leaves a short diff alone', () => {
    const entries = collapseUnchanged(diffLines('a\nb', 'a\nc'), 3);
    expect(entries.some((entry) => entry.kind === 'gap')).toBe(false);
  });

  it('folds the whole thing when nothing changed', () => {
    const text = Array.from({ length: 10 }, (_, index) => `line ${index}`).join('\n');
    expect(collapseUnchanged(diffLines(text, text), 3)).toEqual([{ kind: 'gap', count: 10 }]);
  });
});
