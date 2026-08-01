import { code, md, type ProblemDraft } from './types';

const URL_SNIPPET = code(
  'js',
  "const url = new URL('https://shop.dev/search?tag=sale&tag=new&page=2');"
);

export const queryParamProblems: ProblemDraft[] = [
  {
    slug: 'qp-get-first',
    title: 'searchParams.get with repeated keys',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Given:',
      '',
      URL_SNIPPET,
      '',
      "What value does `url.searchParams.get('tag')` return?"
    ),
    graderConfig: {
      accept: ['sale'],
      nearMisses: {
        new: "That's the second occurrence. Get() doesn't return the last one.",
        'sale,new': 'get() returns a single value, not all of them. GetAll() does that.',
      },
      hints: [
        'The param appears twice, but get() returns only one string.',
        'get() returns the **first** occurrence.',
      ],
    },
    canonicalAnswer: 'sale',
    solution: '`sale`',
    explanation:
      '`URLSearchParams` is a *multimap*: a key can appear any number of times and the order in the query string is preserved. `get(name)` returns the **first** value for that key as a string, or `null` if the key is absent. It never returns an array and never merges values. When a key can legitimately repeat (tags, filters, ids), reach for `getAll(name)` instead.',
  },

  {
    slug: 'qp-get-all',
    title: 'Read every value of a repeated param',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Same URL as before:',
      '',
      URL_SNIPPET,
      '',
      "Write the expression that returns **all** values of `tag` as an array (`['sale', 'new']`)."
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['searchParams\\s*\\.\\s*getAll\\(\\s*["\'`]tag["\'`]\\s*\\)'],
      nearMisses: { "url.searchParams.get('tag')": 'get() only returns the first value.' },
      hints: [
        "There's a dedicated method for multi-value params.",
        "It's `getAll(name)` on searchParams.",
      ],
    },
    canonicalAnswer: "url.searchParams.getAll('tag')",
    solution: code('js', "url.searchParams.getAll('tag'); // ['sale', 'new']"),
    explanation:
      '`getAll(name)` returns **every** value for a key as a real array, in query-string order, and an empty array when the key is absent, so you never have to null-check it. That empty-array-not-null behaviour makes it safe to `.map()` or `.filter()` the result directly. `get()` is the odd one out here: it returns a single string or `null`.',
  },

  {
    slug: 'qp-build',
    title: 'Build a query string from an object',
    category: 'query-params',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      "You have `const params = { q: 'shoes', size: '42' };`",
      '',
      'Using a built-in web API, write an expression that produces the string `q=shoes&size=42` (no leading `?`).'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'new\\s+URLSearchParams\\(\\s*params\\s*\\)\\s*\\.\\s*toString\\(\\s*\\)',
        'String\\(\\s*new\\s+URLSearchParams\\(\\s*params\\s*\\)\\s*\\)',
      ],
      closeSubstrings: {
        urlsearchparams: 'Right API. Check how you construct and serialize it.',
      },
      hints: [
        'The URLSearchParams constructor accepts a plain object.',
        '`.toString()` serializes it, and it handles encoding for you.',
      ],
    },
    canonicalAnswer: 'new URLSearchParams(params).toString()',
    solution: code('js', 'new URLSearchParams(params).toString(); // "q=shoes&size=42"'),
    explanation:
      'The `URLSearchParams` constructor accepts a plain object (as well as a string, an array of pairs, or another `URLSearchParams`), so no manual loop is needed. `toString()` joins the pairs with `&` and percent-encodes keys and values for you, which hand-rolled `${k}=${v}` concatenation does not. It deliberately omits the leading `?`, so you write `` `${url}?${params}` `` when you need one.',
  },

  {
    slug: 'qp-has-vs-get',
    title: 'Detect a flag-style param',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A URL ends in `?debug`. The param is present but has an empty value.',
      '',
      'Which `searchParams` method correctly reports that `debug` was supplied? (`get` returns `""`, which is falsy.)'
    ),
    graderConfig: {
      accept: ['has', 'has()', '.has', 'searchparams.has', 'url.searchparams.has'],
      acceptPatterns: ['searchParams\\s*\\.\\s*has\\('],
      nearMisses: {
        get: 'get() returns the empty string here, which is falsy. You cannot distinguish "absent" from "present but empty".',
        getall:
          'getAll() returns `[""]`, so you would have to check its length rather than truthiness.',
      },
      hints: ['You want presence, not value.', '`searchParams.has(name)` returns a boolean.'],
    },
    canonicalAnswer: "url.searchParams.has('debug')",
    solution: code(
      'js',
      "url.searchParams.has('debug');  // true",
      "url.searchParams.get('debug');  // ''. Falsy, so an if() would miss it"
    ),
    explanation:
      "A valueless param like `?debug` parses as the key `debug` with the empty-string value, so `if (params.get('debug'))` is false and the flag appears to be off. `has(name)` answers the presence question directly and returns a boolean. This is the same class of bug as `??` versus `||`: testing truthiness when you meant to test existence. Modern browsers also accept `has(name, value)` to check for one specific occurrence.",
  },

  {
    slug: 'qp-set-vs-append',
    title: 'set() versus append()',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'Starting from `?tag=sale&tag=new`, describe what the query string looks like after each of these, and why they differ:',
      '',
      code('js', "params.set('tag', 'clearance');", "params.append('tag', 'clearance');")
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['replace', 'overwrit', 'removes', 'only one', 'single'],
          missingFeedback: 'What does set() do to the values that were already there?',
        },
        {
          synonyms: ['append', 'adds', 'keeps', 'three', 'additional', 'extra'],
          missingFeedback: 'What does append() do to the existing values?',
        },
      ],
      hints: [
        'One of them treats the key as single-valued, the other as multi-valued.',
        '`set` removes every existing occurrence and leaves exactly one.',
        '`append` leaves the existing ones alone and adds another.',
      ],
    },
    canonicalAnswer:
      'set() replaces every existing tag with a single one, giving ?tag=clearance. append() keeps the existing values and adds another, giving ?tag=sale&tag=new&tag=clearance.',
    solution: code(
      'js',
      "params.set('tag', 'clearance');    // ?tag=clearance",
      "params.append('tag', 'clearance'); // ?tag=sale&tag=new&tag=clearance"
    ),
    explanation:
      '`set(name, value)` removes **every** existing occurrence of the key and inserts one. It treats the key as single-valued, and it places the new value at the position of the first old one. `append(name, value)` adds another occurrence and leaves the rest untouched. The practical rule: `set` for things like `page` or `sort` where only one value makes sense, `append` for genuinely repeatable filters. Both mutate the `URLSearchParams` in place, and mutating `url.searchParams` updates `url.href` live.',
  },

  {
    slug: 'qp-encode-component',
    title: 'Encoding a value into a URL',
    category: 'query-params',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You are hand-building a URL and need to insert the search term `a&b` as the value of `q`.',
      '',
      'Which function must you wrap the value in so the `&` does not start a new parameter?'
    ),
    graderConfig: {
      accept: ['encodeuricomponent', 'encodeuricomponent()'],
      acceptPatterns: ['encodeURIComponent\\('],
      nearMisses: {
        encodeuri:
          'encodeURI() is for whole URLs. It deliberately leaves `&`, `=` and `?` intact, so it will not save you here.',
        escape: 'escape() is deprecated and does not handle UTF-8 correctly.',
        'url.searchparams':
          'URLSearchParams does encode for you, but the question is about hand-building the string.',
      },
      hints: [
        'There are two global encode functions and they differ in which characters they spare.',
        'You need the one that escapes reserved characters like `&`, `=` and `?`.',
        '`encodeURIComponent(value)`.',
      ],
    },
    canonicalAnswer: 'encodeURIComponent',
    solution: code(
      'js',
      "`/search?q=${encodeURIComponent('a&b')}`; // /search?q=a%26b",
      '',
      '// Or skip the hand-rolling entirely:',
      "new URLSearchParams({ q: 'a&b' }).toString(); // q=a%26b"
    ),
    explanation:
      '`encodeURIComponent` escapes everything that has structural meaning inside a URL. `& = ? # /` and friends, which is exactly what you need for a single **component** such as one query value. `encodeURI` is for encoding a whole URL and deliberately preserves those characters, so using it on a value lets `a&b` split into two params. Better still, let `URLSearchParams` build the string: it encodes correctly by construction and you cannot forget.',
  },

  {
    slug: 'qp-from-location',
    title: 'Read params from the current page',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'In the browser, write the shortest expression that gives you a `URLSearchParams` for the **current page** URL.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'new\\s+URLSearchParams\\(\\s*(window\\s*\\.\\s*)?location\\s*\\.\\s*search\\s*\\)',
        'new\\s+URL\\(\\s*(window\\s*\\.\\s*)?location\\s*\\.\\s*href\\s*\\)\\s*\\.\\s*searchParams',
      ],
      closeSubstrings: {
        urlsearchparams: 'Right class. What do you pass it for the current page?',
        location: 'Right object, which property holds just the query string?',
      },
      hints: [
        '`location.search` is the `?…` portion of the current URL.',
        '`new URLSearchParams(location.search)`',
      ],
    },
    canonicalAnswer: 'new URLSearchParams(location.search)',
    solution: code(
      'js',
      'const params = new URLSearchParams(location.search);',
      "params.get('page');"
    ),
    explanation:
      "`location.search` is the raw query string including the leading `?`, and the `URLSearchParams` constructor tolerates that `?`, so you do not need to slice it off. `new URL(location.href).searchParams` is equivalent and worth knowing when you also need the pathname or origin. In a single-page app, remember this is a **snapshot**: it does not update when you push a new history entry, so re-read it on navigation (or use your router's hook).",
  },

  {
    slug: 'qp-relative-url',
    title: 'Resolve a relative URL',
    category: 'query-params',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'What does this evaluate to?',
      '',
      code('js', "new URL('/v2/users', 'https://api.shop.dev/v1/orders').href")
    ),
    graderConfig: {
      accept: ['https://api.shop.dev/v2/users'],
      acceptPatterns: ['https://api\\.shop\\.dev/v2/users'],
      nearMisses: {
        'https://api.shop.dev/v1/orders/v2/users':
          'A leading slash makes the path absolute. It replaces the whole path rather than appending.',
        'https://api.shop.dev/v1/v2/users': 'The leading slash resets to the root of the origin.',
      },
      hints: [
        'The second argument is the base URL.',
        'The first argument starts with `/`. That matters a lot.',
        'A leading slash means "from the origin root", discarding the base path.',
      ],
    },
    canonicalAnswer: 'https://api.shop.dev/v2/users',
    solution: code(
      'js',
      "new URL('/v2/users', 'https://api.shop.dev/v1/orders').href;",
      "// 'https://api.shop.dev/v2/users' . Leading slash resets the path",
      '',
      "new URL('v2/users', 'https://api.shop.dev/v1/orders').href;",
      "// 'https://api.shop.dev/v1/v2/users' . Relative, so it resolves against the directory"
    ),
    explanation:
      "The two-argument `URL` constructor resolves the first argument **against** the base using standard URL resolution rules. A leading `/` makes it origin-relative, so the base path is discarded entirely. This is the detail that bites people building API clients, where `new URL('/users', baseWithPathPrefix)` silently drops the `/v1` prefix. Without the leading slash it resolves relative to the base's directory. Passing a full absolute URL as the first argument ignores the base completely, which is what makes this constructor safe for joining user-supplied paths.",
  },

  {
    slug: 'qp-plus-space',
    title: 'The plus-sign space trap',
    category: 'query-params',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'A search for `C++` arrives at the server as `C  ` (two spaces). The client built the URL with string concatenation.',
      '',
      'Explain what happened and how to avoid it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['space', 'decoded as'],
          missingFeedback: 'What does a raw `+` mean inside a query string when it is decoded?',
        },
        {
          synonyms: ['encode', '%2b', 'urlsearchparams', 'encodeuricomponent'],
          missingFeedback: 'What should have happened to the `+` before it went into the URL?',
        },
      ],
      hints: [
        'In the query-string portion of a URL, `+` is not a literal plus.',
        'Form encoding (`application/x-www-form-urlencoded`) decodes `+` as a space.',
        'Encode the value first (`encodeURIComponent` turns `+` into `%2B`), or let URLSearchParams do it.',
      ],
    },
    canonicalAnswer:
      'In a query string, + is decoded as a space under form encoding, so an unencoded C++ becomes "C  ". The value must be percent-encoded first (encodeURIComponent turns + into %2B), or built with URLSearchParams, which encodes it for you.',
    solution: code(
      'js',
      "'?q=' + 'C++';                              // ?q=C++   → server reads 'C  '",
      "'?q=' + encodeURIComponent('C++');           // ?q=C%2B%2B → 'C++'",
      "new URLSearchParams({ q: 'C++' }).toString(); // q=C%2B%2B"
    ),
    explanation:
      'The query string is decoded as `application/x-www-form-urlencoded`, where a literal `+` means a space. A holdover from HTML form submission that does **not** apply to the path portion of a URL. So an unencoded `+` survives the wire but arrives as a space. Percent-encoding the value first (`%2B`) is the fix, and `URLSearchParams` does it automatically. Note the asymmetry: `URLSearchParams` *encodes* spaces as `+`, while `encodeURIComponent` encodes them as `%20`; both decode correctly, which is why mixing the two by hand causes so much confusion.',
  },

  {
    slug: 'qp-delete-param',
    title: 'Remove a param and rebuild the URL',
    category: 'query-params',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A user cleared a filter. Given a `URL` object called `url`, write the statement that removes the `tag` parameter entirely (all occurrences).'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['searchParams\\s*\\.\\s*delete\\(\\s*["\'`]tag["\'`]\\s*\\)'],
      closeSubstrings: {
        delete: 'Right method. Call it on `url.searchParams` with the param name.',
      },
      hints: [
        'There is a method for it. You do not need to rebuild the string.',
        '`url.searchParams.delete(name)` removes every occurrence.',
      ],
    },
    canonicalAnswer: "url.searchParams.delete('tag')",
    solution: code(
      'js',
      "url.searchParams.delete('tag');",
      'url.href; // already updated. SearchParams writes through to the URL'
    ),
    explanation:
      '`delete(name)` removes **all** occurrences of the key, which is the behaviour you want when clearing a multi-valued filter. Crucially, `url.searchParams` is a live view: mutating it updates `url.href` and `url.search` immediately, so there is nothing to reassign. That is only true for params reached *through* a `URL` object. A standalone `new URLSearchParams(str)` is detached from any URL.',
  },
];
