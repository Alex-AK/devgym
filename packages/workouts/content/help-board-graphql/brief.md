# One request now, and the board is still slow

The help board's screen used to fire eleven requests to draw itself. It moved to GraphQL last month
and the waterfall in the network tab collapsed to a single POST.

It is still slow, and the slowness has a shape: the more replies on screen, the longer it takes.
There is one request in the network tab now, and nothing in it to point at.

## The task

Fix `src/server/graph.ts`. It holds the schema and every resolver behind `runQuery` in `api.ts`.

The response has to come back identical: the same threads in the same order, the same replies on
each, the same author against each reply. Fast and wrong is not an improvement.

Two more things have to be true when you are done:

- No new dependency. Everything you need is already installed.
- Two requests run one after the other each see the database as it is at the time, not as it was.

## How the checkpoints judge it

Not on a stopwatch, which would be flaky. On what the request asked the database for. Every
statement drizzle runs is pushed onto `workspace.queries` in order, and the checkpoints run the same
document twice, once over a small slice of the board and once over a larger one.

## Notes

`runQuery` calls `createContext(workspace)` once per request, and hands whatever it returns to every
resolver as the third argument.

The board is seeded and deterministic: 4 teams, 18 authors, 40 threads, and a few replies on each.
Two rows are awkward on purpose, and checkpoint 1 is where you meet them.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- `posts` takes no arguments, so a thread with four thousand replies sends all four thousand. Add
  pagination to that field and work out which of your checkpoints notices.
- The client writes the shape, so it can write one you cannot afford. Decide what a depth limit on
  this schema would refuse, and where you would enforce it.
- Everything is one POST to one URL now, so the browser cache, the CDN and the reverse proxy have
  stopped contributing. Read what a persisted document would buy back, and what it costs.
