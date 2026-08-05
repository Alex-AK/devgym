import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDepot, type Depot } from '../../src/server/db';
import { AlreadyDispatched, buildManifest, NotFound } from '../../src/server/manifests';

let depot: Depot;

beforeEach(() => {
  depot = createDepot();
});

afterEach(() => {
  depot.close();
});

const lines = (vanId: number) =>
  depot.office
    .prepare('SELECT position, parcel_id FROM manifest_lines WHERE van_id = ? ORDER BY position')
    .all<{ position: number; parcel_id: number }>(vanId);

const van = (vanId: number) =>
  depot.office
    .prepare('SELECT manifest_built_at FROM vans WHERE id = ?')
    .get<{ manifest_built_at: string | null }>(vanId);

describe('a manifest run with nothing else going on', () => {
  it('lists every parcel at the depot for that van, in drop order', () => {
    const summary = buildManifest(depot.office, 1);

    expect(summary).toEqual({ vanId: 1, code: 'WX21 ABC', stops: 5 });
    expect(lines(1)).toEqual([
      { position: 1, parcel_id: 4 },
      { position: 2, parcel_id: 2 },
      { position: 3, parcel_id: 1 },
      { position: 4, parcel_id: 5 },
      { position: 5, parcel_id: 3 },
    ]);
  });

  it('stamps the van with when the manifest was built', () => {
    buildManifest(depot.office, 1);

    expect(van(1)?.manifest_built_at).toEqual(expect.any(String));
  });

  it('replaces the previous manifest rather than adding to it', () => {
    buildManifest(depot.office, 1);
    buildManifest(depot.office, 1);

    expect(lines(1)).toHaveLength(5);
  });

  it('refuses a van that has already left, and leaves its manifest alone', () => {
    expect(() => buildManifest(depot.office, 2)).toThrow(AlreadyDispatched);

    expect(lines(2)).toEqual([{ position: 1, parcel_id: 8 }]);
  });

  it('refuses a van id that is no van', () => {
    expect(() => buildManifest(depot.office, 99)).toThrow(NotFound);
  });
});
