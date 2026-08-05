import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDepot, type Depot } from '../../src/server/db';
import { buildManifest, type ManifestSummary } from '../../src/server/manifests';
import { DepotBusy, recordScan, type ScanResult } from '../../src/server/scanning';

let depot: Depot;

beforeEach(() => {
  depot = createDepot();
});

afterEach(() => {
  depot.close();
});

const scanCount = () =>
  depot.office.prepare('SELECT count(*) AS c FROM scans').get<{ c: number }>()?.c;
const parcel = (barcode: string) =>
  depot.office
    .prepare('SELECT status FROM parcels WHERE barcode = ?')
    .get<{ status: string }>(barcode);

/**
 * A run for van 1, with PB-1006 scanned in on the handheld once the run is
 * already writing its manifest rows. `beforeWrite(fn, 1)` fires the scan just
 * before the run's second write, so the scan arrives at a moment when the
 * database is genuinely busy, every time and in no particular order of luck.
 */
function scanDuringTheWrite(): {
  summary?: ManifestSummary;
  scanned?: ScanResult;
  scanError?: unknown;
  runError?: unknown;
} {
  const out: {
    summary?: ManifestSummary;
    scanned?: ScanResult;
    scanError?: unknown;
    runError?: unknown;
  } = {};

  depot.office.beforeWrite(() => {
    try {
      out.scanned = recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });
    } catch (error) {
      out.scanError = error;
    }
  }, 1);

  try {
    out.summary = buildManifest(depot.office, 1);
  } catch (error) {
    out.runError = error;
  }

  return out;
}

describe('a scan the depot cannot take', () => {
  it('comes back as DepotBusy rather than as a driver error', () => {
    const { scanError, scanned } = scanDuringTheWrite();

    expect(scanned, 'the scan reported success while the database was refusing it').toBeUndefined();
    expect(scanError).toBeInstanceOf(DepotBusy);
  });

  it('leaves nothing of itself behind', () => {
    scanDuringTheWrite();

    expect(scanCount(), 'a scan row survived a scan that was refused').toBe(0);
    expect(parcel('PB-1006')).toEqual({ status: 'expected' });
  });

  it('leaves no transaction open on the handheld connection', () => {
    scanDuringTheWrite();

    expect(depot.handheld.inTransaction, 'the refused scan left a transaction open').toBe(false);
  });

  it('does not take the run down with it', () => {
    const { runError, summary } = scanDuringTheWrite();

    expect(runError).toBeUndefined();
    expect(summary).toEqual({ vanId: 1, code: 'WX21 ABC', stops: 5 });
  });
});
