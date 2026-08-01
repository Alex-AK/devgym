import { code, codeProblem, md, type ProblemDraft } from './types';

export const formProblems: ProblemDraft[] = [
  {
    slug: 'forms-controlled-value-null',
    title: 'The input that switches to uncontrolled',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'React warns: "A component is changing a controlled input to be uncontrolled."',
      '',
      code('jsx', '<input value={user.nickname} onChange={onChange} />'),
      '',
      'What value is `user.nickname` arriving as, and what should the prop fall back to?'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        '(undefined|null)[\\s\\S]*(empty string|\'\'|""|`` )',
        '(empty string|\'\'|""|`` )[\\s\\S]*(undefined|null)',
      ],
      closeSubstrings: {
        undefined: 'Right cause. What should the value fall back to instead?',
        null: 'Right cause. What should the value fall back to instead?',
        'empty string': 'Right fix. What was the value arriving as?',
      },
      hints: [
        'React decides controlled or uncontrolled from whether `value` is defined.',
        'A missing field on a freshly loaded object is the usual source.',
        '`value={user.nickname ?? ""}`',
      ],
    },
    canonicalAnswer:
      'It is arriving as undefined, and the value prop should fall back to an empty string.',
    solution: code('jsx', "<input value={user.nickname ?? ''} onChange={onChange} />"),
    explanation:
      'React treats `value={undefined}` as "you are not controlling this input" and lets the DOM own it. The moment real data arrives it becomes controlled, and React warns because the switch loses whatever the user typed in between. The usual cause is an object loaded async where an optional field is simply absent. `?? ""` pins it controlled from the first render. Use `??` rather than `||` so a legitimately empty or zero value is not swallowed, which matters for number inputs.',
  },

  {
    slug: 'forms-prevent-default-submit',
    title: 'The form that reloads the page',
    category: 'forms',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Clicking Submit reloads the page and loses all state, even though there is an onSubmit handler.',
      '',
      code('jsx', 'function onSubmit(event) {', '  save(values);', '}'),
      '',
      'Write the missing line.'
    ),
    graderConfig: {
      accept: ['event.preventdefault()', 'event.preventdefault', 'e.preventdefault()'],
      acceptPatterns: ['\\w*\\.?preventDefault\\(\\)'],
      nearMisses: {
        'event.stoppropagation()':
          'stopPropagation stops bubbling. The page reload is the browser default.',
        'return false': 'Returning false works in jQuery handlers, not in React or DOM listeners.',
      },
      hints: [
        'The reload is the browser’s default action for a form submit.',
        'One call cancels it.',
        '`event.preventDefault()`',
      ],
    },
    canonicalAnswer: 'event.preventDefault()',
    solution: code(
      'jsx',
      'function onSubmit(event) {',
      '  event.preventDefault();',
      '  save(values);',
      '}'
    ),
    explanation:
      'A form submit navigates by default, which predates JavaScript and is still the behaviour when nothing cancels it. `preventDefault()` keeps the page and lets your handler own the submission. Keep using a real `<form>` with an `onSubmit` rather than a click handler on the button: you get Enter-to-submit, native required-field handling, and the correct semantics for assistive technology. A `<button>` inside a form defaults to `type="submit"`, which is why a stray button sometimes submits unexpectedly.',
  },

  {
    slug: 'forms-formdata-serialize',
    title: 'Read every field without state',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'You want all the values from a submitted form without wiring up `useState` per field.',
      '',
      code('js', "form.addEventListener('submit', (event) => {", '  // ?', '});'),
      '',
      'Name the API that collects them from the form element.'
    ),
    graderConfig: {
      accept: ['formdata', 'new formdata(form)', 'formdata(form)', 'new formdata'],
      acceptPatterns: ['new\\s+FormData', '\\bFormData\\b'],
      nearMisses: {
        'form.elements': 'That works but is clumsy. There is a purpose-built object.',
      },
      hints: [
        'The browser has an object built exactly for this.',
        'It takes the form element and reads every named control.',
        '`new FormData(form)`',
      ],
    },
    canonicalAnswer: 'FormData',
    solution: code(
      'js',
      "form.addEventListener('submit', (event) => {",
      '  event.preventDefault();',
      '  const data = Object.fromEntries(new FormData(form));',
      '  save(data);',
      '});'
    ),
    explanation:
      'Only controls with a `name` are included, which is the rule people trip over when a field mysteriously never arrives. `Object.fromEntries` gives a plain object, with the caveat that it keeps only the last value of a repeated name, so checkboxes and multi-selects need `getAll(name)` instead. An unchecked checkbox is absent rather than false, so normalise those explicitly. `FormData` can also be passed straight to `fetch` as a body, which is how you send a file upload without touching a serialiser.',
  },

  {
    slug: 'forms-validation-both-sides',
    title: 'Where validation has to live',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A team validates everything with HTML attributes and a client-side schema, and the API trusts whatever arrives.',
      '',
      'Explain what is wrong and what each side is actually for.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['bypass', 'curl', 'devtools', 'disable', 'skip', 'attacker', 'client can'],
          missingFeedback: 'Why can the client-side check not be trusted?',
        },
        {
          synonyms: ['server', 'api', 'backend', 'must validate', 'source of truth'],
          missingFeedback: 'Which side is the real enforcement?',
        },
        {
          synonyms: ['ux', 'feedback', 'fast', 'immediate', 'convenience', 'user experience'],
          missingFeedback: 'What is the client-side check actually for?',
        },
      ],
      hints: [
        'Anyone can send a request that never touches your form.',
        'One side is a convenience, the other is enforcement.',
        'Validate on both, but only trust the server.',
      ],
    },
    canonicalAnswer:
      'A client-side check is trivially bypassed: anyone can disable it in devtools or send the request with curl, so it cannot be trusted for anything that matters. The server has to validate every request as the real enforcement point and source of truth. Client-side validation is purely a user experience feature, giving immediate feedback without a round trip.',
    solution: code(
      'ts',
      '// client: fast feedback',
      '<input type="email" required maxlength={254} />',
      '',
      '// server: the actual gate, every request, no exceptions',
      'const parsed = schema.safeParse(body);',
      'if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });'
    ),
    explanation:
      'The rule is: validate on the client for the user, validate on the server for correctness. The client version exists to avoid a round trip before telling someone their email is malformed. The server version exists because the client is under the user’s control and always will be. Sharing one schema between both is the pattern worth reaching for, since it removes the drift where a rule is tightened in one place only. Note the database has opinions too: a `NOT NULL` or a unique index is the last line of defence when application code has a race.',
  },

  {
    slug: 'forms-required-vs-aria',
    title: 'Marking a field as required',
    category: 'forms',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A field is marked required with only a red asterisk in the label.',
      '',
      'Explain what is missing for keyboard and screen reader users, and what the asterisk alone fails to convey.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['required', 'aria-required', 'attribute'],
          missingFeedback: 'Which attribute conveys the state programmatically?',
        },
        {
          synonyms: [
            'announce',
            'screen reader',
            'assistive',
            'not conveyed',
            'visual only',
            'cannot tell',
          ],
          missingFeedback: 'Why is a visual marker alone not enough?',
        },
        {
          synonyms: ['legend', 'explain', 'text', 'meaning', 'what it means', 'key', 'note'],
          missingFeedback: 'What does an asterisk on its own not explain?',
        },
      ],
      hints: [
        'A red asterisk is styling; nothing about it reaches the accessibility tree.',
        'The `required` attribute conveys the state and enables native validation.',
        'And an asterisk means nothing unless the form says what it means.',
      ],
    },
    canonicalAnswer:
      'The required attribute is missing, so the state is never announced and native validation never runs; a red asterisk is purely visual and is not conveyed to a screen reader. The asterisk also never explains itself, so the form needs a note saying that fields marked with an asterisk are required, or the word "required" in the label.',
    solution: code(
      'html',
      '<p id="req-note">Fields marked * are required.</p>',
      '',
      '<label for="email">Email <span aria-hidden="true">*</span></label>',
      '<input id="email" type="email" required aria-describedby="req-note" />'
    ),
    explanation:
      'The `required` attribute does three jobs at once: it exposes the state to assistive technology, it turns on native validation, and it enables the `:required` and `:invalid` CSS selectors. Colour and symbols are presentation, and presentation never reaches the accessibility tree. Marking the decorative asterisk `aria-hidden="true"` stops it being read as "star". If a form is mostly required fields, marking the *optional* ones is kinder and much less visual noise.',
  },

  codeProblem({
    slug: 'forms-normalize-input',
    title: 'Normalise before you validate',
    category: 'forms',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Users paste emails with stray whitespace and inconsistent case, and duplicate accounts follow.',
      '',
      'Write `normalizeEmail(input)` that trims surrounding whitespace and lowercases the value. Return an empty string for a nullish input.'
    ),
    starter: 'function normalizeEmail(input) {\n  \n}',
    tests: [
      {
        name: 'trims and lowercases',
        expression: "normalizeEmail('  Alex@Example.COM ')",
        expected: 'alex@example.com',
      },
      {
        name: 'leaves a clean value alone',
        expression: "normalizeEmail('a@b.co')",
        expected: 'a@b.co',
      },
      { name: 'handles undefined', expression: 'normalizeEmail(undefined)', expected: '' },
      { name: 'handles null', expression: 'normalizeEmail(null)', expected: '' },
      {
        name: 'does not strip internal characters',
        expression: "normalizeEmail(' First.Last+tag@Example.com ')",
        expected: 'first.last+tag@example.com',
      },
    ],
    reference: [
      'function normalizeEmail(input) {',
      "  if (input == null) return '';",
      '  return String(input).trim().toLowerCase();',
      '}',
    ].join('\n'),
    hints: [
      '`==` against null catches both null and undefined in one check.',
      '`trim()` removes surrounding whitespace only, which is what you want.',
      'Lowercase after trimming, and return the result.',
    ],
    explanation:
      'Normalising before validating and before comparing is what stops "Alex@example.com " and "alex@example.com" becoming two accounts. Do it once at the boundary, then treat the normalised value as the truth everywhere downstream, including the unique index in the database. Be careful how far you take it: stripping dots or `+tag` suffixes is a Gmail-specific convention, and applying it universally will merge genuinely different addresses on other providers. Trim and lowercase are safe; anything cleverer needs a reason.',
  }),

  {
    slug: 'forms-debounce-validation',
    title: 'Validating while the user types',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A username field checks availability against the API on every keystroke, showing "already taken" while the user is still typing the first three letters.',
      '',
      'Name two problems and how you would fix them.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['debounce', 'throttle', 'wait', 'delay', 'settle', 'pause'],
          missingFeedback: 'How do you stop a request per keystroke?',
        },
        {
          synonyms: ['request', 'every keystroke', 'load', 'spam', 'too many', 'rate'],
          missingFeedback: 'What is the cost to the server?',
        },
        {
          synonyms: [
            'blur',
            'premature',
            'too early',
            'while typing',
            'first attempt',
            'after submit',
            'touched',
            'dirty',
          ],
          missingFeedback: 'What is the user experience problem with validating immediately?',
        },
        {
          synonyms: ['race', 'out of order', 'stale', 'abort', 'cancel', 'last response'],
          missingFeedback: 'What can go wrong when several checks are in flight?',
        },
      ],
      hints: [
        'One request per keystroke is both slow and rude to the server.',
        'Showing an error before someone has finished typing is punishing.',
        'And overlapping responses can arrive out of order.',
      ],
    },
    canonicalAnswer:
      'It fires a request on every keystroke, which floods the server, so debounce the check until typing pauses for a few hundred milliseconds. It also shows an error while the user is still typing, so hold the message until the field is blurred or the form is submitted, and only show errors for fields the user has touched. With several checks in flight the responses can arrive out of order and a stale one can overwrite the current answer, so abort the previous request or ignore any response that is not for the latest value.',
    solution: code(
      'js',
      'let controller;',
      'const check = debounce(async (name) => {',
      '  controller?.abort();',
      '  controller = new AbortController();',
      '  try {',
      '    const res = await fetch(`/api/username/${name}`, { signal: controller.signal });',
      '    setAvailable(await res.json());',
      '  } catch (err) {',
      "    if (err.name !== 'AbortError') throw err;",
      '  }',
      '}, 300);'
    ),
    explanation:
      'Three separate concerns hide in this one field. Debouncing fixes the request volume. Deferring the message until blur or submit fixes the "you are wrong" while someone is mid-word, which is the difference between a form that feels helpful and one that feels hostile. Aborting or sequence-checking fixes the race, which is the subtle one: without it a slow response for "al" can land after the fast one for "alexk" and show the wrong verdict. Validate on blur, revalidate on change **once the field has an error**, so corrections clear immediately.',
  },

  {
    slug: 'forms-file-upload-type',
    title: 'Sending a file',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'An upload fails on the server, which sees no file. The client does this:',
      '',
      code(
        'js',
        'fetch(url, {',
        '  method: "POST",',
        '  headers: { "Content-Type": "multipart/form-data" },',
        '  body: formData,',
        '});'
      ),
      '',
      'What single change fixes it?'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'remove[\\s\\S]*content-type',
        'delete[\\s\\S]*content-type',
        'drop[\\s\\S]*content-type',
        "don'?t set[\\s\\S]*content-type",
        'omit[\\s\\S]*content-type',
        'no[\\s\\S]*content-type header',
      ],
      closeSubstrings: {
        boundary: 'Right cause. So what do you do about the header?',
        'application/json': 'JSON is the wrong content type for a file upload entirely.',
      },
      hints: [
        'A multipart body needs a boundary parameter in the header.',
        'You cannot know the boundary; the browser generates it.',
        'Delete the Content-Type header and let fetch set it.',
      ],
    },
    canonicalAnswer: 'Remove the Content-Type header and let the browser set it.',
    solution: code(
      'js',
      'fetch(url, { method: "POST", body: formData });',
      '// fetch sets: Content-Type: multipart/form-data; boundary=----WebKitFormBoundary…'
    ),
    explanation:
      'A multipart body is a set of parts separated by a boundary string, and the header has to carry that exact boundary. The browser generates it when it serialises the `FormData`, so hardcoding the header without a boundary produces a request the server cannot parse, and it fails as "no file" rather than as a parse error. Passing `FormData` as the body and setting no `Content-Type` is the whole fix. This is one of the few cases where setting fewer headers is more correct.',
  },

  {
    slug: 'forms-autocomplete-attribute',
    title: 'Letting the browser fill it in',
    category: 'forms',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A checkout form does not offer any saved address or card details, and users retype everything.',
      '',
      'Name the input attribute that tells the browser what each field holds.'
    ),
    graderConfig: {
      accept: ['autocomplete', 'autocomplete attribute'],
      acceptPatterns: ['\\bautocomplete\\b'],
      nearMisses: {
        autofill: 'Autofill is the browser feature. The attribute has a different name.',
        placeholder: 'A placeholder is a visual hint and tells the browser nothing.',
      },
      hints: [
        'It takes values from a standard vocabulary, not free text.',
        'Examples: `email`, `given-name`, `postal-code`, `cc-number`, `one-time-code`.',
        '`autocomplete`',
      ],
    },
    canonicalAnswer: 'autocomplete',
    solution: code(
      'html',
      '<input name="email" autocomplete="email" />',
      '<input name="zip" autocomplete="postal-code" />',
      '<input name="code" autocomplete="one-time-code" inputmode="numeric" />'
    ),
    explanation:
      'The values come from a fixed vocabulary in the HTML spec, and the browser matches on that rather than on your `name` attribute, so a field called `zip_code_2` still fills correctly when it is labelled `postal-code`. Autofill is a large accessibility and usability win, especially for anyone with a motor or cognitive impairment, and on mobile it is the difference between a checkout that converts and one that does not. `one-time-code` lets iOS and Android offer an SMS code straight from the keyboard. `autocomplete="off"` is widely ignored by password managers, and using it on address or payment fields mostly just annoys people.',
  },

  {
    slug: 'forms-optimistic-double-submit',
    title: 'Double-clicked submit',
    category: 'forms',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'An impatient user double-clicks Submit and two orders are created.',
      '',
      'Name a client-side mitigation and the server-side guarantee, and say why you need both.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['disable', 'pending', 'in flight', 'loading', 'guard', 'flag', 'lock'],
          missingFeedback: 'What stops the second click in the UI?',
        },
        {
          synonyms: ['idempot', 'unique', 'constraint', 'dedupe', 'token', 'key'],
          missingFeedback: 'What makes the server safe regardless?',
        },
        {
          synonyms: [
            'retry',
            'network',
            'curl',
            'not enough',
            'cannot trust',
            'bypass',
            'race',
            'refresh',
            'two tabs',
          ],
          missingFeedback: 'Why is the client-side guard not sufficient on its own?',
        },
      ],
      hints: [
        'The quick fix is to disable the button while the request is in flight.',
        'But a retry, a refresh or a second tab can still send it twice.',
        'The server needs an idempotency key or a unique constraint.',
      ],
    },
    canonicalAnswer:
      'On the client, disable the submit button while the request is in flight, or guard with a pending flag. On the server, make the write idempotent with an idempotency key or a unique constraint so a repeat of the same request cannot create a second order. You need both because the client guard only covers the double click: a network retry, a page refresh or a second tab can still produce two requests, and the client is not something you control.',
    solution: code(
      'jsx',
      '<button type="submit" disabled={isSubmitting}>',
      "  {isSubmitting ? 'Placing…' : 'Place order'}",
      '</button>',
      '',
      '// and on the server',
      '// POST /orders  Idempotency-Key: <uuid generated once per form render>',
      '// second request with the same key returns the first result'
    ),
    explanation:
      'Disabling the button is the fix everyone reaches for and it handles the common case, but it is a user experience improvement rather than a correctness guarantee. The client can retry on a flaky connection, the user can refresh mid-request, and neither is under your control. The server-side version is what actually protects the data: generate the key once when the form is rendered, send it with the request, and have the server return the original result for a repeat. A unique constraint on a natural key achieves the same thing more cheaply when one exists.',
  },
];
