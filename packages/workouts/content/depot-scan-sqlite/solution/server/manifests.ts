import type { Db } from './db';
import { planRunOrder, type PlannedParcel } from './planner';

export interface ManifestSummary {
  vanId: number;
  code: string;
  stops: number;
}

/** No van with that id. */
export class NotFound extends Error {}

/** The van has already left, so its manifest is history. */
export class AlreadyDispatched extends Error {}

interface VanRow {
  id: number;
  code: string;
  dispatched_at: string | null;
}

/**
 * Build the outbound manifest for a van: every parcel sitting at the depot for
 * it, in drop order. Runs when the loader closes the van, and again whenever
 * anybody asks for a reprint.
 *
 * The run reads and plans with nothing open, then writes. Planning is the slow
 * part and it needs no lock, and a transaction held across it is a transaction
 * held across every scan the depot takes in the meantime.
 */
export function buildManifest(db: Db, vanId: number): ManifestSummary {
  const van = db
    .prepare('SELECT id, code, dispatched_at FROM vans WHERE id = ?')
    .get<VanRow>(vanId);
  if (!van) throw new NotFound(`no van ${vanId}`);
  if (van.dispatched_at) throw new AlreadyDispatched(`van ${van.code} has already left`);

  const parcels = db
    .prepare(
      `SELECT id, barcode, postcode, weight_grams FROM parcels
       WHERE van_id = ? AND status = 'at-depot'`
    )
    .all<PlannedParcel>(vanId);

  const stops = planRunOrder(parcels);

  const write = db.transaction((): ManifestSummary => {
    // Read again under the lock. The van could have been dispatched while the
    // drop order was being worked out, and a manifest for a van that has left
    // is a reprint nobody asked for.
    const current = db.prepare('SELECT dispatched_at FROM vans WHERE id = ?').get<VanRow>(vanId);
    if (current?.dispatched_at) throw new AlreadyDispatched(`van ${van.code} has already left`);

    db.prepare('DELETE FROM manifest_lines WHERE van_id = ?').run(vanId);

    const line = db.prepare(
      'INSERT INTO manifest_lines (van_id, position, parcel_id, postcode) VALUES (?, ?, ?, ?)'
    );
    stops.forEach((stop, index) => line.run(vanId, index + 1, stop.parcelId, stop.postcode));

    db.prepare('UPDATE vans SET manifest_built_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      vanId
    );

    return { vanId, code: van.code, stops: stops.length };
  });

  // Immediate, because the first statement in there is a read: a deferred BEGIN
  // would take the write lock only at the DELETE, and anything committed in
  // between makes that read a stale snapshot the write cannot sit on top of.
  return write.immediate();
}
