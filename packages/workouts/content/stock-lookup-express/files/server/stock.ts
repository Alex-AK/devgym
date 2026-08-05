export interface StockLevel {
  branch: string;
  sku: string;
  units: number;
}

interface Movement {
  branch: string;
  sku: string;
  /** Positive for stock arriving, negative for stock leaving. */
  units: number;
}

const BRANCHES = ['leeds', 'hull', 'derby', 'exeter', 'stirling', 'newport'];
const FAMILIES = ['DRILL', 'SANDER', 'SAW', 'ROUTER', 'PLANER', 'CHISEL', 'TORCH', 'LADDER'];
const SIZES = 5;

/**
 * The stock movements, and the count built from them.
 *
 * One field here has no equivalent in a real service and exists so the
 * checkpoints can see what the endpoint did: `counts`, which goes up every time
 * a count is actually assembled.
 */
export class Stock {
  /** How many times `countUnits` has run. */
  counts = 0;

  private readonly movements: Movement[] = [];

  constructor() {
    FAMILIES.forEach((family, familyIndex) => {
      for (let size = 1; size <= SIZES; size += 1) {
        const sku = `${family}-${String(size).padStart(2, '0')}`;
        const skuIndex = familyIndex * SIZES + (size - 1);

        BRANCHES.forEach((branch, branchIndex) => {
          // No two branches hold the same number of the same item, and no two
          // items sit at the same number in one branch. A count that comes back
          // right by accident is a count nobody can trust.
          this.movements.push({ branch, sku, units: 20 + skuIndex * 6 + branchIndex });
          this.movements.push({ branch, sku, units: 12 });
          this.movements.push({ branch, sku, units: -20 });
        });
      }
    });
  }

  /**
   * How many of one item are on the shelf at one branch.
   *
   * Here that is a walk over an array. In production it is an aggregate across
   * the movements table, which is why the counter above is worth reading.
   */
  countUnits(branch: string, sku: string): number {
    this.counts += 1;

    let units = 0;
    for (const movement of this.movements) {
      if (movement.branch === branch && movement.sku === sku) units += movement.units;
    }
    return units;
  }

  /** A delivery lands. Anything stored against this branch and item is now short. */
  recordDelivery(branch: string, sku: string, units: number): void {
    this.movements.push({ branch, sku, units });
  }
}
