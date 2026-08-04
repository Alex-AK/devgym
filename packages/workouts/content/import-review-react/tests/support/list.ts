import { act, screen } from '@testing-library/react';

/**
 * jsdom does not scroll. Assigning `scrollTop` moves nothing on its own and no
 * scroll event follows it, so both halves are done by hand here. That is the
 * whole of a scroll as far as the list is concerned: it reads `scrollTop` off
 * the container and recomputes which rows belong in the DOM.
 */
export function scrollTo(list: HTMLElement, top: number): void {
  act(() => {
    list.scrollTop = top;
    list.dispatchEvent(new Event('scroll'));
  });
}

export function theList(): HTMLElement {
  return screen.getByRole('listbox');
}

/** Every row currently in the DOM, in the order the list put them there. */
export function mountedRows(): HTMLElement[] {
  return screen.queryAllByRole('option');
}

/** The reference shown on a row, which is how a checkpoint says which row it means. */
export function referenceOf(row: Element | null | undefined): string | null {
  return /INV-\d+/.exec(row?.textContent ?? '')?.[0] ?? null;
}

export function mountedReferences(): string[] {
  return mountedRows().map((row) => referenceOf(row) ?? '');
}

/** The row showing this reference, or null when it is not in the DOM. */
export function rowFor(reference: string): HTMLElement | null {
  return mountedRows().find((row) => referenceOf(row) === reference) ?? null;
}

/** References run from INV-100000 at index 0, so one names the other. */
export function referenceAt(index: number): string {
  return `INV-${100000 + index}`;
}
