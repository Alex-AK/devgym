import { code, md, type ProblemDraft } from './types';

/** Spot-the-bug problems: read a realistic snippet, name what is wrong. */
export const debuggingProblems: ProblemDraft[] = [
  {
    slug: 'debug-async-foreach',
    title: 'The loop that finished too early',
    category: 'debugging',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      '`done` logs before any save completes, and errors vanish:',
      '',
      code(
        'js',
        'items.forEach(async (item) => {',
        '  await save(item);',
        '});',
        "console.log('done');"
      ),
      '',
      'Explain the bug and give a fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'ignore',
            'discard',
            'does not await',
            "doesn't await",
            'return value',
            'returns undefined',
            'not wait',
          ],
          missingFeedback: 'What does forEach do with the promise each callback returns?',
        },
        {
          synonyms: ['for...of', 'for of', 'for…of', 'promise.all', 'map'],
          missingFeedback:
            'Name a construct that actually waits: a for…of loop, or Promise.all over a map.',
        },
      ],
      hints: [
        'The callback is async, so it returns a promise.',
        '`forEach` throws that promise away. It has no idea it should wait.',
        'Use `for (const item of items) await save(item)` for sequential, or `await Promise.all(items.map(save))` for parallel.',
      ],
    },
    canonicalAnswer:
      'forEach ignores the promise returned by the async callback, so it starts every save and returns immediately. Nothing is awaited and rejections become unhandled. Use a for...of loop with await for sequential work, or await Promise.all(items.map(save)) to run them in parallel.',
    solution: code(
      'js',
      '// Sequential',
      'for (const item of items) {',
      '  await save(item);',
      '}',
      '',
      '// Parallel',
      'await Promise.all(items.map((item) => save(item)));'
    ),
    explanation:
      '`forEach` was designed before promises and simply discards whatever the callback returns, so an `async` callback fires off a promise that nobody holds. The loop finishes synchronously and `done` logs immediately. Worse, a rejection inside one of those orphaned promises becomes an unhandled rejection rather than something your `try/catch` can see. `for…of` respects `await` because the loop itself is inside the async function; `Promise.all` over a `map` is the parallel equivalent and keeps the error handling intact.',
  },

  {
    slug: 'debug-float-precision',
    title: 'The comparison that is never true',
    category: 'debugging',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md('What does this log?', '', code('js', 'console.log(0.1 + 0.2 === 0.3);')),
    graderConfig: {
      accept: ['false'],
      nearMisses: {
        true: 'It is not. Floating-point addition does not land exactly on 0.3.',
        '0.3': 'The expression is a comparison, so the result is a boolean.',
      },
      hints: [
        'JavaScript numbers are IEEE-754 doubles.',
        '0.1 and 0.2 cannot be represented exactly in binary.',
        '`0.1 + 0.2` is actually `0.30000000000000004`.',
      ],
    },
    canonicalAnswer: 'false',
    solution: code(
      'js',
      'console.log(0.1 + 0.2);            // 0.30000000000000004',
      'console.log(0.1 + 0.2 === 0.3);    // false',
      '',
      '// Compare with a tolerance:',
      'Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON; // true'
    ),
    explanation:
      'JavaScript numbers are IEEE-754 doubles, and `0.1` and `0.2` have no exact binary representation, for the same reason `1/3` cannot be written exactly in decimal. The sum lands on `0.30000000000000004`, so the strict comparison fails. Compare with a tolerance (`Math.abs(a - b) < Number.EPSILON`) for general arithmetic, and for **money** do not use floats at all: store integer minor units (pence, cents) or use a decimal library, or your invoice totals will drift by a penny.',
  },

  {
    slug: 'debug-array-fill-objects',
    title: 'Three rows that change together',
    category: 'debugging',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'Editing one row edits all three:',
      '',
      code(
        'js',
        'const rows = new Array(3).fill({ value: 0 });',
        'rows[0].value = 9;',
        'console.log(rows[1].value); // 9 😱'
      ),
      '',
      'Explain why, and how to build the array correctly.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['same', 'reference', 'one object', 'shared', 'identical', 'once'],
          missingFeedback: 'How many objects were actually created?',
        },
        {
          synonyms: ['from', 'map', 'each', 'new object', 'factory', 'callback'],
          missingFeedback: 'What do you use instead so each slot gets its own object?',
        },
      ],
      hints: [
        '`fill` takes a *value*, and it is evaluated once.',
        'All three slots hold the same reference to a single object.',
        '`Array.from({ length: 3 }, () => ({ value: 0 }))` runs the factory per slot.',
      ],
    },
    canonicalAnswer:
      'fill takes a single value that is evaluated once, so all three slots hold a reference to the same object. Use Array.from({ length: 3 }, () => ({ value: 0 })), which calls the factory once per slot and creates three distinct objects.',
    solution: code(
      'js',
      'const rows = Array.from({ length: 3 }, () => ({ value: 0 }));',
      'rows[0].value = 9;',
      'console.log(rows[1].value); // 0 ✅'
    ),
    explanation:
      '`fill(value)` evaluates its argument **once** and writes that same reference into every slot, so you get one object with three pointers to it. Mutating through any index is visible through all of them. `Array.from({ length: n }, factory)` invokes the factory per index, producing genuinely separate objects. The same trap appears with `.fill([])` for nested arrays and with a shared object used as a default parameter. Note it is harmless for primitives, since those are copied by value.',
  },

  {
    slug: 'debug-try-catch-async',
    title: 'The catch block that never runs',
    category: 'debugging',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'The rejection escapes as an unhandled promise rejection instead of hitting the catch:',
      '',
      code(
        'js',
        'try {',
        '  loadUser(); // async function that rejects',
        '} catch (err) {',
        '  report(err);',
        '}'
      ),
      '',
      'Explain why, and the minimal fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['await', 'missing await', 'not awaited', 'no await'],
          missingFeedback: 'What one keyword is missing?',
        },
        {
          synonyms: [
            'synchronous',
            'already returned',
            'moved on',
            'rejects later',
            'after',
            'exited',
            'catch only',
          ],
          missingFeedback:
            'Why does try/catch miss it? What has already happened by the time the promise rejects?',
        },
      ],
      hints: [
        '`try/catch` only catches errors thrown while the block is executing.',
        '`loadUser()` returns a promise immediately; the block finishes before it rejects.',
        'Add `await` (or attach a `.catch()`).',
      ],
    },
    canonicalAnswer:
      'try/catch only catches synchronous throws. loadUser() returns a promise immediately and the try block exits before the rejection happens, so there is nothing left to catch it. Add await in front of the call, or attach a .catch() to the promise.',
    solution: code(
      'js',
      'try {',
      '  await loadUser();',
      '} catch (err) {',
      '  report(err);',
      '}',
      '',
      '// Or, without await:',
      'loadUser().catch(report);'
    ),
    explanation:
      'A `try` block catches only what is thrown while it is executing. An async function returns a promise **synchronously** and rejects later, by which time the block has long since exited, so the rejection has nowhere to go and surfaces as an `unhandledrejection`. `await` bridges the two worlds: it converts a rejected promise into a thrown exception at that point in the function, which `catch` can then see. The same applies to a `throw` inside a `setTimeout` callback, which no surrounding `try` can catch either.',
  },

  {
    slug: 'debug-json-date',
    title: 'The date that became a string',
    category: 'debugging',
    difficulty: 'easy',
    type: 'explain',
    prompt: md(
      'After a round trip through the API, `order.createdAt.getFullYear()` throws "is not a function":',
      '',
      code('js', 'const order = JSON.parse(JSON.stringify({ createdAt: new Date() }));'),
      '',
      'Explain what happened and how you normally handle it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['string', 'iso', 'text', 'serialized', 'serialised'],
          missingFeedback: 'What type is createdAt after the round trip?',
        },
        {
          synonyms: ['new date', 'reviver', 'parse it back', 'convert', 'rehydrat', 'revive'],
          missingFeedback: 'How do you get a real Date back?',
        },
      ],
      hints: [
        'JSON has no date type.',
        '`JSON.stringify` calls `toJSON()` on a Date, producing an ISO string.',
        '`JSON.parse` has no idea it was a Date. Reconstruct it with `new Date(str)` or a reviver.',
      ],
    },
    canonicalAnswer:
      'JSON has no date type, so stringify turns the Date into an ISO string and parse gives that string straight back. It is no longer a Date. Reconstruct it explicitly with new Date(order.createdAt), a reviver function, or a schema library that coerces it.',
    solution: code(
      'js',
      '// Explicit',
      'const order = { ...raw, createdAt: new Date(raw.createdAt) };',
      '',
      '// Or with a reviver',
      'JSON.parse(text, (key, value) =>',
      "  key === 'createdAt' ? new Date(value) : value,",
      ');'
    ),
    explanation:
      "JSON has exactly six types and `Date` is not one of them. `JSON.stringify` calls the Date's `toJSON()`, which yields an ISO-8601 string, and `JSON.parse` has no way to know that string was meant to be a Date, so you get a string with no error at all. The same round trip drops `undefined`, functions and `Symbol`s, converts `Map`/`Set` to `{}`, and throws on `BigInt` and circular references. Convert dates explicitly at your API boundary, ideally in one schema-validation step rather than scattered `new Date()` calls.",
  },

  {
    slug: 'debug-this-callback',
    title: 'this is undefined in the callback',
    category: 'debugging',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      "This throws `Cannot read properties of undefined (reading 'prefix')`:",
      '',
      code(
        'js',
        'class Logger {',
        "  prefix = '[app]';",
        '  log(msg) { console.log(this.prefix, msg); }',
        '}',
        '',
        'const logger = new Logger();',
        "events.on('tick', logger.log);"
      ),
      '',
      'Explain what happened to `this` and give two fixes.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'lost',
            'detach',
            'unbound',
            'call site',
            'how it is called',
            'context',
            'not bound',
          ],
          missingFeedback: 'Why is `this` wrong? What determines it for a normal function?',
        },
        {
          synonyms: ['bind', 'arrow', '=>', 'wrap'],
          missingFeedback:
            'Name a fix. Bind it, wrap it in an arrow function, or use a class field.',
        },
      ],
      hints: [
        'Passing `logger.log` passes the function, not the method-plus-receiver.',
        'For an ordinary function `this` is decided by *how it is called*, and here it is called bare.',
        'Fix with `logger.log.bind(logger)`, an arrow wrapper `() => logger.log(…)`, or define `log = (msg) => {…}` as a class field.',
      ],
    },
    canonicalAnswer:
      'Passing logger.log detaches the method from its receiver; for a normal function this is determined by the call site, and the emitter calls it bare so this is undefined in strict mode. Fix it with logger.log.bind(logger), by wrapping it in an arrow function, or by defining log as an arrow-function class field.',
    solution: code(
      'js',
      "events.on('tick', logger.log.bind(logger));      // bind",
      "events.on('tick', (msg) => logger.log(msg));     // arrow wrapper",
      '',
      '// or make it immune at the definition site:',
      'class Logger {',
      "  prefix = '[app]';",
      '  log = (msg) => console.log(this.prefix, msg); // class field',
      '}'
    ),
    explanation:
      'For an ordinary function `this` is bound at the **call site**, not where the function was defined. `logger.log` evaluates to the bare function and the emitter invokes it with no receiver, so `this` is `undefined` (class bodies are always strict mode). `bind` returns a new function with `this` pinned; an arrow wrapper keeps the call as a method call; and an arrow-function class field captures `this` lexically at construction, which is why that pattern is so common in React class components. The cost of the class field is one function per instance rather than one on the prototype.',
  },

  {
    slug: 'debug-equality-coercion',
    title: 'A comparison that lies',
    category: 'debugging',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'A form field returns the string `"0"`. What does this log?',
      '',
      code('js', "console.log('0' == false, '0' === false);"),
      '',
      'Answer with the two booleans in order.'
    ),
    graderConfig: {
      accept: ['true false', 'true, false', 'true and false'],
      acceptPatterns: ['\\btrue\\b[\\s,]+(and\\s+)?\\bfalse\\b'],
      nearMisses: {
        'false false':
          '`==` coerces both sides to numbers here, and `Number("0") === Number(false)`.',
        'true true': '`===` compares types first. A string is never strictly equal to a boolean.',
      },
      hints: [
        '`==` applies type coercion; `===` does not.',
        'With `==` between a string and a boolean, both are converted to numbers.',
        '`Number("0")` is 0 and `Number(false)` is 0, so `==` is true; `===` is false because the types differ.',
      ],
    },
    canonicalAnswer: 'true false',
    solution: code(
      'js',
      "'0' == false;  // true . Both coerced to the number 0",
      "'0' === false; // false. Different types, no coercion",
      '',
      "if ('0') { /* runs! */ }  // but a non-empty string is truthy"
    ),
    explanation:
      "Loose equality converts both operands toward numbers, so `'0'` and `false` both become `0` and compare equal. The genuinely confusing part is that this does **not** match truthiness: `'0'` is a non-empty string and therefore truthy, so `if ('0')` runs while `'0' == false` is true. Use `===` always, and test truthiness directly rather than comparing to `true`/`false`. The one idiomatic exception is `x == null`, which neatly matches both `null` and `undefined`.",
  },

  {
    slug: 'debug-parseint-radix',
    title: 'Parsing a number from input',
    category: 'debugging',
    difficulty: 'medium',
    type: 'short-text',
    prompt: md(
      'A quantity field yields `"12kg"` and a price field yields `"1e3"`. What do these produce?',
      '',
      code('js', "console.log(parseInt('12kg'), Number('12kg'));"),
      '',
      'Answer with the two values in order.'
    ),
    graderConfig: {
      accept: ['12 nan', '12, nan', '12 and nan'],
      acceptPatterns: ['\\b12\\b[\\s,]+(and\\s+)?NaN\\b'],
      nearMisses: {
        '12 12':
          'Number() does not stop at the first invalid character. It rejects the whole string.',
        'nan nan': 'parseInt is lenient: it reads as many valid digits as it can from the front.',
      },
      hints: [
        'The two functions disagree about trailing junk.',
        '`parseInt` reads leading digits and stops at the first character it cannot use.',
        '`Number` requires the *entire* string to be a valid number, otherwise NaN.',
      ],
    },
    canonicalAnswer: '12 NaN',
    solution: code(
      'js',
      "parseInt('12kg');  // 12  . Stops at the first non-digit",
      "Number('12kg');    // NaN . Whole string must be valid",
      '',
      "parseInt('1e3');   // 1   . 'e' is not a digit!",
      "Number('1e3');     // 1000. Exponent notation understood"
    ),
    explanation:
      "`parseInt` is deliberately lenient: it reads as many leading digits as it can and silently ignores the rest, which is why `'12kg'` gives `12` and, much more dangerously, `'1e3'` gives `1`, since `e` is not a digit in base 10. `Number()` (or the unary `+`) requires the entire string to be a valid numeric literal and returns `NaN` otherwise, which is usually what validation actually wants. If you do use `parseInt`, always pass the radix: `parseInt(str, 10)`. And remember `NaN !== NaN`, so test with `Number.isNaN`.",
  },

  {
    slug: 'debug-object-default-param',
    title: 'State that leaks between calls',
    category: 'debugging',
    difficulty: 'hard',
    type: 'explain',
    prompt: md(
      'The second call returns `["a", "b"]` instead of `["b"]`:',
      '',
      code(
        'js',
        'const cache = [];',
        'function collect(item, into = cache) {',
        '  into.push(item);',
        '  return into;',
        '}',
        '',
        "collect('a'); // ['a']",
        "collect('b'); // ['a', 'b']  ← wanted ['b']"
      ),
      '',
      'Explain the bug and the fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['same', 'shared', 'one array', 'module', 'outer', 'reference', 'persist'],
          missingFeedback: 'How many arrays exist, and where does the default point?',
        },
        {
          synonyms: ['inside', 'literal', '= []', 'fresh', 'new array', 'per call', 'each call'],
          missingFeedback: 'What should the default be so each call gets its own?',
        },
      ],
      hints: [
        'The default expression is evaluated on every call, but it evaluates to the *same* outer array.',
        'Every call without a second argument mutates that one shared array.',
        'Default to a fresh literal instead: `function collect(item, into = [])`.',
      ],
    },
    canonicalAnswer:
      'The default points at the single shared `cache` array, so every call without an explicit argument pushes into the same array and the results accumulate. Default to a fresh array literal instead (`into = []`), which is evaluated per call and gives each invocation its own.',
    solution: code(
      'js',
      'function collect(item, into = []) {',
      '  into.push(item);',
      '  return into;',
      '}',
      '',
      "collect('a'); // ['a']",
      "collect('b'); // ['b'] ✅"
    ),
    explanation:
      "JavaScript evaluates default parameter expressions on **every call**, which is better than Python's famous once-at-definition behaviour, but it does not help here, because the expression `cache` resolves to the same shared array each time. The mutation, not the default, is the bug. Defaulting to a fresh `[]` gives each call its own array. The safest habit is for functions like this not to mutate their argument at all: build and return a new array, and let the caller decide what to keep.",
  },
];
