# Charge the card once

A customer pressed pay, watched nothing happen for a few seconds, and pressed it again. Both
requests reached `POST /payments` and both charges cleared. Support refunded one of them by hand.

## The task

Implement the handler in `src/server/payments.ts`. `app.ts` wires it up, and the gateway, the table
and the fingerprint helper are already there.

The client sends an `Idempotency-Key` header with every attempt at one payment, and reuses the same
key unchanged when it retries. Five cases:

- **No key.** `400`, and nothing is charged.
- **A key you have never seen.** Charge the card and answer `201` with the charge.
- **A key you have finished with.** Answer with what you answered the first time, the same status and
  the same body, read back rather than worked out again. The card is not charged.
- **A key you are still working on.** `409`. Two attempts at one payment can be in the air at the
  same time, and it still has to cost one charge.
- **A key you have seen, carrying a different body.** `422`. The client changed the payment and kept
  the key, so replaying the old one and charging the new one are both wrong.

A key you have never seen is a new payment even when the body is identical to one you already have:
somebody is allowed to buy the same thing twice.

## Notes

`db.ts` already has the table, and nothing else uses it:

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('in_progress', 'done')),
  status_code INTEGER,
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `db.prepare(sql)` is better-sqlite3, so every call is synchronous. `.run(...)` answers with
  `{ changes }`, `.get(...)` with a row or `undefined`.
- `fingerprint(body)` digests a request body. Key order does not change the digest, so a client that
  reorders its JSON is not accused of changing the payment.
- `gateway.charge(payment)` returns the charge and takes a moment to come back, the way a call over
  the network does. It counts what it has been asked to do, which is how the checkpoints tell one
  charge from two. Its `hold`, `release` and `nextCharge` are test-only; you do not need them.
- The body arrives validated. `req.body` is `{ customerId, amountCents, currency }`.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- The gateway can fail. Work out what your handler leaves behind when a charge throws, and what
  every retry with that key gets afterwards.
- Write the client half. Where `crypto.randomUUID()` is called decides whether any of this works: one
  key per attempt is no key at all.
- Keys need not live forever: Stripe's can be removed once they are at least 24 hours old. Add the
  sweep, then decide what a client retrying with a swept key should be told.
