import type { Db } from './db';

export interface Scan {
  barcode: string;
  station: string;
}

export interface ScanResult {
  parcelId: number;
  barcode: string;
  status: string;
}

/** No parcel carries that barcode. */
export class UnknownBarcode extends Error {}

/**
 * The depot could not take this scan. The handheld shows it as "try again" and
 * the driver scans the parcel a second time.
 */
export class DepotBusy extends Error {}

interface ParcelRow {
  id: number;
  status: string;
}

/**
 * SQLite runs one writer at a time, so a write that arrives while another
 * connection holds the lock is refused rather than queued. Both codes mean the
 * same thing to a caller: come back.
 */
function isLocked(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'SQLITE_BUSY' || code === 'SQLITE_BUSY_SNAPSHOT';
}

/**
 * Record a scan at the depot and move the parcel to at-depot. Called once per
 * parcel per handheld, a few thousand times on a weekday morning.
 */
export function recordScan(db: Db, scan: Scan): ScanResult {
  const parcel = db
    .prepare('SELECT id, status FROM parcels WHERE barcode = ?')
    .get<ParcelRow>(scan.barcode);
  if (!parcel) throw new UnknownBarcode(`no parcel with barcode ${scan.barcode}`);

  // `db.transaction` rolls back if the body throws, which is the difference
  // between a refused scan and a handheld that is broken until it restarts: a
  // hand-written BEGIN with no rollback leaves the transaction open, and every
  // scan after it fails on "cannot start a transaction within a transaction".
  const record = db.transaction((): ScanResult => {
    db.prepare('INSERT INTO scans (parcel_id, station, scanned_at) VALUES (?, ?, ?)').run(
      parcel.id,
      scan.station,
      new Date().toISOString()
    );
    db.prepare("UPDATE parcels SET status = 'at-depot' WHERE id = ?").run(parcel.id);
    return { parcelId: parcel.id, barcode: scan.barcode, status: 'at-depot' };
  });

  try {
    // Immediate, so a scan that is not going to get the lock finds out at BEGIN
    // instead of after it has written the scan row.
    return record.immediate();
  } catch (error) {
    if (isLocked(error)) {
      throw new DepotBusy(`the depot database is busy, scan ${scan.barcode} again`);
    }
    throw error;
  }
}
