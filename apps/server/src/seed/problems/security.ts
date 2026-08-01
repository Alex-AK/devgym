import { code, md, type ProblemDraft } from './types';

export const securityProblems: ProblemDraft[] = [
  {
    slug: 'security-token-storage',
    title: 'Where to keep a session token',
    category: 'security',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'An app stores its session token in `localStorage` and attaches it to every request.',
      '',
      'Name the risk that choice creates and the storage that avoids it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['xss', 'cross-site scripting', 'injected script', 'any script'],
          missingFeedback: 'What kind of attack can read localStorage?',
        },
        {
          synonyms: [
            'javascript can read',
            'readable',
            'accessible',
            'exfiltrat',
            'steal',
            'stolen',
          ],
          missingFeedback: 'Why is localStorage exposed to that attack?',
        },
        {
          synonyms: ['httponly', 'http-only', 'http only cookie', 'cookie'],
          missingFeedback: 'What storage is not readable from JavaScript?',
        },
      ],
      hints: [
        'Any script running on your origin can read localStorage, including an injected one.',
        'A single XSS then walks away with the token.',
        'An HttpOnly cookie is invisible to JavaScript.',
      ],
    },
    canonicalAnswer:
      'localStorage is readable by any JavaScript on the origin, so a single XSS can exfiltrate the token and the attacker has a session. Store it in an HttpOnly cookie instead, which JavaScript cannot read, with Secure and SameSite set.',
    solution: code(
      'text',
      'Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600'
    ),
    explanation:
      'The trade is real rather than one-sided: `HttpOnly` cookies remove the XSS-reads-the-token path but are sent automatically, which reopens CSRF and is what `SameSite` is for. `SameSite=Lax` blocks the classic cross-site form post while keeping ordinary top-level navigation working. `localStorage` avoids CSRF but hands the token to any injected script, and XSS is by far the more common vulnerability. The honest summary: an HttpOnly, Secure, SameSite cookie is the better default, and neither option saves you if you have XSS.',
  },

  {
    slug: 'security-xss-source',
    title: 'The rendering call that trusts too much',
    category: 'security',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A comment body from the database is rendered like this:',
      '',
      code('js', 'el.innerHTML = comment.body;'),
      '',
      'Name the property that renders it as text instead.'
    ),
    graderConfig: {
      accept: ['textcontent', 'textcontent()', 'innertext', 'element.textcontent'],
      acceptPatterns: ['textContent', 'innerText'],
      nearMisses: {
        encodeuricomponent:
          'That is for URLs. It does not make HTML safe and mangles ordinary text.',
        escape: 'Escaping by hand is the thing textContent does correctly for you.',
      },
      hints: [
        'The safe property never parses its input as markup.',
        'It sets the text of the node and nothing else.',
        '`textContent`',
      ],
    },
    canonicalAnswer: 'textContent',
    solution: code(
      'js',
      'el.textContent = comment.body;',
      '',
      '// need real markup? sanitise, do not trust',
      'el.setHTML(comment.body); // or DOMPurify.sanitize before assigning'
    ),
    explanation:
      '`innerHTML` parses its input as markup, so any `<img onerror>` or `<script>` in the stored value runs with your origin’s privileges, which means the session, the cookies and the DOM. `textContent` never parses, so the same string appears as literal characters. The rule is to treat every value that has passed through a user as untrusted regardless of where it now lives, because the database is not a trust boundary. When you genuinely need rich text, sanitise with a maintained library rather than a regex, and set a Content-Security-Policy as a second line of defence.',
  },

  {
    slug: 'security-sql-injection',
    title: 'The query built by concatenation',
    category: 'security',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A search endpoint builds SQL from a query parameter:',
      '',
      code('js', "db.query(`SELECT * FROM users WHERE email = '${email}'`);"),
      '',
      'Name the fix.'
    ),
    graderConfig: {
      accept: [
        'parameterized query',
        'parameterised query',
        'parameterized queries',
        'prepared statement',
        'prepared statements',
        'placeholders',
        'bind parameters',
        'parameter binding',
      ],
      acceptPatterns: ['paramet(er|ri)[sz]ed', 'prepared statement', 'placeholder', 'bind'],
      nearMisses: {
        'escape the input': 'Hand-escaping is exactly what parameter binding does correctly.',
        'validate the input': 'Validation is worth doing, but it is not what makes the query safe.',
      },
      hints: [
        'The problem is that data becomes part of the statement.',
        'The database should receive the query and the values separately.',
        'Parameterised queries, also called prepared statements.',
      ],
    },
    canonicalAnswer: 'parameterized query',
    solution: code(
      'js',
      "db.query('SELECT * FROM users WHERE email = ?', [email]);",
      '',
      '-- the driver sends structure and data separately, so this is just a string:',
      '--   email = "\' OR 1=1 --"'
    ),
    explanation:
      'Concatenation lets input change the *structure* of the statement, which is the whole vulnerability. A parameterised query sends the statement and the values on separate channels, so a value can never become syntax no matter what it contains. Escaping by hand is the same idea implemented badly: it depends on getting every dialect quirk and every encoding right, and one miss is a breach. Query builders and ORMs parameterise by default, but their raw-SQL escape hatches do not, which is where this bug still appears in modern codebases.',
  },

  {
    slug: 'security-cors-not-auth',
    title: 'What CORS actually protects',
    category: 'security',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A team sets `Access-Control-Allow-Origin: *` on an internal API and calls it "open to our own apps only, since nobody knows the URL".',
      '',
      'Explain what CORS does and does not protect, and what is actually needed here.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['browser', 'in the browser', 'user agent', 'client-side', 'same-origin'],
          missingFeedback: 'Where is CORS enforced?',
        },
        {
          synonyms: ['curl', 'server', 'script', 'postman', 'directly', 'non-browser', 'bypass'],
          missingFeedback: 'Who is not affected by it at all?',
        },
        {
          synonyms: ['auth', 'authentic', 'authoris', 'authoriz', 'token', 'credential', 'session'],
          missingFeedback: 'What actually protects the endpoint?',
        },
      ],
      hints: [
        'CORS is a rule the browser enforces on behalf of the user.',
        'Anything that is not a browser ignores it entirely.',
        'An unauthenticated endpoint is public regardless of its CORS headers.',
      ],
    },
    canonicalAnswer:
      'CORS is enforced by the browser, and it exists to stop a page on one origin reading responses from another on the user’s behalf. It is not access control on the server: curl, a script or any non-browser client ignores the headers completely and gets the response. An endpoint with no authentication is public whatever its CORS policy says, so what is needed here is real authentication and authorisation on every request.',
    solution: code(
      'text',
      '# CORS says which *browser origins* may read the response',
      'Access-Control-Allow-Origin: https://app.example.com',
      '',
      '# authentication says who may have one at all',
      'Authorization: Bearer <token>   ->  401 without it, from any client'
    ),
    explanation:
      'CORS relaxes the same-origin policy, which is a protection for the *user* against a malicious page reading their authenticated responses from another site. It is not a server-side access control, and reasoning about it as one leads directly to open endpoints. Two follow-on details matter: `Access-Control-Allow-Origin: *` cannot be combined with credentials, and a preflight response that says yes is not an authorisation decision. Security by obscure URL is not security either, since URLs leak through logs, referrers and browser history.',
  },

  {
    slug: 'security-password-hashing',
    title: 'Storing a password',
    category: 'security',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A codebase stores `sha256(password)` and considers it hashed.',
      '',
      'Name a hashing algorithm actually designed for passwords.'
    ),
    graderConfig: {
      accept: ['bcrypt', 'argon2', 'argon2id', 'scrypt', 'pbkdf2'],
      acceptPatterns: ['bcrypt', 'argon2', 'scrypt', 'pbkdf2'],
      nearMisses: {
        sha512: 'Still a fast general-purpose hash. Speed is the problem.',
        md5: 'Much worse: fast and broken.',
      },
      closeSubstrings: {
        salt: 'A salt is necessary but not sufficient. The algorithm has to be slow too.',
      },
      hints: [
        'SHA-256 is designed to be fast, which is exactly wrong here.',
        'You want something deliberately slow and memory-hungry, with a tunable cost.',
        'bcrypt, scrypt or Argon2id.',
      ],
    },
    canonicalAnswer: 'bcrypt',
    solution: code(
      'js',
      'const hash = await bcrypt.hash(password, 12); // cost factor, tune upward over time',
      'const ok = await bcrypt.compare(attempt, hash);',
      '',
      '// Argon2id is the current recommendation where available'
    ),
    explanation:
      'General-purpose hashes are built to be fast, and a GPU will try billions of SHA-256 guesses a second against a leaked table. Password hashes are built to be slow and, in the case of scrypt and Argon2, memory-hard, so parallel hardware helps an attacker far less. They also handle per-password salting for you, which defeats rainbow tables and stops two users with the same password sharing a hash. The cost factor is a dial you are expected to raise as hardware improves. And compare with the library’s own function, which is constant-time.',
  },

  {
    slug: 'security-secrets-in-frontend',
    title: 'The API key in the bundle',
    category: 'security',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A React app calls a third-party API directly with a secret key from an environment variable:',
      '',
      code(
        'js',
        'fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_API_KEY}` } });'
      ),
      '',
      'Explain the problem and the standard fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'bundle',
            'shipped',
            'client',
            'devtools',
            'network tab',
            'view source',
            'public',
          ],
          missingFeedback: 'Where does that value end up?',
        },
        {
          synonyms: ['anyone', 'extract', 'read it', 'steal', 'copy', 'visible', 'not secret'],
          missingFeedback: 'Who can get hold of it?',
        },
        {
          synonyms: ['proxy', 'server', 'backend', 'own api', 'server-side', 'route it'],
          missingFeedback: 'What is the standard fix?',
        },
      ],
      hints: [
        'Anything the browser needs, the user has.',
        'A build-time variable is inlined into the JavaScript you ship.',
        'Call the third party from your own server and proxy the request.',
      ],
    },
    canonicalAnswer:
      'The key is inlined into the bundle at build time and shipped to every visitor, so anyone can read it from the source or the network tab. It is not a secret once it reaches the browser. Call the third-party API from your own server instead, keep the key there, and have the client talk to your endpoint.',
    solution: code(
      'js',
      '// client',
      "await fetch('/api/quotes');",
      '',
      '// server: the key never leaves this process',
      'const upstream = await fetch(THIRD_PARTY_URL, {',
      '  headers: { Authorization: `Bearer ${process.env.API_KEY}` },',
      '});'
    ),
    explanation:
      'Bundler prefixes like `VITE_` or `NEXT_PUBLIC_` are a signal, not a protection: they exist to make "this will be public" explicit. Anything shipped to a browser is readable, and minification is not obfuscation. A server-side proxy also gives you a place to rate-limit, cache and audit the calls, which you want anyway. Some third-party keys are genuinely publishable, such as a Stripe publishable key or a domain-restricted Maps key, and the way to tell is that the vendor documents them as public and scopes what they can do.',
  },

  {
    slug: 'security-open-redirect',
    title: 'The redirect that trusts a query param',
    category: 'security',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'After login the app sends the user wherever `?next=` says:',
      '',
      code('js', 'res.redirect(req.query.next);'),
      '',
      'Name the vulnerability and a safe way to handle the parameter.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['open redirect', 'redirect', 'phish'],
          missingFeedback: 'Name the vulnerability.',
        },
        {
          synonyms: [
            'attacker',
            'external',
            'another site',
            'evil',
            'their own',
            'off-site',
            'arbitrary',
          ],
          missingFeedback: 'Where can an attacker send the user?',
        },
        {
          synonyms: [
            'relative',
            'allowlist',
            'allow list',
            'whitelist',
            'same origin',
            'starts with /',
            'validate',
            'reject absolute',
          ],
          missingFeedback: 'How do you make the parameter safe?',
        },
      ],
      hints: [
        'The link can be sent by anyone, and it starts on your trusted domain.',
        'It lands the user on an attacker page that looks like yours.',
        'Only allow same-origin relative paths, or check against an allowlist.',
      ],
    },
    canonicalAnswer:
      'It is an open redirect. An attacker sends a link that starts on your trusted domain and bounces the user to their own lookalike site, which makes phishing far more convincing and can leak tokens in the URL. Accept only same-origin relative paths, rejecting anything absolute or protocol-relative, or check the destination against an allowlist and fall back to a default.',
    solution: code(
      'js',
      'function safeNext(next) {',
      "  if (typeof next !== 'string') return '/';",
      '  // reject absolute URLs and protocol-relative ("//evil.com")',
      "  if (!next.startsWith('/') || next.startsWith('//')) return '/';",
      '  return next;',
      '}',
      '',
      'res.redirect(safeNext(req.query.next));'
    ),
    explanation:
      'The value of an open redirect to an attacker is that the link genuinely begins on your domain, so it survives a careful look at the hostname and any filter that trusts your domain. The `//evil.com` case is the one hand-rolled checks miss: it is protocol-relative, so it looks like a path and behaves like an absolute URL. Parsing with `new URL(next, origin)` and comparing the resulting origin is the robust version. The same trap appears in `window.location = userValue` on the client, where a `javascript:` URL is XSS as well.',
  },

  {
    slug: 'security-rate-limit-auth',
    title: 'Protecting a login endpoint',
    category: 'security',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A login endpoint validates credentials correctly and returns 401 on failure, with no other protection.',
      '',
      'Name two attacks it is still exposed to and a mitigation for each.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['brute force', 'bruteforce', 'guess', 'credential stuffing', 'stuffing'],
          missingFeedback: 'What can an attacker do with unlimited attempts?',
        },
        {
          synonyms: ['rate limit', 'throttle', 'lockout', 'backoff', 'captcha', 'slow down'],
          missingFeedback: 'What mitigates that?',
        },
        {
          synonyms: [
            'enumerat',
            'which emails',
            'user exists',
            'different message',
            'timing',
            'reveals',
          ],
          missingFeedback: 'What can the responses leak about who has an account?',
        },
        {
          synonyms: [
            'same message',
            'generic',
            'identical',
            'constant time',
            'do not reveal',
            'uniform',
          ],
          missingFeedback: 'How do you avoid leaking that?',
        },
      ],
      hints: [
        'Nothing stops an attacker trying a million passwords.',
        'And the responses may quietly say whether an account exists.',
        'Rate limit per account and per IP; return an identical response either way.',
      ],
    },
    canonicalAnswer:
      'Unlimited attempts allow brute force and credential stuffing, so rate limit per account and per IP with increasing backoff, and add a CAPTCHA or a temporary lockout after repeated failures. The responses can also enable user enumeration if a missing account and a wrong password differ in message or in timing, so return an identical generic response for both and keep the work done in each case comparable.',
    solution: code(
      'js',
      '// same response either way, and always do the hash work',
      'const user = await findUser(email);',
      'const ok = await bcrypt.compare(password, user?.hash ?? DUMMY_HASH);',
      'if (!user || !ok) {',
      "  return res.status(401).json({ error: 'Invalid email or password' });",
      '}'
    ),
    explanation:
      'Correct credential checking is only the first requirement. Rate limiting is what makes guessing impractical, and it belongs on both the account and the source address so neither a targeted attack nor a spray gets a free run. Enumeration is subtler: "no such user" versus "wrong password" hands an attacker a list of valid accounts, and so does returning faster when the user does not exist, which is why the example hashes against a dummy value anyway. The same care applies to password reset and signup, which leak the same information if they are not equally careful.',
  },
];
