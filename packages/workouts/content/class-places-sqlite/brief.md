# Thirteen people, twelve places

Beginners ceramics has twelve places. Thirteen people turned up to it on Tuesday and the tutor had to
send one of them home. The booking page had been showing the class as full since the Thursday before,
so nobody at the centre can work out how the thirteenth booking got in.

Two more things came in with the report:

- Life drawing did the same thing in January. Eight places, nine people.
- A member rang the desk to give up a place on a class that was full. The page went on showing that
  class as full for the rest of the day, and the desk gave the place away by hand in the end.

Nothing is in the logs for any of it: no errors, no warnings, no failed requests. Neither the booking
page nor the desk terminal reported anything at the time, and the centre cannot reproduce any of it
on a quiet afternoon.

## The task

`src/server/bookings.ts` is yours. `src/server/db.ts` and `src/server/members.ts` are not editable.

What has to be true when you are done:

- Two bookings taken at the same moment both count, and the class ends up saying what its bookings
  say.
- The last place in a class goes to one person. The other is told the class is full, and nothing of
  their booking is left behind.
- A cancellation taken while a booking is in flight gives its place back, and the place is still
  there afterwards.
- `places_left` equals `capacity` minus the bookings still in state `booked`, on every class, after
  anything the app does.
- `book` and `cancel` keep the signatures they have, and go on throwing `NotFound`, `NotAMember`,
  `ClassFull` and `NotBooked` where they throw them now.
- No new dependency.

## Notes

`db.ts` puts a booking database on disk and opens **two connections on it**, which is what two
processes have and what a single in-memory database cannot give you:

- `centre.web` is the connection the public booking page uses.
- `centre.desk` is the connection the front desk terminal uses.

The file is in WAL mode, and both connections are opened with better-sqlite3's `timeout` set to 0.
That option is `busy_timeout` under a different name: better-sqlite3 defaults it to 5000, SQLite's
own default is 0, and at 0 a statement that cannot have what it wants answers now instead of in five
seconds. The checkpoints drive both connections from one process, so a statement that waits on the
other connection waits for something that cannot finish while it is waiting.

Two tables, three classes and twenty-three bookings. Beginners ceramics has ten of its twelve places
taken, Life drawing seven of eight, and Wheel throwing is full.

```sql
CREATE TABLE classes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  places_left INTEGER NOT NULL
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('booked', 'cancelled')),
  booked_at TEXT NOT NULL
);
```

- `db.prepare(sql)` is better-sqlite3, so every call on it is synchronous. `.run(...)` answers with
  `{ changes, lastInsertRowid }`, `.get(...)` with a row or `undefined`, `.all(...)` with an array.
- `db.transaction(fn)` returns a function that runs `fn` between BEGIN and COMMIT and undoes all of
  it if `fn` throws. That function also carries `.deferred(...)`, `.immediate(...)` and
  `.exclusive(...)`, which choose which BEGIN it opens with. `db.inTransaction` says whether one is
  open.
- `checkMembership(memberId)` in `members.ts` answers from a fixed list of members, one of whom has
  let their membership lapse. It stands in for the call the real one makes to the membership service
  over the network, and it is by some distance the slowest thing a booking does.
- One test-only hook decides when one connection interrupts the other, so no checkpoint here depends
  on timing. `runDuringNextCheck(fn)` runs `fn` part-way through the next membership check. You do
  not need to call it.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Decide what the booking page should do for the person who asked for the last place a second too
  late: put them on a waiting list, or show them the class again and let them choose. Their booking
  wrote nothing, which is what makes one of those cheap.
- Postgres has `SELECT ... FOR UPDATE`, which locks the row you read and hands back the version of it
  that is current, so read, decide, write stays safe as a shape. Work out what SQLite offers instead
  and what it costs you, given that SQLite locks the database rather than the row.
- `places_left` is a count kept beside the rows it counts, which is why it can ever disagree with
  them. Work out what it buys over counting the bookings on every read, and what you would write to
  find out that it had drifted.
