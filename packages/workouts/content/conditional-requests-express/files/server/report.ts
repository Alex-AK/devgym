import type { Request, Response } from 'express';

import type { Sales } from './sales';

/**
 * `GET /report`.
 *
 * It builds the report and sends it, every time, to everybody.
 *
 * TODO: send a validator with the report, and answer a caller whose copy is
 * still current without sending the report again. See brief.md.
 */
export function createReportHandler(sales: Sales) {
  return function report(_req: Request, res: Response): void {
    res.json(sales.buildReport());
  };
}
