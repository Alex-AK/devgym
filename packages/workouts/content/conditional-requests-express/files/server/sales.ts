export interface ReportRow {
  region: string;
  sku: string;
  units: number;
  revenuePence: number;
}

export interface SalesReport {
  rows: ReportRow[];
  totalUnits: number;
  totalRevenuePence: number;
}

interface StoredRow {
  region: string;
  sku: string;
  units: number;
  unitPence: number;
}

const REGIONS = ['north', 'south', 'east', 'west', 'central', 'coastal', 'islands', 'overseas'];
const SKUS_PER_REGION = 300;

/**
 * The sales table, and the report built from it.
 *
 * Two of the fields here have no equivalent in a real service and exist so the
 * checkpoints can see what the endpoint did: `revision`, which every write bumps,
 * and `builds`, which counts how many times the report was actually assembled.
 */
export class Sales {
  /** Goes up by one on every write. Reading it costs nothing. */
  revision = 1;

  /** How many times `buildReport` has run. */
  builds = 0;

  private readonly rows: StoredRow[] = [];

  constructor() {
    for (const region of REGIONS) {
      for (let i = 1; i <= SKUS_PER_REGION; i += 1) {
        this.rows.push({
          region,
          sku: `SKU-${String(i).padStart(4, '0')}`,
          units: 20 + ((i * 7) % 90),
          unitPence: 1200 + (i % 17) * 35,
        });
      }
    }
  }

  /** A sale lands. Whatever anybody is holding is now out of date. */
  recordSale(region: string, sku: string, units: number): void {
    const row = this.rows.find((candidate) => candidate.region === region && candidate.sku === sku);
    if (!row) throw new Error(`no such line: ${region}/${sku}`);

    row.units += units;
    this.revision += 1;
  }

  /**
   * Assemble the report. Here it is a loop over an array; in production it is an
   * aggregate across the sales table that takes most of a second, which is why
   * the counter above is worth reading.
   */
  buildReport(): SalesReport {
    this.builds += 1;

    const rows: ReportRow[] = [];
    let totalUnits = 0;
    let totalRevenuePence = 0;

    for (const row of this.rows) {
      const revenuePence = row.units * row.unitPence;
      rows.push({ region: row.region, sku: row.sku, units: row.units, revenuePence });
      totalUnits += row.units;
      totalRevenuePence += revenuePence;
    }

    return { rows, totalUnits, totalRevenuePence };
  }
}
