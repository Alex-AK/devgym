import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDepot, type Depot } from '../../src/server/db';
import { buildManifest } from '../../src/server/manifests';
import { recordScan } from '../../src/server/scanning';

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
const lineCount = (vanId: number) =>
  depot.office
    .prepare('SELECT count(*) AS c FROM manifest_lines WHERE van_id = ?')
    .get<{ c: number }>(vanId)?.c;

/** Run the manifest for van 1 with a scan refused in the middle of it. */
function runWithARefusedScan(): void {
  depot.office.beforeWrite(() => {
    try {
      recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });
    } catch {
      // The checkpoint above owns what the refusal looks like. This one is
      // about the handheld still being usable afterwards.
    }
  }, 1);

  buildManifest(depot.office, 1);
}

describe('the handheld after a refused scan', () => {
  it('takes the same scan again once the run is over', () => {
    runWithARefusedScan();

    const scanned = recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });

    expect(scanned).toEqual({ parcelId: 6, barcode: 'PB-1006', status: 'at-depot' });
    expect(parcel('PB-1006')).toEqual({ status: 'at-depot' });
  });

  it('records that scan exactly once', () => {
    runWithARefusedScan();
    recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });

    expect(scanCount(), 'the refused attempt was counted as well').toBe(1);
  });

  it('goes on taking other parcels too', () => {
    runWithARefusedScan();
    recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });
    recordScan(depot.handheld, { barcode: 'PB-1007', station: 'depot-in' });

    expect(scanCount()).toBe(2);
    expect(parcel('PB-1007')).toEqual({ status: 'at-depot' });
    expect(lineCount(1), 'the run that was going on lost its manifest').toBe(5);
  });
});
