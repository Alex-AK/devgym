# Rate limit an endpoint with Redis

`POST /messages` is getting hammered by one client and everybody else is waiting behind it. Put a
limiter in front of it.

## The task

Implement `createRateLimit` in `src/server/rate-limit.ts`. It takes the Redis client and
`{ limit, windowSeconds }`, and returns Express middleware. `app.ts` has already wired it up.

**Fixed window.** A client gets `limit` requests per `windowSeconds`. The window opens on their first
request and runs for `windowSeconds` from there.

**Who the client is.** The `X-API-Key` header if there is one, otherwise the request's IP. A request
with no key is a client too, not an error.

**On the way through**, every response carries:

- `RateLimit-Limit` — the allowance
- `RateLimit-Remaining` — what is left of it, never below zero
- `RateLimit-Reset` — seconds until the window turns over

**Once the allowance is gone**, answer `429` with a `Retry-After` in whole seconds, and do not let the
request reach the handler.

## Notes

`FakeRedis` is a real enough Redis for this: `incr`, `expire`, `ttl`, `get`, `set`, `del`, with the
semantics the real ones have. Two of them are worth reading before you rely on them.

- `incr` on a key that does not exist creates it at 1 **with no deadline**. Nothing expires by itself.
- `ttl` answers `-1` when a key has no deadline and `-2` when there is no key.

It also has an `advanceTime(seconds)` that real Redis does not, which is how the checkpoints wait out
a sixty-second window without taking sixty seconds.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Two round trips per request is one more than you need. Work out what a Lua script or a pipeline
  would save, and whether it is worth the deploy complexity.
- A fixed window lets a client spend its whole allowance at the end of one window and again at the
  start of the next, so a limit of 5 a minute can serve 10 requests in two seconds. Sketch what a
  sliding window would cost to store.
- Decide what should happen when Redis is down. Letting everyone through and letting nobody through
  are both defensible, and the wrong one is an outage.
