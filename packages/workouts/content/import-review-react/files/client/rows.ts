/**
 * One line of the uploaded file, after parsing. Read-only: the importer produces
 * these and the review screen only ever displays them.
 */
export interface ImportRow {
  id: number;
  reference: string;
  email: string;
  amount: string;
  /** One line per problem found in this row. Empty for a row that will import cleanly. */
  errors: string[];
}

/** Height of a row with no errors, in pixels. */
export const ROW_HEIGHT = 44;

/** Height each error line adds underneath a row, in pixels. */
export const ERROR_LINE_HEIGHT = 18;

const NO_AT_SIGN = 'Email address has no @';
const NOT_A_NUMBER = 'Amount is not a number';
const DUPLICATE_REFERENCE = 'Reference appears earlier in the file';

/**
 * Deterministic, so an index always has the same problems: the fifth row of
 * every nine has one error, the eighth has two, and the other seven are clean.
 */
function errorsFor(index: number): string[] {
  const position = index % 9;
  if (position === 4) return [NO_AT_SIGN];
  if (position === 7) return [NOT_A_NUMBER, DUPLICATE_REFERENCE];
  return [];
}

export function buildRows(count: number): ImportRow[] {
  return Array.from({ length: count }, (_, index) => {
    const errors = errorsFor(index);
    return {
      id: index + 1,
      reference: `INV-${100000 + index}`,
      email: errors.includes(NO_AT_SIGN)
        ? `person${index}.example.com`
        : `person${index}@example.com`,
      amount: errors.includes(NOT_A_NUMBER) ? 'n/a' : `${(index % 400) + 12}.00`,
      errors,
    };
  });
}
