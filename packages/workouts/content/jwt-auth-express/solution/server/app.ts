import express, { type Express } from 'express';

import { requireAuth, signToken, type AuthedRequest } from './auth';
import { verifyPassword } from './passwords';
import { findUserByEmail } from './users';

const BAD_CREDENTIALS = { error: 'Invalid email or password' };

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.post('/login', async (req, res) => {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(401).json(BAD_CREDENTIALS);
      return;
    }

    const user = findUserByEmail(email);
    // One answer for both cases. Saying "no such account" turns the endpoint
    // into a way to find out who has one.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json(BAD_CREDENTIALS);
      return;
    }

    res.json({ token: await signToken(user) });
  });

  app.get('/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Field by field. Spreading the user would send the password hash with it.
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  return app;
}
