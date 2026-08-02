---
title: Storing a password
question: It is hashed, so why is that not the end of it?
order: 3
practise:
  - security-password-compare
  - security-password-hashing
  - security-rate-limit-auth
sources:
  - author: OWASP
    title: Password Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - author: OWASP
    title: Authentication Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  - author: IETF
    title: 'RFC 9106: Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications'
    url: https://www.rfc-editor.org/rfc/rfc9106.html
  - author: IETF
    title: 'RFC 7914: The scrypt Password-Based Key Derivation Function'
    url: https://www.rfc-editor.org/rfc/rfc7914.html
  - author: NIST
    title: NIST Special Publication 800-63B
    url: https://pages.nist.gov/800-63-4/sp800-63b.html
  - author: Node.js
    title: Crypto
    url: https://nodejs.org/api/crypto.html
  - author: C2SP
    title: PHC Strings
    url: https://c2sp.org/phc-strings
  - author: OpenBSD
    title: crypt(3)
    url: https://man.openbsd.org/crypt.3
  - author: OpenBSD
    title: crypt_checkpass(3)
    url: https://man.openbsd.org/crypt_checkpass.3
verified: 2026-08-02
---

## The model

Hashing stops the database from being a list of passwords. It does not stop anyone guessing one.
Cracking a stolen table is three steps and none of them touch your server: pick a candidate, hash
it, compare it to the stored value. The only thing you control is what one guess costs.

That is why a general-purpose hash is the wrong tool. OWASP: "Fast hashing algorithms such as
SHA-256 are not suitable for password storage because they allow attackers to perform large numbers
of guesses quickly." You compute one hash per login; an attacker computes one per candidate against
every account in the dump at once, on GPUs and rented servers, where "the cost to an attacker is
relatively small". A password hash is slow on purpose, and how slow is yours to set.

### The work factor is a dial you are expected to turn

"The work factor is the number of iterations of the hashing algorithm that are performed for each
password (usually, it's actually `2^work` iterations)." Turning it up costs you one slower login and
costs the attacker every guess they were going to make. NIST: the cost factor "SHOULD be as high as
practical without negatively impacting verifier performance", and "SHOULD be increased over time".
OWASP caps it: "calculating a hash should take less than one second."

The login path pays that in real CPU and real memory, and set too high it lets an attacker "carry
out a denial of service attack by exhausting the server's CPU with a large number of login
attempts". Do the work off the event loop: Node's `crypto.argon2` and `crypto.scrypt` take a
callback for that reason, and their `Sync` twins block everything while they run.

### Salt, and where it actually lives

A salt is "a unique, randomly generated string that is added to each password as part of the hashing
process". It buys two things. Precomputation stops working, because it "protects against an
attacker's pre-computing hashes using rainbow tables". And two accounts stop giving each other away:
with different salts it "is impossible to determine whether two users have the same password without
cracking the hashes".

There is no salt column. Libraries "automatically generate and manage salts internally", and the
string they hand back contains it. Argon2 uses the PHC string format,
`$<id>[$v=<version>][$<param>=<value>(,<param>=<value>)*][$<salt>[$<hash>]]`, and bcrypt separates
"the version number, the logarithm of the number of rounds and the concatenation of salt and hashed
password" with `$`:

```
$argon2id$v=19$m=65536,t=2,p=1$gZiV/M1gPc22ElAH/Jh1Hw$CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno
$2b$12$FPWWO2RJ3CK4FINTw0Hi8OiPKJcX653gzSS.jqltHFMxyDmmQ0Hqq
```

In the bcrypt line, `12` is the log of the round count and the rest is 128 bits of salt followed by
the hash. One text column holds all of it, which is what NIST asks for: "A reference to the password
hashing scheme used, including the cost factor, SHOULD be stored for each password to allow
migration to new algorithms and work factors."

### Memory-hardness

Iteration count alone loses ground every year. RFC 7914: circuits "do not merely become faster; they
also become smaller, allowing for a larger amount of parallelism at the same cost", so "even when
the iteration count is increased so that the time taken to verify a password remains constant, the
cost of finding a password by using a brute-force attack implemented in hardware drops each year".

Memory is the counter. scrypt "aims to reduce the advantage that attackers can gain by using
custom-designed parallel circuits" by making each guess need a large working set rather than a lot
of arithmetic, and memory does not shrink the way logic does: a chip wanting a thousand guesses in
flight buys a thousand times the RAM. Argon2 is "a memory-hard function" on the same principle. Use
the id variant, which gives "both side-channel attack protection and brute-force cost savings due to
time-memory trade-offs" and "MUST be supported by any implementation" of RFC 9106.

### The current recommendations

From the OWASP Password Storage Cheat Sheet as of this page's verified date. These numbers move.

- **Argon2id** first: "a minimum configuration of 19 MiB of memory, an iteration count of 2, and 1
  degree of parallelism". Five settings of equal defence, trading CPU against RAM: m=47104 (46 MiB),
  t=1; m=19456 (19 MiB), t=2; m=12288 (12 MiB), t=3; m=9216 (9 MiB), t=4; m=7168 (7 MiB), t=5. All
  at p=1.
- **scrypt** where Argon2id is not available: "a minimum CPU/memory cost parameter of (2^17), a
  minimum block size of 8 (1024 bytes), and a parallelization parameter of 1". The rest of that list
  raises p as N falls, at r=8: N=2^16, p=2; N=2^15, p=3; N=2^14, p=5; N=2^13, p=10.
- **bcrypt** for legacy systems only. It "should only be used for password storage in legacy systems
  where Argon2 and scrypt are not available", with "a work factor of 10 or more and with a password
  limit of 72 bytes".
- **PBKDF2** where a standard demands it: "If FIPS-140 compliance is required, use PBKDF2 with a
  work factor of 600,000 or more and set with an internal hash function of HMAC-SHA-256."

RFC 9106 aims higher than that floor. Argon2id with "t=1 iteration, p=4 lanes, m=2^(21) (2 GiB of
RAM), 128-bit salt, and 256-bit tag size" is its FIRST RECOMMENDED option, 64 MiB its SECOND for
"memory-constrained environments". Both are right for different machines, and a login endpoint
serves concurrent requests out of the RAM it has. Pick a row, then measure.

### bcrypt's sharp edges

bcrypt reads 72 bytes of password and no more: OpenBSD states it flatly, "The maximum password
length is 72." OWASP's instruction is to enforce that rather than discover it, "a maximum password
length of 72 bytes (or less if the bcrypt implementation in use has smaller limits)". Reject long
input instead of hashing a prefix, because NIST requires verifiers to "verify the entire submitted
password (e.g., not truncate it)".

Pre-hashing to shorten the input is the usual workaround, and OWASP calls it "dangerous" for two
reasons. Null bytes are the first: "The original bcrypt expects a null terminated password string,
this means that the hash value will only be used to the first null byte", so every password whose
digest starts with a zero byte hashes to the same thing as the empty string. Base64 fixes that one;
the second survives it. Password shucking "uses the fact, that it is easy to check if
`bcrypt(base64(H($password))), $salt, $cost) == bcrypt(base64($leaked_hash), $salt, $cost)`", so if
that password's inner hash leaked elsewhere, cracking yours collapses into breaking the inner hash.
`bcrypt(base64(sha512($password)))` "is a **dangerous practice** and is as secure as just using pure
SHA-512". OWASP's form, if you must, is `bcrypt(base64(hmac-sha384(data:$password, key:$pepper)),
$salt, $cost)`, with the pepper kept out of the database.

### Comparing, peppers, upgrading

Compare with the library's own verify function, never with `===`. A comparison that returns as soon
as two bytes differ runs longer the more of the prefix matched, so its duration leaks how much was
right: that is a timing side channel. Node's `crypto.timingSafeEqual` compares "using a
constant-time algorithm" and "does not leak timing information that would allow an attacker to guess
one of the values". A library's `verify` does that, and reads the parameters out of the encoded
string on the way, so it still checks hashes made with settings you no longer use.

A pepper is a secret shared across every stored hash and kept out of the database, so a leaked table
alone is not enough to start guessing. NIST describes it as "an additional iteration of a keyed
hashing or encryption operation using a secret key known only to the verifier". The commitment is
key management, not code: the key belongs in "secrets vaults" or HSMs, and rotation is close to
impossible, because "Peppers cannot be changed without knowledge of a user's password", so changing
one forces a password reset on everyone it protected.

Raising the work factor or changing algorithm can only happen in the one moment the plaintext passes
through your process, so you "wait until the user next authenticates, then re-hash their password
with the new work factor". You cannot rehash what you do not have, so expect a mixed table.

### The endpoint around the hash

A good hash protects the dump. It does nothing about guessing against your live login. The
algorithms live in [rate limiting](../apis/rate-limiting.md); what a login adds is what you count
against. Count per account, because "The counter of failed logins should be associated with the
account itself, rather than the source IP address, in order to prevent an attacker from making login
attempts from a large number of different IP addresses". Count per source too, or a spray tries one
password against every account and trips no account counter. NIST bounds the account counter at "no
more than 100" consecutive failures before that authenticator is disabled.

Then enumeration. The application "must respond with a generic error message" whether the password
was wrong, the account is missing, or the account is locked, because any difference is a
"discrepancy factor" that turns the login form into a test for whether an address has an account.
Timing is a difference too: returning early for a missing user skips the most expensive thing the
handler does. OpenBSD builds the fix into its API: "If the hash is NULL, authentication will always
fail, but a default amount of work is performed to simulate the hashing operation."

## Worked example

The login path with a password-hashing library, which is the version you should write:

```js
const DUMMY_HASH = await argon2.hash(randomUUID()); // a real hash of a value nobody knows
const GENERIC = { status: 401, body: { error: 'Invalid email or password' } };

async function login(email, password) {
  const user = await users.findByEmail(email);

  // Hash either way, so a missing account is not the fast path.
  const ok = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);
  if (!user || !ok) return GENERIC;

  // The parameters are in the stored string, so "stale" compares them against current settings.
  if (isStale(user.passwordHash)) {
    await users.setPasswordHash(user.id, await argon2.hash(password));
  }

  return { status: 200, body: startSession(user) };
}
```

Node has shipped the primitive in core since v24.7.0, and it shows what the library hides:
`crypto.argon2` wants `memory` ("memory cost in 1KiB blocks", so 19456 is OWASP's 19 MiB), `passes`,
`parallelism` and a `nonce` you generate and store yourself, and it returns a raw tag with no
encoded string and no verify, which is what `crypto.timingSafeEqual` is then for.

## Traps

**Hashing the right password gives a different string from the one in the database.** Every call
salts afresh, so `hash(password) === stored` is false for a correct password and always will be.
Pass the stored hash to the library's `verify`, which reads the salt and the parameters out of it.

**Two different long passphrases log the same user in.** bcrypt reads at most 72 bytes and those two
share their first 72. Enforce the limit at the boundary, and note it counts bytes, so an emoji costs
more than one character's worth.

**Everyone who chose the same password has the same value in the column.** Nothing is salted, which
in practice means a hand-rolled `sha256(password)` or one app-wide salt constant. That table is a
rainbow-table lookup from plaintext, and it tells an attacker which accounts to crack first.

**The cost factor went up in config and nothing changed for existing users.** Old rows still carry
the old parameters, and no batch job can fix that because you do not have the plaintext. Rehash on
the next successful login, while the password is in memory.

**Pre-hashing to get past bcrypt's 72 bytes left the hash no stronger than SHA-512.** That is
password shucking: an attacker holding the inner hash from another breach tests it against your
bcrypt output directly, so your cost factor never enters the fight.

**A wrong email answers in milliseconds and a wrong password takes a quarter of a second.** The
handler returns early when the account is missing, so timing sorts real addresses from invented ones
even though both replies read "Invalid email or password". Hash against a dummy value on that path
and return the same body with the same status.
