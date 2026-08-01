# Login and a protected route

The users are seeded and their passwords are already hashed. What is missing is everything between a
correct password and a request that the server trusts.

## The task

Implement token auth across two files.

**`src/server/auth.ts`**

- `signToken(user)` returns a JWT signed HS256 with `SECRET_KEY` from `config.ts`.
  - The subject claim is the user's id, as a string.
  - It expires. `TOKEN_TTL_SECONDS` is there for you, and anything over an hour fails the checkpoint.
- `requireAuth` is Express middleware. It reads `Authorization: Bearer <token>`, verifies it, puts
  the user on `req.user`, and calls `next()`.
  - Missing header, wrong scheme, junk token, wrong signature, expired, unknown subject: all 401.
  - Verification rejects rather than throwing, so catch it. An uncaught rejection is a 500, and a 500
    on a bad token is a bug.

**`src/server/app.ts`**

- `POST /login` takes `{ email, password }`.
  - Correct: `200` and `{ token }`.
  - Anything else: `401` and no token.
  - A wrong password and an unknown address get the identical status and body. Otherwise the endpoint
    is a free list of who has an account.
- `GET /me` sits behind `requireAuth` and returns `{ id, email, name }` for the token holder.
  - The password hash never appears in a response.

## Notes

`verifyPassword(plain, stored)` in `passwords.ts` does the scrypt comparison for you. This workout is
about tokens, not hashing.

Three seeded users. Ada is `ada@example.com` / `correct-horse`, and the rest are in `users.ts`.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Add a refresh endpoint that takes a live token and returns a new one, without a second password
  check.
- Put an `iss` and `aud` on the token and verify both, so a token minted by another service of yours
  is not accepted here.
- Add a `requireRole` middleware that builds on `requireAuth` instead of re-verifying the token.
