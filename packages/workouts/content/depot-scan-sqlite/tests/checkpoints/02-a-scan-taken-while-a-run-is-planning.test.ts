import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDepot, type Depot } from '../../src/server/db';
import { buildManifest, type ManifestSummary } from '../../src/server/manifests';
import { runDuringNextPlan } from '../../src/server/planner';
import { recordScan, type ScanResult } from '../../src/server/scanning';

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

/**
 * A run for van 1, with PB-1006 scanned in on the handheld while the drop order
 * is being worked out. Two connections, one file, and the checkpoint decides the
 * order rather than the clock: the scan runs to completion inside the plan.
 */
function runWithAScanMidPlan(): {
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

  runDuringNextPlan(() => {
    try {
      out.scanned = recordScan(depot.handheld, { barcode: 'PB-1006', station: 'depot-in' });
    } catch (error) {
      out.scanError = error;
    }
  });

  try {
    out.summary = buildManifest(depot.office, 1);
  } catch (error) {
    out.runError = error;
  }

  return out;
}

describe('a scan taken while a manifest run is working out the drop order', () => {
  it('is accepted', () => {
    const { scanned, scanError } = runWithAScanMidPlan();

    expect(scanError, 'the handheld was refused while the run was still planning').toBeUndefined();
    expect(scanned).toEqual({ parcelId: 6, barcode: 'PB-1006', status: 'at-depot' });
  });

  it('lands both of its writes', () => {
    runWithAScanMidPlan();

    expect(parcel('PB-1006')).toEqual({ status: 'at-depot' });
    expect(scanCount()).toBe(1);
  });

  it('does not knock the run over either', () => {
    const { summary, runError } = runWithAScanMidPlan();

    expect(runError, 'the run failed because a scan landed during it').toBeUndefined();
    expect(summary).toEqual({ vanId: 1, code: 'WX21 ABC', stops: 5 });
    // Five, not six: the manifest lists what was at the depot when the run read
    // the van, and PB-1006 arrived after that.
    expect(lineCount(1)).toBe(5);
  });
});
