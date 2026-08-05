# One parcel in two hundred

The depot takes about four thousand scans on a weekday morning, and roughly one in two hundred comes
back refused. The driver scans the same parcel again and it goes straight through. Nobody has found
anything wrong with the parcels it happens to.

Two more things came in with the report:

- A refused scan puts a stack trace on the handheld's screen, not a message.
- Every scan on that handheld after it fails too, with a different error, until the app is
  restarted.

Ops say the refusals come in runs: a handful in a minute, then nothing for half an hour.

## The task

`src/server/scanning.ts` and `src/server/manifests.ts` are yours. `src/server/db.ts` and
`src/server/planner.ts` are not editable.

What has to be true when you are done:

- A scan taken while a manifest run is working out a drop order is accepted, and so is the run.
- A scan the database genuinely cannot take throws `DepotBusy` and leaves nothing behind: no scan
  row, and the parcel where it was.
- A handheld that has been refused once takes the next scan. One refusal is one refusal.
- A manifest run still writes one line per parcel at the depot for that van, in drop order,
  replacing whatever was there, and still refuses a van that has already left.
- `recordScan` and `buildManifest` keep the signatures they have. Everything else across those two
  files is yours to move.
- No new dependency.

## Notes

`db.ts` puts a depot database on disk and opens **two connections on it**, which is what two
processes have and what a single in-memory database cannot give you:

- `depot.handheld` is the connection a handheld's scans go down.
- `depot.office` is the connection the manifest run uses.

The file is in WAL mode, and both connections are opened with better-sqlite3's `timeout` set to 0.
That option is `busy_timeout` under a different name: better-sqlite3 defaults it to 5000, SQLite's
own default is 0, and at 0 a statement that cannot have what it wants answers now instead of in five
seconds. The checkpoints drive both connections from one process, so a statement that waits on the
other connection waits for something that cannot finish while it is waiting.

Four tables, with two vans and eight parcels in them. Van 1 is loading: five of its parcels are at
the depot and two are still expected. Van 2 left this morning.

```sql
CREATE TABLE vans (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  manifest_built_at TEXT,
  dispatched_at TEXT
);

CREATE TABLE parcels (
  id INTEGER PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  postcode TEXT NOT NULL,
  weight_grams INTEGER NOT NULL,
  van_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('expected', 'at-depot'))
);

CREATE TABLE scans (
  id INTEGER PRIMARY KEY,
  parcel_id INTEGER NOT NULL,
  station TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

CREATE TABLE manifest_lines (
  id INTEGER PRIMARY KEY,
  van_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  parcel_id INTEGER NOT NULL,
  postcode TEXT NOT NULL
);
```

- `db.prepare(sql)` is better-sqlite3, so every call on it is synchronous. `.run(...)` answers with
  `{ changes, lastInsertRowid }`, `.get(...)` with a row or `undefined`, `.all(...)` with an array.
- `db.transaction(fn)` returns a function that runs `fn` between BEGIN and COMMIT and undoes all of
  it if `fn` throws. That function also carries `.deferred(...)`, `.immediate(...)` and
  `.exclusive(...)`, which choose which BEGIN it opens with. `db.inTransaction` says whether one is
  open.
- `planRunOrder(parcels)` in `planner.ts` works out the drop order. It is pure, it touches no
  database, and on a full van it is the part of the run that takes a while.
- Two test-only hooks decide when one connection interrupts the other, so no checkpoint here depends
  on timing. `runDuringNextPlan(fn)` runs `fn` part-way through the next plan, and
  `db.beforeWrite(fn, skip)` runs `fn` immediately before the next INSERT, UPDATE or DELETE on that
  connection. You do not need to call either.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Decide what a handheld should do with a `DepotBusy`: send the scan again at once, wait first, or
  put it in front of the driver. The refused scan wrote nothing, which is what makes one of those
  answers cheap.
- `busy_timeout` is the setting that would have hidden this. Read what it actually does, then work
  out what a five-second one does to a handheld under load, and why waiting is not queueing: SQLite
  does not order the waiters, so the busiest moment is also the one where a waiter is least likely
  to get in.
- The run reads the van, plans, then writes. Work out what a van dispatched in between should do to
  the manifest, and which of the two reads you would trust for that.
