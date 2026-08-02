import type { Request, Response } from 'express';

import type { Db, KeyRecord } from './db';
import { fingerprint } from './fingerprint';
import type { ChargeInput, FakeGateway } from './gateway';

export function createPaymentsHandler(db: Db, gateway: FakeGateway) {
  const claim = db.prepare(
    `INSERT OR IGNORE INTO idempotency_keys (key, fingerprint, state)
     VALUES (?, ?, 'in_progress')`
  );
  const find = db.prepare('SELECT * FROM idempotency_keys WHERE key = ?');
  const finish = db.prepare(
    `UPDATE idempotency_keys SET state = 'done', status_code = ?, response = ? WHERE key = ?`
  );

  return async function payments(req: Request, res: Response): Promise<void> {
    const key = req.get('Idempotency-Key')?.trim();
    if (!key) {
      res.status(400).json({ error: 'Idempotency-Key is required' });
      return;
    }

    const payment = req.body as ChargeInput;
    const digest = fingerprint(payment);

    // The insert is the check. Two requests can both miss a SELECT and both go
    // on to charge; only one of them can win the primary key.
    const claimed = claim.run(key, digest).changes === 1;

    if (!claimed) {
      // The claim only loses to a row that is already there, so this finds one.
      const seen = find.get<KeyRecord>(key) as KeyRecord;

      if (seen.fingerprint !== digest) {
        res.status(422).json({ error: 'This Idempotency-Key was used for a different payment' });
        return;
      }
      if (seen.state !== 'done') {
        res.status(409).json({ error: 'A payment with this key is already in progress' });
        return;
      }

      // The replay: the answer the first request gave, read back rather than
      // worked out again. A replayed create is still a 201.
      res.status(seen.status_code ?? 200).json(JSON.parse(seen.response ?? 'null'));
      return;
    }

    const charge = await gateway.charge(payment);

    finish.run(201, JSON.stringify(charge), key);
    res.status(201).json(charge);
  };
}
