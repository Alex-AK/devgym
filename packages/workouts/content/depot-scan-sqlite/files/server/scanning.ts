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
 * Record a scan at the depot and move the parcel to at-depot. Called once per
 * parcel per handheld, a few thousand times on a weekday morning.
 */
export function recordScan(db: Db, scan: Scan): ScanResult {
  const parcel = db
    .prepare('SELECT id, status FROM parcels WHERE barcode = ?')
    .get<ParcelRow>(scan.barcode);
  if (!parcel) throw new UnknownBarcode(`no parcel with barcode ${scan.barcode}`);

  db.exec('BEGIN');
  db.prepare('INSERT INTO scans (parcel_id, station, scanned_at) VALUES (?, ?, ?)').run(
    parcel.id,
    scan.station,
    new Date().toISOString()
  );
  db.prepare("UPDATE parcels SET status = 'at-depot' WHERE id = ?").run(parcel.id);
  db.exec('COMMIT');

  return { parcelId: parcel.id, barcode: scan.barcode, status: 'at-depot' };
}
