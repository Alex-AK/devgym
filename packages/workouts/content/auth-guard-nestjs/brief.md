# The ownership check is in the wrong place

`GET /reports/:id` checks that the report belongs to whoever is asking. It was written when that was
the only route on the controller. There are four now.

Read all of them before you change anything.

## The task

**`src/server/owner.guard.ts`** — currently a stub that waves everything through. Make it the one
place the ownership question gets answered.

**`src/server/reports.controller.ts`** — apply the guard where it covers everything, and take the
check back out of the handler that has it.

The rules, once and for all four routes:

- No `x-user` header, or a blank one: **401**. Before anything is looked up.
- A report that belongs to somebody else: **403**, and nothing happens to it.
- A report id that does not exist: **404**, for a caller who is allowed to ask.
- `GET /reports` returns the caller's own reports and nobody else's.

401 is "I do not know who you are". 403 is "I know, and no". Getting them the wrong way round leaks
which ids exist to someone who should not even be asking.

## Notes

The identity is the `x-user` header. There is no real authentication here; pretend the token has
already been checked and this is what it told you.

`ReportsService` is read-only and already has everything you need, including a `findFor(ownerId)`.

The fourth checkpoint reads the controller's metadata rather than its behaviour. That is deliberate,
and it is the actual lesson: four copies of the same `if` can all be correct today and still leave
the fifth route uncovered. A guard on the controller is the version that stays true.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Make the guard put the report it already loaded onto the request so the handler does not fetch it
  again, and decide whether that coupling is worth the round trip.
- Work out what changes if the same rule has to apply to a background job, where there is no request
  and no guard.
- An admin should see everything. Add that without giving the guard a second reason to change.
