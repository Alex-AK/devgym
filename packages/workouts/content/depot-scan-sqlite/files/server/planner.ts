export interface PlannedParcel {
  id: number;
  barcode: string;
  postcode: string;
  weight_grams: number;
}

export interface Stop {
  parcelId: number;
  postcode: string;
}

let duringNextPlan: (() => void) | null = null;

/**
 * Test-only. Runs `fn` part-way through the next `planRunOrder`, which is where
 * a real run spends its time. It is how a checkpoint puts a scan in the middle
 * of a manifest run. You do not need to call it.
 */
export function runDuringNextPlan(fn: () => void): void {
  duringNextPlan = fn;
}

/**
 * Work out the drop order for a van: nearest sort code first, and the heavier
 * parcel first where two drops share one. Pure, and slow enough on a full van to
 * be the part of the run somebody notices.
 */
export function planRunOrder(parcels: PlannedParcel[]): Stop[] {
  const sorted = [...parcels].sort(
    (a, b) => a.postcode.localeCompare(b.postcode) || b.weight_grams - a.weight_grams || a.id - b.id
  );

  const hook = duringNextPlan;
  duringNextPlan = null;
  hook?.();

  return sorted.map((parcel) => ({ parcelId: parcel.id, postcode: parcel.postcode }));
}
