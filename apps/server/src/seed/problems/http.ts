import { code, md, type ProblemDraft } from './types';

export const httpProblems: ProblemDraft[] = [
  {
    slug: 'http-fetch-not-ok',
    title: 'fetch does not throw on 500',
    category: 'http',
    difficulty: 'easy',
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
];
