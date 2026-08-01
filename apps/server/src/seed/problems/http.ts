import { code, md, type ProblemDraft } from './types';

export const httpProblems: ProblemDraft[] = [
  {
    slug: 'http-fetch-not-ok',
    title: 'fetch does not throw on 500',
    category: 'http',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This "works" even when the server returns `500`, and the catch block never runs:',
      '',
      code(
        'js',
        'try {',
        '  const data = await fetch(url).then((r) => r.json());',
        '} catch (err) {',
        '  showError(err);',
        '}'
      ),
      '',
      'Explain why, and what check is missing.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'network',
            'only reject',
            'does not reject',
            "doesn't reject",
            'still resolve',
            'resolves',
            'not an error',
          ],
          missingFeedback: 'When does a fetch promise actually reject?',
        },
        {
          synonyms: ['response.ok', 'res.ok', 'r.ok', '.ok', 'status'],
          missingFeedback: 'Which property do you have to check yourself?',
        },
      ],
      hints: [
        'fetch only rejects for network-level failures. DNS, connection refused, CORS, abort.',
        'An HTTP error status is a perfectly successful *round trip*, so the promise resolves.',
        'Check `response.ok` (or `response.status`) and throw yourself.',
      ],
    },
    canonicalAnswer:
      'fetch only rejects on network failures; an HTTP 500 is a successful round trip so the promise resolves normally. You have to check response.ok (or the status) yourself and throw.',
    solution: code(
      'js',
      'const response = await fetch(url);',
      'if (!response.ok) {',
      '  throw new Error(`Request failed: ${response.status}`);',
      '}',
      'const data = await response.json();'
    ),
    explanation:
      'The fetch promise rejects only when the request could not complete at all. DNS failure, connection refused, CORS rejection, or an abort. A `404` or `500` means the round trip **succeeded** and the server answered, so the promise resolves and your `catch` never fires; worse, `r.json()` then usually throws a confusing parse error on the HTML error page. Always branch on `response.ok` (true for 200-299) and throw a real error. This is the single most common fetch bug, and it is why `axios` feels different: it throws on non-2xx by default.',
  },

  {
    slug: 'http-body-once',
    title: 'Reading a response body twice',
    category: 'http',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'This throws `TypeError: body stream already read`:',
      '',
      code(
        'js',
        'const res = await fetch(url);',
        'const text = await res.text();',
        'const data = await res.json(); // 💥'
      ),
      '',
      'Explain why, and how to read it twice if you really need to.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['stream', 'once', 'consumed', 'used up', 'single', 'one time', 'drained'],
          missingFeedback:
            'What kind of thing is the response body, and how many times can it be read?',
        },
        {
          synonyms: ['clone', 'parse the text', 'json.parse'],
          missingFeedback: 'Name a way to get at it twice.',
        },
      ],
      hints: [
        'The body is a stream, not a buffer.',
        'Calling `.text()` or `.json()` consumes it; there is nothing left for the second call.',
        '`res.clone()` before reading, or read once as text and `JSON.parse` it yourself.',
      ],
    },
    canonicalAnswer:
      'The body is a one-shot stream. The first .text() consumes it, so the second read finds nothing. Use res.clone() before reading if you need it twice, or read it once as text and JSON.parse that string.',
    solution: code(
      'js',
      '// Option 1. Clone before reading',
      'const res = await fetch(url);',
      'const text = await res.clone().text();',
      'const data = await res.json();',
      '',
      '// Option 2. Read once, parse yourself (handy for logging bad payloads)',
      'const text2 = await res.text();',
      'const data2 = JSON.parse(text2);'
    ),
    explanation:
      'A `Response` body is a **ReadableStream**, so it can be consumed exactly once. That is what lets the browser start processing bytes before the whole payload has arrived, rather than buffering everything. `res.clone()` tees the stream so both copies can be read, at the cost of buffering. In error handling the second pattern is often nicer: read the text once, try to `JSON.parse` it, and if that fails you still have the raw body to put in the log instead of a useless parse error.',
  },

  {
    slug: 'http-post-json',
    title: 'POST a JSON body',
    category: 'http',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'The server rejects this with "unsupported media type" and an empty body:',
      '',
      code('js', 'await fetch(url, { method: "POST", body: { name: "Dana" } });'),
      '',
      'Name the two things wrong with the options object.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['stringify', 'json.stringify', 'string', 'serial'],
          missingFeedback: 'What has to happen to the object before it can be sent?',
        },
        {
          synonyms: ['content-type', 'content type', 'header', 'application/json'],
          missingFeedback: 'What must you tell the server about the body format?',
        },
      ],
      hints: [
        '`body` accepts a string, FormData, Blob or URLSearchParams. Not a plain object.',
        'A plain object gets stringified to `"[object Object]"`.',
        'You also need `headers: { "Content-Type": "application/json" }`.',
      ],
    },
    canonicalAnswer:
      'The body must be serialised with JSON.stringify, since a plain object becomes the string "[object Object]", and you must set the Content-Type header to application/json so the server parses it.',
    solution: code(
      'js',
      'await fetch(url, {',
      "  method: 'POST',",
      "  headers: { 'Content-Type': 'application/json' },",
      "  body: JSON.stringify({ name: 'Dana' }),",
      '});'
    ),
    explanation:
      '`body` accepts a string, `FormData`, `Blob`, `URLSearchParams` or a stream. A plain object is coerced with `String()`, producing the literal `"[object Object]"`, which is why the server sees garbage. `JSON.stringify` fixes the payload and `Content-Type: application/json` tells the server how to parse it; without the header most frameworks leave `req.body` empty. Note that `FormData` is the exception. You must **not** set `Content-Type` for it, because the browser has to generate the multipart boundary itself.',
  },

  {
    slug: 'http-put-vs-patch',
    title: 'PUT versus PATCH',
    category: 'http',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      "You are designing an endpoint to change just a user's email.",
      '',
      'Which method fits, and how does it differ from the other one in both semantics and idempotency?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['patch'],
          missingFeedback: 'Which method represents a partial update?',
        },
        {
          synonyms: ['replace', 'whole', 'entire', 'full', 'complete'],
          missingFeedback: 'What does PUT do to the resource?',
        },
        {
          synonyms: ['idempot'],
          missingFeedback: 'Use the word that describes "same request twice, same end state".',
        },
      ],
      hints: [
        'One method replaces the whole resource, the other applies a partial change.',
        'PUT replaces the entire representation. Omitted fields are meant to be cleared.',
        'PUT is required to be idempotent; PATCH is not necessarily (think "increment by 1").',
      ],
    },
    canonicalAnswer:
      'PATCH, because it is a partial update of one field. PUT replaces the entire resource, so omitted fields should be cleared, and PUT is required to be idempotent while PATCH need not be. A patch like "increment by 1" changes the result each time.',
    solution: md(
      '`PATCH /users/:id` with `{ "email": "new@example.com" }`.',
      '',
      '- **PUT**: replace the whole representation. Sending it twice leaves the same state, so it is idempotent.',
      '- **PATCH**: apply a partial change. Idempotent only if the patch itself is (a set is; an increment is not).'
    ),
    explanation:
      'PUT means "make the resource look exactly like this", so a PUT missing the `name` field is semantically a request to clear it. Sending a partial body to PUT is a common source of accidental data loss. PATCH describes a change to apply. **Idempotent** means repeating the identical request leaves the same end state: `GET`, `PUT` and `DELETE` are required to be, `POST` is not, and `PATCH` depends on the patch. This matters in practice because clients and proxies may safely retry idempotent requests after a timeout.',
  },

  {
    slug: 'http-401-vs-403',
    title: '401 versus 403',
    category: 'http',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A logged-in user with a valid session requests an admin-only page.',
      '',
      'Which status code should the server return: `401` or `403`?'
    ),
    graderConfig: {
      accept: ['403', '403 forbidden', 'forbidden'],
      acceptPatterns: ['\\b403\\b'],
      nearMisses: {
        '401':
          '401 means "I do not know who you are", but this user is authenticated, they just lack permission.',
        '401 unauthorized':
          '401 means "I do not know who you are", but this user is authenticated, they just lack permission.',
        '404':
          'Some APIs do return 404 to hide existence, but the direct answer here is a different code.',
      },
      hints: [
        'One code is about *authentication*, the other about *authorization*.',
        '401 = "who are you?"; the user here has already answered that.',
      ],
    },
    canonicalAnswer: '403',
    solution: md(
      '`403 Forbidden`. The user is authenticated, but not permitted.',
      '',
      '- `401 Unauthorized`: no or invalid credentials. Must include a `WWW-Authenticate` header. (Misnamed: it really means *unauthenticated*.)',
      '- `403 Forbidden`: credentials understood, access still denied. Re-authenticating will not help.'
    ),
    explanation:
      '`401` is about **authentication**: the server does not know who you are, and the correct client reaction is to log in and retry. `403` is about **authorization**: it knows exactly who you are and is refusing anyway, so retrying with the same credentials is pointless. Getting this wrong causes real bugs: a client that redirects to the login page on `403` will bounce an already-logged-in user in a loop. Some APIs deliberately return `404` instead of `403` so that unauthorised users cannot even confirm a resource exists.',
  },

  {
    slug: 'http-cors-preflight',
    title: 'What triggers a CORS preflight',
    category: 'http',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Adding a `Content-Type: application/json` header to a cross-origin POST suddenly produces an extra `OPTIONS` request that fails.',
      '',
      'Explain what that OPTIONS request is and why the header caused it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['preflight', 'pre-flight'],
          missingFeedback: 'What is the name for that automatic OPTIONS request?',
        },
        {
          synonyms: [
            'simple',
            'not simple',
            'custom header',
            'content-type',
            'non-simple',
            'safelisted',
          ],
          missingFeedback:
            'Why did adding that header change anything? What category did the request leave?',
        },
        {
          synonyms: ['permission', 'allow', 'access-control', 'ask', 'check', 'server responds'],
          missingFeedback:
            'What is the browser trying to find out before sending the real request?',
        },
      ],
      hints: [
        'The browser sends it automatically. Your code did not.',
        'Requests that qualify as "simple" skip it; adding a non-safelisted header disqualifies you.',
        'The server must answer the OPTIONS with Access-Control-Allow-Origin / -Methods / -Headers before the real request is sent.',
      ],
    },
    canonicalAnswer:
      'It is a CORS preflight. Adding Content-Type: application/json makes the request non-simple, so the browser first sends an OPTIONS request asking whether the origin, method and headers are permitted. The server must answer it with the Access-Control-Allow-* headers before the browser will send the real POST.',
    solution: md(
      'The browser sends a **preflight** `OPTIONS` first. The server must answer it:',
      '',
      code(
        'http',
        'Access-Control-Allow-Origin: https://app.example.com',
        'Access-Control-Allow-Methods: POST',
        'Access-Control-Allow-Headers: Content-Type',
        'Access-Control-Max-Age: 86400'
      )
    ),
    explanation:
      'A cross-origin request is "simple" (and so skips preflight) only if it is `GET`/`HEAD`/`POST`, carries no non-safelisted headers, and uses a `Content-Type` of `text/plain`, `multipart/form-data` or `application/x-www-form-urlencoded`. `application/json` is not on that list, so the browser must first ask permission with an `OPTIONS` request. The server has to answer that OPTIONS with the matching `Access-Control-Allow-*` headers, and `Access-Control-Max-Age` lets the browser cache the answer so it is not repeated per request. Note the preflight is enforced by the **browser**, which is why the same call works fine from curl.',
  },

  {
    slug: 'http-status-created',
    title: 'Status codes for writes',
    category: 'http',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A POST successfully creates a new resource and returns it in the body.',
      '',
      'Which status code is the conventional choice?'
    ),
    graderConfig: {
      accept: ['201', '201 created', 'created'],
      acceptPatterns: ['\\b201\\b'],
      nearMisses: {
        '200':
          '200 OK is not wrong, but there is a more specific code for "a new resource now exists".',
        '204':
          '204 means "success, and there is no body", but here you are returning the resource.',
        '202': '202 Accepted means the work has been queued but not done yet.',
      },
      hints: [
        'The 2xx family has a code specifically for creation.',
        'It usually comes with a `Location` header pointing at the new resource.',
      ],
    },
    canonicalAnswer: '201',
    solution: md(
      '`201 Created`, ideally with a `Location: /users/123` header.',
      '',
      '- `200 OK`: success with a body, no creation implied.',
      '- `201 Created`: a new resource exists; point at it with `Location`.',
      '- `202 Accepted`: queued, not finished (async jobs).',
      '- `204 No Content`: success, deliberately empty body (typical for DELETE and some PUTs).'
    ),
    explanation:
      'Status codes are the part of your API every client already understands, so spending them precisely is free documentation. `201` tells the caller a resource now exists and the `Location` header says where, which lets generic clients follow up without parsing the body. `204` is its counterpart for "it worked, there is deliberately nothing to send", and note that a `204` **must not** have a body, so returning JSON with it will confuse well-behaved clients.',
  },

  {
    slug: 'http-cache-control',
    title: 'no-cache versus no-store',
    category: 'http',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'A page containing personal data is set to `Cache-Control: no-cache` and it is still being written to disk.',
      '',
      'Explain the difference between `no-cache` and `no-store`, and which one is needed here.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'revalidat',
            'check',
            'ask',
            'still store',
            'may store',
            'stores',
            'can cache',
          ],
          missingFeedback: 'What does `no-cache` actually permit? Is the response stored at all?',
        },
        {
          synonyms: ['no-store', 'nostore'],
          missingFeedback: 'Name the directive that forbids writing the response down at all.',
        },
      ],
      hints: [
        '`no-cache` is badly named. It does not mean "do not cache".',
        'It means "you may store it, but revalidate with the server before reusing it".',
        '`no-store` is the one that forbids writing the response to any cache.',
      ],
    },
    canonicalAnswer:
      'no-cache still allows the response to be stored. It only requires revalidation with the server before reuse. no-store forbids storing it at all, which is what a page with personal data needs.',
    solution: md(
      code('http', 'Cache-Control: no-store'),
      '',
      '- `no-cache`: may be stored, but must be revalidated (usually via `ETag`) before reuse.',
      '- `no-store`: must not be written to any cache, disk or memory.',
      '- `max-age=0`: stale immediately, but still storable and revalidatable.'
    ),
    explanation:
      '`no-cache` is one of the worst-named directives in HTTP: it permits storage and only requires **revalidation** before the copy is served. Normally a conditional request with `If-None-Match`, answered with a cheap `304`. That is exactly what you want for HTML that changes often. `no-store` is the one that forbids writing the response down anywhere, which is what sensitive pages need. The pairing that covers most apps: `no-store` for private pages, and `max-age=31536000, immutable` for content-hashed static assets.',
  },

  {
    slug: 'http-429-backoff',
    title: 'Handling a rate limit',
    category: 'http',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Your client starts getting `429 Too Many Requests`, and the naive retry loop makes it worse.',
      '',
      'What does 429 mean, which response header should you obey, and what retry strategy is appropriate?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['retry-after', 'retry after'],
          missingFeedback: 'Which header does the server use to tell you how long to wait?',
        },
        {
          synonyms: ['backoff', 'back-off', 'exponential', 'back off'],
          missingFeedback: 'Name the retry strategy. Waits that grow between attempts.',
        },
        {
          synonyms: ['jitter', 'random', 'stagger'],
          missingFeedback: 'What do you add to the delay so many clients do not retry in lockstep?',
        },
      ],
      hints: [
        '429 means you exceeded a rate limit. The request was refused, not broken.',
        'The response usually carries a `Retry-After` header, in seconds or as a date.',
        'Retry with exponentially growing delays plus random jitter, so clients do not synchronise into a thundering herd.',
      ],
    },
    canonicalAnswer:
      '429 means you have exceeded the rate limit. Obey the Retry-After header if present, and otherwise retry with exponential backoff plus random jitter so that many clients do not all retry at the same moment.',
    solution: code(
      'js',
      'async function withRetry(fn, attempt = 0) {',
      '  const res = await fn();',
      '  if (res.status !== 429 || attempt >= 5) return res;',
      '',
      "  const header = Number(res.headers.get('Retry-After'));",
      '  const backoff = 2 ** attempt * 500;',
      '  const jitter = backoff * Math.random() * 0.3;',
      '  const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : backoff + jitter;',
      '',
      '  await new Promise((r) => setTimeout(r, waitMs));',
      '  return withRetry(fn, attempt + 1);',
      '}'
    ),
    explanation:
      "`429` says the request was refused for rate reasons, so it is worth retrying. Unlike a `400`, which will fail identically forever. Always prefer the server's own `Retry-After` (seconds or an HTTP date) over your own guess. When it is absent, **exponential backoff** stops a struggling server from being hammered, and **jitter** is the part people forget: without randomness every client retries at the same instant and recreates the spike that caused the limit. Cap the attempts, and only retry idempotent requests unless you have an idempotency key.",
  },

  {
    slug: 'http-idempotency-key',
    title: 'Double-charging on a retry',
    category: 'http',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A payment `POST` times out. The client retries and the customer is charged twice. The first request had actually succeeded.',
      '',
      'Explain the mechanism used to make this safe.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'idempotency key',
            'idempotency-key',
            'idempotence key',
            'unique key',
            'client-generated',
            'request id',
          ],
          missingFeedback:
            'Name the header/token the client sends to identify the logical request.',
        },
        {
          synonyms: [
            'same',
            'duplicate',
            'already',
            'stored',
            'cached',
            'returns the',
            'replay',
            'first result',
          ],
          missingFeedback: 'What does the server do when it sees that key a second time?',
        },
      ],
      hints: [
        'POST is not idempotent, so a retry genuinely creates a second charge.',
        'The client generates a unique key per logical operation and sends it with every attempt.',
        'The server records the key with the result; a repeat key returns the stored result instead of charging again.',
      ],
    },
    canonicalAnswer:
      'An idempotency key: the client generates a unique key for the logical operation and sends it on every attempt, usually as an Idempotency-Key header. The server stores the key with the result of the first request, and when it sees the same key again it returns the stored result instead of performing the operation a second time.',
    solution: code(
      'js',
      'const key = crypto.randomUUID(); // generated once per logical payment',
      '',
      "await fetch('/payments', {",
      "  method: 'POST',",
      "  headers: { 'Idempotency-Key': key, 'Content-Type': 'application/json' },",
      '  body: JSON.stringify(payment),',
      '});',
      '// Retrying with the SAME key is safe. The server replays the first result.'
    ),
    explanation:
      'A timeout tells you nothing about whether the server acted, so the client cannot know if retrying is safe, and `POST` carries no idempotency guarantee. The fix is to move the guarantee into the payload: the client generates a key **once per logical operation** (not per attempt) and the server records it alongside the outcome, returning the stored response for any repeat. Keys are held for a bounded window, typically 24 hours. This is exactly how Stripe and most payment APIs work, and it is the standard answer to "how do I make this safe to retry?".',
  },

  {
    slug: 'http-pagination-cursor',
    title: 'Offset pagination on a moving list',
    category: 'http',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A feed sorted newest-first is paginated with `?page=2&limit=20`. Users report seeing the same post twice and occasionally missing one.',
      '',
      'Explain the cause and name the alternative.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['insert', 'new row', 'new item', 'added', 'shift', 'moved', 'changes between'],
          missingFeedback: 'What happens to the offsets between the two requests?',
        },
        {
          synonyms: ['cursor', 'keyset', 'seek', 'after', 'since', 'last id'],
          missingFeedback: 'Name the alternative.',
        },
        {
          synonyms: [
            'stable',
            'position',
            'anchor',
            'where',
            'from the row',
            'not affected',
            'relative to',
            'index',
          ],
          missingFeedback: 'Why does that alternative avoid the problem?',
        },
      ],
      hints: [
        'The two requests are separated in time, and the list is not static.',
        'A new post at the top pushes everything down one place.',
        'Paginate from a position in the data rather than a count from the start.',
      ],
    },
    canonicalAnswer:
      'Offsets are positions in a list that keeps changing. A post inserted at the top between the two requests shifts everything down one, so the first item of page 2 is one the user already saw, and a deletion has the mirror effect of skipping one. Use cursor or keyset pagination instead, passing the sort key of the last row seen and asking for rows after it, which stays anchored to the data rather than to a count.',
    solution: code(
      'text',
      'GET /posts?limit=20',
      '  -> { items: [...], nextCursor: "2026-03-14T09:12:00Z_8f31" }',
      '',
      'GET /posts?limit=20&after=2026-03-14T09:12:00Z_8f31',
      '',
      '-- SQL: WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20'
    ),
    explanation:
      'Cursor pagination is stable under inserts and deletes because the cursor names a row, not a count, and it is far faster at depth: `OFFSET 100000` makes the database walk and discard a hundred thousand rows, while a keyset comparison uses the index. The cost is that you lose random access to "page 47", which is usually fine for a feed and not for a data table with numbered pages. Include a tiebreaker like the id in both the cursor and the ORDER BY, or rows sharing a timestamp will be skipped or repeated.',
  },

  {
    slug: 'http-etag-conditional',
    title: 'Not sending a body you already have',
    category: 'http',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A client polls a large JSON resource that rarely changes, and downloads the whole thing every time.',
      '',
      'Name the response header that lets the server answer 304 Not Modified on the next request.'
    ),
    graderConfig: {
      accept: ['etag', 'e-tag', 'last-modified'],
      acceptPatterns: ['e-?tag', 'last-?modified'],
      nearMisses: {
        'cache-control':
          'Cache-Control controls freshness. This is about revalidating what you have.',
      },
      hints: [
        'The server sends a version identifier with the body.',
        'The client sends it back on the next request to ask "has this changed?".',
        '`ETag`, echoed back as `If-None-Match`.',
      ],
    },
    canonicalAnswer: 'ETag',
    solution: code(
      'text',
      'GET /report          ->  200  ETag: "a1b2c3"   [ 400 KB body ]',
      'GET /report',
      '  If-None-Match: "a1b2c3"',
      '                     ->  304  (no body)'
    ),
    explanation:
      'The server hashes or versions the representation, the client echoes it in `If-None-Match`, and an unchanged resource costs a round trip with no body. `Last-Modified` with `If-Modified-Since` is the older, second-resolution equivalent and is weaker for anything that can change twice in a second. The same mechanism has a second job: sending `If-Match` on a PUT gives you optimistic concurrency, so a write fails with 412 if someone else changed the resource since you read it, which is the HTTP-level fix for lost updates.',
  },

  {
    slug: 'http-timeout-fetch',
    title: 'The request that never comes back',
    category: 'http',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A hanging server leaves this promise pending forever, and the spinner never stops:',
      '',
      code('js', 'const res = await fetch(url);'),
      '',
      'Name the built-in that gives it a deadline.'
    ),
    graderConfig: {
      accept: [
        'abortsignal.timeout',
        'abortsignal.timeout()',
        'abortcontroller',
        'abort controller',
        'abortsignal',
      ],
      acceptPatterns: ['AbortSignal\\.timeout', 'AbortController', 'AbortSignal'],
      nearMisses: {
        'promise.race': 'Racing a timer settles the promise but leaves the request running.',
        settimeout: 'A timer alone does not cancel anything.',
      },
      hints: [
        'fetch has no timeout option of its own.',
        'It does take a signal that can cancel it.',
        '`AbortSignal.timeout(5000)`',
      ],
    },
    canonicalAnswer: 'AbortSignal.timeout',
    solution: code(
      'js',
      'try {',
      '  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });',
      '} catch (err) {',
      "  if (err.name === 'TimeoutError') showRetry();",
      '  else throw err;',
      '}'
    ),
    explanation:
      '`fetch` deliberately has no timeout option, so an unresponsive server hangs the promise until the browser gives up, which can be minutes. `AbortSignal.timeout` produces a signal that aborts itself, and it rejects with a `TimeoutError` you can distinguish from a user-initiated `AbortError`. `Promise.race` against a timer looks equivalent but is not: the request keeps running, keeps the connection open and still resolves into nothing. Use `AbortSignal.any` to combine a timeout with a cancel-on-unmount controller.',
  },

  {
    slug: 'http-retry-safe-methods',
    title: 'What is safe to retry',
    category: 'http',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A client library retries every failed request three times, including POSTs, and duplicate records appear.',
      '',
      'Explain which requests are safe to retry automatically and why.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['idempot', 'same effect', 'no additional', 'repeatable'],
          missingFeedback: 'What property makes a retry safe?',
        },
        {
          synonyms: ['get', 'head', 'put', 'delete', 'options'],
          missingFeedback: 'Name methods that have that property.',
        },
        {
          synonyms: ['post', 'creates', 'new resource', 'duplicate', 'not idempotent'],
          missingFeedback: 'Which method does not, and why?',
        },
        {
          synonyms: [
            'idempotency key',
            'unique',
            'token',
            'dedupe',
            'make it idempotent',
            'ask the user',
            'do not retry',
          ],
          missingFeedback: 'What lets you retry the unsafe one anyway?',
        },
      ],
      hints: [
        'The question is whether doing it twice differs from doing it once.',
        'GET, HEAD, PUT and DELETE are defined as idempotent; POST is not.',
        'A POST can be made retry-safe with an idempotency key.',
      ],
    },
    canonicalAnswer:
      'Only idempotent requests are safe to retry blindly: repeating them has the same effect as doing them once. GET and HEAD change nothing, and PUT and DELETE are defined to be idempotent, since setting the same state twice or deleting the same resource twice leaves the same result. POST is not, because it creates a new resource each time, so a retry after a response was lost in transit creates a duplicate. To retry a POST safely, send an idempotency key the server can use to recognise and dedupe the repeat.',
    solution: code(
      'text',
      'GET     retry freely',
      'HEAD    retry freely',
      'PUT     retry freely      (same state either way)',
      'DELETE  retry freely      (already gone is the goal state)',
      'POST    only with an Idempotency-Key the server honours',
      '',
      'and back off exponentially, with jitter'
    ),
    explanation:
      'Idempotent does not mean "no effect", it means "no *additional* effect", which is why DELETE qualifies even though the second call returns 404. The dangerous case is the lost response rather than the lost request: the server did the work, the acknowledgement never arrived, and the client cannot tell the difference. That is exactly what an idempotency key resolves, and it is why payment APIs require one. Pair any retry policy with exponential backoff and jitter, or a struggling service gets a synchronised stampede the moment it wobbles.',
  },

  {
    slug: 'http-content-type-charset',
    title: 'The header that decides how a body is read',
    category: 'http',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A POST body arrives at the server as a string that no JSON parser will touch:',
      '',
      code('js', 'fetch(url, { method: "POST", body: JSON.stringify(payload) });'),
      '',
      'Name the request header that is missing.'
    ),
    graderConfig: {
      accept: [
        'content-type',
        'content type',
        'content-type: application/json',
        'application/json',
      ],
      acceptPatterns: ['content-?type', 'application/json'],
      nearMisses: {
        accept: 'Accept says what you want back, not what you are sending.',
      },
      hints: [
        'The server has to be told how to interpret the bytes you sent.',
        'Without it, a body from fetch defaults to text/plain.',
        '`Content-Type: application/json`',
      ],
    },
    canonicalAnswer: 'Content-Type',
    solution: code(
      'js',
      'fetch(url, {',
      "  method: 'POST',",
      "  headers: { 'Content-Type': 'application/json' },",
      '  body: JSON.stringify(payload),',
      '});'
    ),
    explanation:
      'A string body with no explicit `Content-Type` is sent as `text/plain;charset=UTF-8`, and body-parsing middleware keyed on `application/json` skips it, leaving an empty `req.body` and a confusing "name is required" error. `Content-Type` describes what you are sending; `Accept` describes what you would like back. Note the deliberate exception from the file-upload case: with a `FormData` body you must **not** set it, because the browser needs to add the multipart boundary itself.',
  },

  {
    slug: 'http-streaming-response',
    title: 'Showing tokens as they arrive',
    category: 'http',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'This waits for the entire response before rendering anything, which defeats a streaming endpoint:',
      '',
      code('js', 'const text = await res.text();'),
      '',
      'Name the property of the response that lets you consume it incrementally.'
    ),
    graderConfig: {
      accept: ['body', 'res.body', 'response.body', 'readablestream', 'getreader'],
      acceptPatterns: ['\\bres(ponse)?\\.body\\b', '\\bbody\\b', 'ReadableStream', 'getReader'],
      nearMisses: {
        json: 'json() also buffers the whole body first.',
        blob: 'blob() buffers as well.',
      },
      hints: [
        '`text()`, `json()` and `blob()` all buffer the whole body.',
        'The response exposes the underlying stream directly.',
        '`res.body`, a ReadableStream you can read chunk by chunk.',
      ],
    },
    canonicalAnswer: 'res.body',
    solution: code(
      'js',
      'const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();',
      '',
      'while (true) {',
      '  const { value, done } = await reader.read();',
      '  if (done) break;',
      '  append(value); // render as it arrives',
      '}'
    ),
    explanation:
      'Every convenience method on `Response` buffers to completion first, which is exactly wrong for a long-running or token-by-token endpoint. `res.body` is a `ReadableStream` of `Uint8Array` chunks, and `TextDecoderStream` handles the awkward part: a multi-byte character can be split across two chunks, so decoding each chunk independently corrupts it. Chunk boundaries mean nothing semantically either, so a JSON-lines protocol needs you to buffer up to each newline yourself. For server-sent events, `EventSource` does all of this, at the cost of being GET-only.',
  },

  {
    slug: 'http-status-choice-validation',
    title: 'Picking a status for a rejected write',
    category: 'http',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A POST is well formed JSON but the email address in it is already registered.',
      '',
      'Which status code fits better than 400, and is the conventional choice for a conflict with existing state?'
    ),
    graderConfig: {
      accept: ['409', '409 conflict', 'conflict'],
      acceptPatterns: ['\\b409\\b', '\\bconflict\\b'],
      nearMisses: {
        '422': '422 is for a semantically invalid body. This body is valid; the state conflicts.',
        '400': '400 is the one we are trying to improve on.',
        '500': 'The server is fine. This is a client-visible, expected outcome.',
      },
      hints: [
        'The request is syntactically fine and semantically meaningful.',
        'What it clashes with is the current state of the resource.',
        '409 Conflict',
      ],
    },
    canonicalAnswer: '409',
    solution: code(
      'text',
      '400 Bad Request           malformed: not parseable, wrong shape',
      '401 Unauthorized          not authenticated',
      '403 Forbidden             authenticated, not allowed',
      '404 Not Found             no such resource',
      '409 Conflict              clashes with current state (duplicate, stale version)',
      '422 Unprocessable Content valid syntax, invalid semantics',
      '429 Too Many Requests     rate limited'
    ),
    explanation:
      'The distinction is worth getting right because clients branch on it: 400 says "fix your request", 409 says "your request is fine, the world is not what you assumed". A duplicate signup, an edit against a stale version, and a state machine transition that is not allowed from here are all 409. 422 covers a body that parses but violates the rules, such as an end date before the start date, though plenty of APIs use 400 for that and consistency within your own API matters more than the debate. Whatever the code, include a machine-readable body saying which field and why.',
  },

  {
    slug: 'http-preflight-cache',
    title: 'Two requests for every call',
    category: 'http',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'The network tab shows an OPTIONS request before every single API call, doubling the request count on a chatty page.',
      '',
      'Name the response header that lets the browser reuse the preflight result.'
    ),
    graderConfig: {
      accept: ['access-control-max-age', 'max-age', 'access control max age'],
      acceptPatterns: ['access-control-max-age', 'max-?age'],
      nearMisses: {
        'cache-control': 'Cache-Control caches the resource, not the preflight decision.',
      },
      hints: [
        'The preflight answer is cacheable, like any other answer.',
        'The header goes on the OPTIONS response.',
        '`Access-Control-Max-Age`',
      ],
    },
    canonicalAnswer: 'Access-Control-Max-Age',
    solution: code(
      'text',
      'OPTIONS /api/orders',
      '  -> 204',
      '     Access-Control-Allow-Origin: https://app.example.com',
      '     Access-Control-Allow-Methods: GET, POST',
      '     Access-Control-Allow-Headers: content-type, authorization',
      '     Access-Control-Max-Age: 600'
    ),
    explanation:
      'The browser caches the preflight decision per origin, method and header set for the lifetime you specify, so subsequent calls skip the OPTIONS round trip entirely. Browsers cap it well below what you ask for, and the caps differ, so treat the value as a hint. The other half of the fix is avoiding the preflight where you can: a request stays "simple" and skips it entirely if it uses GET, HEAD or POST with a body type of `text/plain`, `multipart/form-data` or `application/x-www-form-urlencoded` and no custom headers. In practice an `Authorization` header or JSON body means you will be preflighting.',
  },

  {
    slug: 'http-sse-content-type',
    title: 'The stream the browser buffers anyway',
    category: 'http',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'An endpoint writes updates as they happen and flushes each one, but `EventSource` fires no `message` events and the browser shows nothing until the handler returns:',
      '',
      code(
        'js',
        "res.setHeader('Content-Type', 'application/json');",
        "res.write('data: 12\\n\\n');"
      ),
      '',
      'Name the media type the response has to declare.'
    ),
    graderConfig: {
      accept: ['text/event-stream', 'event-stream', 'text/event stream'],
      acceptPatterns: ['text\\s*/\\s*event-?stream'],
      nearMisses: {
        'text/plain': 'Plain text is still a document the browser waits to finish.',
        'application/x-ndjson': 'That is a streaming format, but not the one EventSource reads.',
        'text/stream': 'Close. The registered type names the events.',
      },
      hints: [
        'EventSource only parses one media type.',
        'It is a text type, and it names the thing it carries.',
        '`text/event-stream`.',
      ],
    },
    canonicalAnswer: 'text/event-stream',
    solution: code(
      'js',
      "res.setHeader('Content-Type', 'text/event-stream');",
      "res.setHeader('Cache-Control', 'no-store');",
      "res.write('data: 12\\n\\n');"
    ),
    explanation:
      'The HTML specification requires an event stream to be served as `text/event-stream`, encoded as UTF-8, and `EventSource` refuses anything else: the connection errors rather than delivering events. The framing matters as much as the type. A blank line dispatches the event, so `data: 12` on its own is a message nobody has finished writing yet, which is why the two newlines are not optional. Send `Cache-Control: no-store` alongside it, because a proxy that decides to cache or buffer a response it thinks is a document turns a live stream into one long silence.',
  },

  {
    slug: 'http-sse-resume',
    title: 'Picking the stream back up',
    category: 'http',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A dashboard on `EventSource` drops its connection for eight seconds. The browser reconnects on its own, but the events sent during the gap are gone for good.',
      '',
      'The server sends an `id:` with every event. Name the request header the browser sends on reconnect so the server knows where to resume.'
    ),
    graderConfig: {
      accept: ['last-event-id', 'last event id', 'lasteventid'],
      acceptPatterns: ['last-?\\s*event-?\\s*id'],
      nearMisses: {
        'if-none-match': 'That is conditional caching, not stream position.',
        range: 'Range asks for bytes of a resource, not events since a marker.',
        'if-modified-since': 'A timestamp, and not the one the stream is keyed by.',
      },
      hints: [
        'The browser remembers the last `id:` it saw.',
        'It sends that value back as a request header when it reconnects.',
        '`Last-Event-ID`.',
      ],
    },
    canonicalAnswer: 'Last-Event-ID',
    solution: code(
      'text',
      'id: 41',
      'data: {"cpu":38}',
      '',
      '   [ connection drops, browser waits, reconnects ]',
      '',
      'GET /events',
      '  Last-Event-ID: 41       <- server replays 42 onward'
    ),
    explanation:
      'Automatic reconnection is the part of server-sent events people quote, and it is only half the mechanism. The browser stores the last `id:` field it saw and sends it as `Last-Event-ID` on the next connection; a server that ignores that header reconnects the client to the present and silently loses the gap. The other half is yours to build: the server needs to be able to answer "everything after 41", which means events have to be retained somewhere long enough to replay. Without an `id:` there is nothing to resume from, so reconnection means "start again", which is fine for a live gauge and wrong for anything you are counting.',
  },

  {
    slug: 'http-websocket-upgrade',
    title: 'The handshake that stops being HTTP',
    category: 'http',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'A WebSocket connection starts as an ordinary HTTP request:',
      '',
      code(
        'text',
        'GET /chat HTTP/1.1',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version: 13'
      ),
      '',
      'Name the status code the server answers with when it agrees.'
    ),
    graderConfig: {
      accept: ['101', '101 switching protocols', 'switching protocols'],
      acceptPatterns: ['\\b101\\b', 'switching\\s+protocols'],
      nearMisses: {
        '200': '200 means "here is a response body", which ends the exchange.',
        '204': 'No content still completes the request as HTTP.',
        '426': '426 Upgrade Required is the server refusing and asking you to upgrade.',
        '100': '100 Continue is about request bodies.',
      },
      hints: [
        'It is a 1xx-style handoff, not a success code.',
        'The connection stays open and stops speaking HTTP.',
        '`101 Switching Protocols`.',
      ],
    },
    canonicalAnswer: '101 Switching Protocols',
    solution: code(
      'text',
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo='
    ),
    explanation:
      "The handshake is HTTP and everything after it is not. The server proves it understood the request by hashing the client's `Sec-WebSocket-Key` with a fixed GUID from RFC 6455 and returning it as `Sec-WebSocket-Accept`, which is what stops a cache or an unaware proxy from replying 101 by accident. Once the 101 lands, the same TCP connection carries WebSocket frames in both directions, and none of the HTTP machinery applies to them: no status codes, no caching, no per-message headers, and no method to look at. That is exactly why the things HTTP gave you for free (a load balancer that can route by path, a proxy that can retry) become your problem the moment you upgrade.",
  },

  {
    slug: 'http-sse-vs-websocket',
    title: 'Picking a direction',
    category: 'http',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A dashboard shows figures that the server recalculates every few seconds. The browser never sends anything back; it only displays.',
      '',
      'A colleague proposes a WebSocket. Argue for server-sent events instead, and name the one limit of SSE that could change your mind.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'one direction',
            'one-way',
            'one way',
            'unidirectional',
            'server to client',
            'only the server',
            'never sends',
            'no client messages',
          ],
          missingFeedback: 'What does the traffic actually look like here?',
        },
        {
          synonyms: [
            'plain http',
            'ordinary http',
            'still http',
            'over http',
            'no upgrade',
            'reconnect',
            'reconnects automatically',
            'automatic reconnect',
            'last-event-id',
            'resume',
          ],
          missingFeedback: 'What do you get for free from SSE that you would write yourself?',
        },
        {
          synonyms: [
            'connection limit',
            'six connections',
            '6 connections',
            'per domain',
            'per origin',
            'http/1.1',
            'http 1.1',
            'binary',
            'text only',
            'utf-8',
          ],
          missingFeedback: 'Name a limit of SSE: what it cannot carry, or how many can be open.',
        },
      ],
      hints: [
        'Count the directions the messages actually travel.',
        'SSE is an ordinary HTTP response that stays open, so proxies, auth and load balancing work the way they already do, and the browser reconnects and resumes on its own.',
        'The limits: SSE carries UTF-8 text only, and over HTTP/1.1 a browser will hold about six connections per domain, so a stream costs one of them.',
      ],
    },
    canonicalAnswer:
      'The traffic is one-directional: the server pushes and the client never sends. SSE is an ordinary HTTP response that stays open, so proxies, auth and load balancers behave as they already do, and the browser reconnects on its own and resumes with Last-Event-ID. A WebSocket buys two-way traffic nobody needs and makes reconnection your job. The limits that would change my mind: SSE carries UTF-8 text only, so binary needs encoding, and over HTTP/1.1 a browser holds only about six connections per domain, so several open streams starve the page.',
    solution: md(
      'One direction, so use the one-directional transport.',
      '',
      '| | SSE | WebSocket |',
      '| --- | --- | --- |',
      '| Direction | server to client | both |',
      '| Wire | an HTTP response that stays open | a TCP connection after a 101 |',
      '| Reconnect | automatic, resumes via `Last-Event-ID` | yours to write |',
      '| Payload | UTF-8 text | text or binary |',
      '| Cost | one of ~6 HTTP/1.1 connections per domain | one connection, outside HTTP |',
      '',
      'Switch to a WebSocket when the client starts talking back, when the payload is binary, or when one page needs more streams than HTTP/1.1 will give it.'
    ),
    explanation:
      'The four questions that pick a transport answer themselves here: the server starts it, the messages go one way, nothing needs a reply, and the cost is one held-open connection. SSE is the option people skip past, and skipping it means reimplementing reconnection, resumption and backoff by hand, because the WebSocket API gives you none of them. The honest limits are worth knowing before you commit: an event stream is UTF-8 text by specification, so binary has to be encoded into it; `EventSource` cannot set request headers, so bearer-token auth needs a cookie or a query parameter; and over HTTP/1.1 the six-connections-per-domain cap is per browser rather than per tab, so a handful of open dashboards will hang the seventh. Over HTTP/2 the streams are multiplexed and that particular cap stops mattering.',
  },
];
