import type { Request, Response } from 'express';

import type { Sales } from './sales';

/**
 * The revision is the whole validator: it changes when the data changes and at
 * no other time, and reading it costs nothing. An entity tag is a quoted string.
 */
function etagFor(sales: Sales): string {
  return `"sales-${sales.revision}"`;
}

/**
 * RFC 9110 compares `If-None-Match` with the weak function, so `W/"7"` and `"7"`
 * are the same tag, and the header can carry a list of them.
 */
function matches(header: string | undefined, etag: string): boolean {
  if (!header) return false;

  const opaque = (tag: string): string => tag.trim().replace(/^W\//, '');
  return header.split(',').some((tag) => opaque(tag) === opaque(etag));
}

export function createReportHandler(sales: Sales) {
  return function report(req: Request, res: Response): void {
    const etag = etagFor(sales);
    res.setHeader('ETag', etag);

    if (matches(req.header('if-none-match'), etag)) {
      // No body, and nothing was built to produce one. The second half is the
      // point: a validator taken from the finished report saves the bytes and
      // none of the work.
      res.status(304).end();
      return;
    }

    res.json(sales.buildReport());
  };
}
