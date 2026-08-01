import express, { type Express } from 'express';

// Everything you need is imported already.
import { requireAuth, signToken, type AuthedRequest } from './auth';
import { verifyPassword } from './passwords';
import { findUserByEmail } from './users';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // TODO: check the credentials with findUserByEmail and verifyPassword, then
  // answer { token }. Anything that does not check out is a 401 with no token.
  app.post('/login', (_req, res) => {
    res.status(501).json({ error: 'POST /login is not implemented' });
  });

  // TODO: put this behind requireAuth and answer with the token holder.
  app.get('/me', (_req: AuthedRequest, res) => {
    res.status(501).json({ error: 'GET /me is not implemented' });
  });

  return app;
}
