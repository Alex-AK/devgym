import { code, codeProblem, md, type ProblemDraft } from './types';

export const testingProblems: ProblemDraft[] = [
  {
    slug: 'testing-query-priority',
    title: 'How to find an element in a test',
    category: 'testing',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A test finds the save button with a test id:',
      '',
      code('js', "screen.getByTestId('save-btn').click();"),
      '',
      'Name the query that Testing Library recommends first, and explain why it is better here.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['getbyrole', 'by role', 'role'],
          missingFeedback: 'Which query family comes first in the recommended order?',
        },
        {
          synonyms: [
            'accessib',
            'screen reader',
            'assistive',
            'like a user',
            'as a user',
            'user find',
          ],
          missingFeedback: 'What does querying by role actually assert?',
        },
        {
          synonyms: [
            'test id',
            'testid',
            'implementation',
            'invisible',
            'no user',
            'coupled',
            'refactor',
          ],
          missingFeedback: 'What is the drawback of a test id?',
        },
      ],
      hints: [
        'The recommended order starts with queries that reflect how people find things.',
        'A test id is invisible to users and to assistive technology.',
        '`getByRole("button", { name: /save/i })`',
      ],
    },
    canonicalAnswer:
      'getByRole is the recommended first choice: getByRole("button", { name: /save/i }). It finds the element the way a user or a screen reader would, so it also asserts the element is a real button with an accessible name. A test id is invisible to users, proves nothing about accessibility, and couples the test to an implementation detail that a refactor can quietly break.',
    solution: code('js', "await userEvent.click(screen.getByRole('button', { name: /save/i }));"),
    explanation:
      'The recommended order is roughly role, label text, placeholder, text, display value, alt text, title, and test id last. It is not arbitrary: the higher a query sits, the closer it is to how a real person finds the control, so the test doubles as a check that the markup is usable. A `getByRole` failure often means a genuine accessibility bug, such as a div acting as a button. Test ids are a legitimate escape hatch for things with no accessible handle, like a chart canvas, and should feel like an exception rather than the default.',
  },

  {
    slug: 'testing-implementation-details',
    title: 'The test that breaks on every refactor',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This test fails whenever the component is refactored, even when the UI behaves identically:',
      '',
      code('js', "expect(wrapper.state('isOpen')).toBe(true);"),
      '',
      'Explain the problem and what to assert instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['implementation', 'internal', 'private', 'how it works', 'state'],
          missingFeedback: 'What is the test coupled to?',
        },
        {
          synonyms: ['behaviour', 'behavior', 'output', 'rendered', 'visible', 'user sees', 'dom'],
          missingFeedback: 'What should it assert instead?',
        },
        {
          synonyms: [
            'false',
            'brittle',
            'no confidence',
            'passes when broken',
            'fails when fine',
            'refactor',
            'noise',
          ],
          missingFeedback: 'What does that coupling cost you?',
        },
      ],
      hints: [
        'The state field is not something a user can observe.',
        'A refactor that renames it breaks the test without breaking the app.',
        'Assert what the user sees: the menu is in the document.',
      ],
    },
    canonicalAnswer:
      'The test asserts an implementation detail, the internal state field, rather than behaviour. That makes it brittle: a refactor that renames the state breaks the test even though the UI is unchanged, and it can equally pass while the component is visibly broken. Assert the rendered output instead: that the menu is visible in the document after the trigger is clicked.',
    solution: code(
      'js',
      "await userEvent.click(screen.getByRole('button', { name: /menu/i }));",
      "expect(screen.getByRole('menu')).toBeInTheDocument();"
    ),
    explanation:
      'A test coupled to internals fails in both directions: it goes red on harmless refactors, and it can stay green while the rendered output is broken. Neither failure mode gives you confidence, and the first one actively trains the team to distrust the suite. The rule of thumb is to assert what a user could observe, which keeps the test valid across any refactor that preserves behaviour. That is exactly what makes a test suite a safety net for changing code rather than a tax on changing it.',
  },

  {
    slug: 'testing-async-findby',
    title: 'Asserting something that has not arrived yet',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'This fails because the row renders after the fetch resolves:',
      '',
      code('js', "expect(screen.getByText('Ada')).toBeInTheDocument();"),
      '',
      'Which query family should replace `getByText` here?'
    ),
    graderConfig: {
      accept: ['findbytext', 'findby', 'find by text', 'await findbytext'],
      acceptPatterns: ['findBy'],
      nearMisses: {
        querybytext: 'queryBy returns null instead of throwing, but it still does not wait.',
        getbytext: 'That is the one that fails. It is synchronous.',
      },
      closeSubstrings: {
        waitfor: 'waitFor works, but there is a query family that wraps it for you.',
      },
      hints: [
        '`getBy` throws immediately, `queryBy` returns null immediately. Neither waits.',
        'One family returns a promise and retries until it appears or times out.',
        '`findByText`, awaited.',
      ],
    },
    canonicalAnswer: 'findByText',
    solution: code('js', "expect(await screen.findByText('Ada')).toBeInTheDocument();"),
    explanation:
      'The three families are worth memorising: `getBy` throws if not found, `queryBy` returns null if not found, `findBy` returns a promise that retries until it appears or the timeout is reached. Use `getBy` for things that should already be there, `queryBy` **only** for asserting absence, and `findBy` for anything that arrives later. Forgetting the `await` on a `findBy` is a common trap, because the assertion then runs against a pending promise and passes or fails for the wrong reason. `waitFor` remains useful for waiting on something that is not a query at all.',
  },

  {
    slug: 'testing-what-to-mock',
    title: 'How much to mock',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A component test mocks the API client, the router, the analytics module and two child components. It passes, and the feature is broken in the browser.',
      '',
      'Explain the failure mode and give a better boundary to mock at.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'nothing real',
            'not testing',
            'tests the mock',
            'assumption',
            'drift',
            'out of date',
            'no confidence',
            'never runs',
          ],
          missingFeedback: 'What is actually being tested when everything is mocked?',
        },
        {
          synonyms: ['network', 'http', 'fetch', 'msw', 'boundary', 'edge', 'io', 'request'],
          missingFeedback: 'Where is the better place to draw the line?',
        },
        {
          synonyms: [
            'real component',
            'real children',
            'render the whole',
            'integration',
            'together',
            'wire',
          ],
          missingFeedback: 'What should stay real?',
        },
      ],
      hints: [
        'Every mock is an assumption about how the real thing behaves.',
        'Assumptions drift, and a mock never fails when the real module changes.',
        'Mock at the network boundary and let your own code run.',
      ],
    },
    canonicalAnswer:
      'With everything mocked the test only proves the mocks agree with each other. Each mock is an assumption that can drift from the real module without anything failing, so the suite passes while the wiring between the pieces is broken. Mock at the network boundary instead, with something like MSW intercepting HTTP, and let your own components, router and state run for real so the test exercises the actual integration.',
    solution: code(
      'js',
      '// mock the edge of your system, not the middle of it',
      'const server = setupServer(',
      "  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Ada' }]))",
      ');',
      '',
      '// then render the real thing',
      'render(<App />);',
      "expect(await screen.findByText('Ada')).toBeInTheDocument();"
    ),
    explanation:
      'Every mock trades realism for control, and the trade is only worth it at a boundary you do not own: the network, the clock, randomness, the file system. Mocking your own modules means the test can never catch a mistake in how they fit together, which is exactly where most real bugs live. Intercepting HTTP keeps the test fast and deterministic while leaving your code paths intact. A useful check on any test: if I broke the wiring between two of my own modules, would this go red? If not, the mocks are too deep.',
  },

  codeProblem({
    slug: 'testing-pure-function-cases',
    title: 'Pick the cases that matter',
    category: 'testing',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Write `clampPage(page, totalPages)` returning a page number held inside `1..totalPages`.',
      '',
      'Anything below 1 becomes 1, anything above the total becomes the total, and a non-finite or missing page becomes 1. When `totalPages` is 0 or less, return 1.',
      '',
      'The tests are the boundary cases someone reviewing this would ask about.'
    ),
    starter: 'function clampPage(page, totalPages) {\n  \n}',
    tests: [
      { name: 'passes a value already in range', expression: 'clampPage(3, 10)', expected: 3 },
      { name: 'clamps below the lower bound', expression: 'clampPage(0, 10)', expected: 1 },
      { name: 'clamps above the upper bound', expression: 'clampPage(99, 10)', expected: 10 },
      { name: 'accepts the lower boundary exactly', expression: 'clampPage(1, 10)', expected: 1 },
      { name: 'accepts the upper boundary exactly', expression: 'clampPage(10, 10)', expected: 10 },
      {
        name: 'treats a missing page as the first',
        expression: 'clampPage(undefined, 10)',
        expected: 1,
      },
      { name: 'treats NaN as the first', expression: 'clampPage(NaN, 10)', expected: 1 },
      { name: 'survives an empty result set', expression: 'clampPage(5, 0)', expected: 1 },
    ],
    reference: [
      'function clampPage(page, totalPages) {',
      '  const last = Number.isFinite(totalPages) ? Math.max(1, Math.trunc(totalPages)) : 1;',
      '  if (!Number.isFinite(page)) return 1;',
      '  return Math.min(Math.max(Math.trunc(page), 1), last);',
      '}',
    ].join('\n'),
    hints: [
      '`Number.isFinite` rejects NaN, Infinity and undefined in one check.',
      'Clamp the total first so an empty result set cannot produce an upper bound below 1.',
      'Then `Math.min(Math.max(page, 1), last)`.',
    ],
    explanation:
      'The interesting cases in a clamp are never the middle: they are both boundaries, one step outside each boundary, and the degenerate input. Here that means 1 and 10 exactly, 0 and 99, and `totalPages` of 0 for an empty result set, which is the one that produces a nonsense upper bound if you forget it. Non-finite input matters because this value usually arrives from a URL query string, where `Number(undefined)` is `NaN` and `NaN` silently defeats every comparison. Writing the case list before the implementation tends to produce a better implementation.',
  }),

  {
    slug: 'testing-flaky-timing',
    title: 'The test that fails one run in twenty',
    category: 'testing',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A test passes locally and fails occasionally in CI:',
      '',
      code(
        'js',
        'await new Promise((r) => setTimeout(r, 100));',
        "expect(screen.getByText('Saved')).toBeInTheDocument();"
      ),
      '',
      'Explain why an arbitrary sleep is the wrong tool and what to use instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'slower',
            'ci',
            'machine',
            'load',
            'timing',
            'race',
            'sometimes',
            'not enough',
          ],
          missingFeedback: 'Why does it fail only sometimes?',
        },
        {
          synonyms: ['findby', 'waitfor', 'wait for', 'poll', 'retry', 'condition'],
          missingFeedback: 'What should it wait on instead?',
        },
        {
          synonyms: ['slow', 'longer', 'always waits', 'wasted', 'adds time', 'padding'],
          missingFeedback: 'What is the cost of just increasing the sleep?',
        },
      ],
      hints: [
        'A shared CI runner is slower and less predictable than your laptop.',
        'The sleep encodes a guess about how long something takes.',
        'Wait for the condition, not for the clock.',
      ],
    },
    canonicalAnswer:
      'A fixed sleep encodes a guess. CI machines are slower and contended, so 100ms is sometimes not enough and the test fails intermittently. Bumping the number makes every run slower while never removing the race. Wait for the condition instead, with findByText or waitFor, which returns as soon as the expectation holds and only fails after a real timeout.',
    solution: code(
      'js',
      "expect(await screen.findByText('Saved')).toBeInTheDocument();",
      '',
      '// or for something that is not a query',
      'await waitFor(() => expect(onSave).toHaveBeenCalled());'
    ),
    explanation:
      'A sleep is a bet that the machine is at least as fast as the one you wrote it on, and CI is where that bet is worst: shared runners, cold caches, other jobs competing. Waiting on a condition is both faster in the good case and more reliable in the bad one, because it returns immediately when ready and only gives up after a generous timeout. Flaky tests are worse than missing tests, because a suite people have learned to re-run is a suite nobody reads. When you genuinely need to control time, fake timers are the honest tool.',
  },

  {
    slug: 'testing-user-event-vs-fire',
    title: 'Clicking like a person',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A test types into a field with `fireEvent.change` and the component under test never sees focus, keydown or input events.',
      '',
      'Name the library that simulates the full interaction instead.'
    ),
    graderConfig: {
      accept: ['user-event', 'userevent', '@testing-library/user-event', 'user event'],
      acceptPatterns: ['user-?event'],
      nearMisses: {
        fireevent: 'fireEvent is the low-level one being replaced.',
      },
      hints: [
        '`fireEvent` dispatches exactly one event and nothing else.',
        'A real keystroke produces a sequence: focus, keydown, keypress, input, keyup.',
        '`@testing-library/user-event`',
      ],
    },
    canonicalAnswer: 'user-event',
    solution: code(
      'js',
      'const user = userEvent.setup();',
      "await user.type(screen.getByLabelText(/email/i), 'ada@example.com');",
      "await user.click(screen.getByRole('button', { name: /save/i }));"
    ),
    explanation:
      '`fireEvent.change` dispatches a single synthetic change event, which is nothing like what a browser does. `user-event` reproduces the whole sequence, so handlers on focus, keydown or blur actually run, and bugs that depend on them get caught. It also refuses interactions a real user could not perform, such as typing into a disabled input, which is a genuine assertion in itself. Every API is async and must be awaited, and `userEvent.setup()` should be called once before rendering.',
  },

  {
    slug: 'testing-coverage-meaning',
    title: 'What 100% coverage proves',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A team hits 100% line coverage and treats the suite as complete.',
      '',
      'Explain what that number does and does not tell you.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['executed', 'ran', 'exercised', 'was run', 'reached', 'touched'],
          missingFeedback: 'What does coverage actually measure?',
        },
        {
          synonyms: [
            'assert',
            'assertion',
            'correct',
            'no expect',
            'without checking',
            'does not verify',
            'meaningful',
          ],
          missingFeedback: 'What does it not measure?',
        },
        {
          synonyms: [
            'missing case',
            'edge case',
            'branch',
            'input',
            'not written',
            'gap',
            'untested case',
            'wrong behaviour',
          ],
          missingFeedback: 'What kind of bug survives 100% coverage?',
        },
      ],
      hints: [
        'A line can be executed without anything being asserted about it.',
        'Coverage finds untested code, not untested behaviour.',
        'It is a floor, not a ceiling.',
      ],
    },
    canonicalAnswer:
      'Coverage measures which lines were executed while the tests ran, nothing more. It does not measure whether anything was asserted, so code with no expect at all can show as covered. Behaviour you never thought of has no line to miss, so missing edge cases and wrong-but-consistent logic survive at 100%. It is useful for finding code nothing touches, which makes it a floor rather than a definition of done.',
    solution: code(
      'js',
      '// 100% line coverage, zero confidence',
      "it('renders', () => {",
      '  render(<Invoice items={items} />);',
      '});'
    ),
    explanation:
      'Coverage answers "did this line run", which is a genuinely useful question for finding dead or forgotten code. It cannot answer "is this behaviour correct", because that depends on assertions it never inspects. Branch coverage is a stricter signal than line coverage and worth preferring. Mutation testing gets closer to the real question by changing the code and checking whether any test notices, which is the check a coverage number only pretends to make. Treat a coverage target as a smoke alarm, not a certificate.',
  },

  {
    slug: 'testing-assertion-never-ran',
    title: 'Green against a function that resolves',
    category: 'testing',
    difficulty: 'medium',
    relevance: 'daily',
    tags: ['reading'],
    type: 'short-text',
    prompt: md(
      '`createUser` resolves for a duplicate email instead of rejecting, and this test is green:',
      '',
      code(
        'js',
        "it('rejects a duplicate email', () => {",
        '  const db = makeTestDb();',
        "  db.users.push({ id: 'usr_1', email: 'taken@example.com' });",
        '',
        "  createUser(db, { email: 'taken@example.com', name: 'Ada' }).catch((error) => {",
        "    expect(error.message).toContain('already exists');",
        '  });',
        '});'
      ),
      '',
      'Which line is the one that matters?'
    ),
    graderConfig: {
      accept: [
        'the .catch line',
        'the catch callback',
        'the assertion inside the catch',
        '.catch',
        'catch',
        'the expect inside catch',
      ],
      acceptPatterns: ['\\.?catch'],
      nearMisses: {
        'the callback is not async':
          'Making it `async` on its own changes nothing. The assertion still only runs if the promise rejects.',
        createuser: 'The call is right. What happens to the promise it returns is not.',
        'db.users.push': 'That is the fixture, and it is doing its job.',
        'expect(error.message).tocontain':
          'Right assertion, and it never executes. Say what it is sitting inside.',
      },
      hints: [
        'Every line here runs. One of them contains something that does not.',
        'The promise resolves, so the rejection handler is never called and the assertion inside it never executes.',
        'A test that makes no assertion passes. `await expect(...).rejects.toThrow(...)` is the form that cannot.',
      ],
    },
    canonicalAnswer: 'the .catch callback',
    solution: code(
      'js',
      "it('rejects a duplicate email', async () => {",
      '  const db = makeTestDb();',
      "  db.users.push({ id: 'usr_1', email: 'taken@example.com' });",
      '',
      "  await expect(createUser(db, { email: 'taken@example.com', name: 'Ada' })).rejects.toThrow(",
      "    'already exists'",
      '  );',
      '});'
    ),
    explanation:
      'A `catch` callback runs only if the promise rejects, so a test whose entire assertion lives in one passes by making no assertion at all when the code under test is wrong in exactly the way the test exists to catch. Returning the promise does not save it: run the same test with `return` in front of the call and it still passes, because the chain resolves and the handler is skipped. `await expect(promise).rejects.toThrow(...)` inverts that, failing when nothing is thrown, and it is worth the habit for `await`ing too, since Vitest reports an un-awaited `rejects` as a hanging assertion. Where an assertion really does belong inside a callback, `expect.assertions(1)` is the guard that turns "never ran" into a failure.',
  },
];
