import { code, md, type ProblemDraft } from './types';

export const typescriptProblems: ProblemDraft[] = [
  {
    slug: 'ts-partial',
    title: 'Make every field optional',
    category: 'typescript',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'Your update endpoint accepts any subset of `User`:',
      '',
      code(
        'ts',
        'interface User { id: string; name: string; email: string }',
        '',
        'function update(id: string, patch: ???) {}'
      ),
      '',
      'Which built-in utility type expresses "every field of `User`, all optional"?'
    ),
    graderConfig: {
      accept: ['partial<user>', 'partial'],
      acceptPatterns: ['Partial\\s*<\\s*User\\s*>'],
      nearMisses: {
        'optional<user>': 'There is no `Optional` utility type in TypeScript.',
        'required<user>': 'Required does the opposite. It strips the `?` off optional fields.',
        'pick<user>': 'Pick selects specific keys; it does not make them optional.',
      },
      hints: [
        'TypeScript ships a handful of mapped utility types for exactly this.',
        'It is the opposite of `Required<T>`.',
        '`Partial<User>`',
      ],
    },
    canonicalAnswer: 'Partial<User>',
    solution: code('ts', 'function update(id: string, patch: Partial<User>) {}'),
    explanation:
      '`Partial<T>` is a mapped type that adds `?` to every property, which is exactly the shape of a PATCH body. Its siblings are worth memorising as a set: `Required<T>` removes the `?`, `Readonly<T>` adds `readonly`, `Pick<T, K>` keeps named keys and `Omit<T, K>` drops them. One caveat. `Partial` is shallow, so nested objects keep their required fields; a deep version has to be written by hand with recursion.',
  },

  {
    slug: 'ts-omit',
    title: 'A type minus one field',
    category: 'typescript',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'When creating a `User` the `id` does not exist yet:',
      '',
      code(
        'ts',
        'interface User { id: string; name: string; email: string }',
        '',
        'function create(draft: ???) {}'
      ),
      '',
      'Write the utility type for "`User` without `id`".'
    ),
    graderConfig: {
      accept: ["omit<user, 'id'>", 'omit<user, "id">', 'omit<user,"id">', "omit<user,'id'>"],
      acceptPatterns: ['Omit\\s*<\\s*User\\s*,\\s*[\'"`]id[\'"`]\\s*>'],
      nearMisses: {
        'exclude<user, "id">':
          'Exclude operates on union *members*, not object keys. Omit is the one for properties.',
        "pick<user, 'id'>": 'Pick keeps only that key. You want everything except it.',
      },
      hints: [
        'There is a utility that removes keys from an object type.',
        'It takes the type and a union of key names as a string literal.',
        "`Omit<User, 'id'>`",
      ],
    },
    canonicalAnswer: "Omit<User, 'id'>",
    solution: code('ts', "function create(draft: Omit<User, 'id'>) {}"),
    explanation:
      "`Omit<T, K>` removes the named keys; `Pick<T, K>` is its complement. Note that `Omit` does **not** check that `K` actually exists on `T`. `Omit<User, 'idd'>` compiles happily and silently omits nothing, which is a real source of stale types after a rename. `Exclude<T, U>` looks similar but works on unions of types rather than object keys. For a create/update pair, `Omit<User, 'id'>` and `Partial<Omit<User, 'id'>>` cover both directions.",
  },

  {
    slug: 'ts-record',
    title: 'Type a lookup object',
    category: 'typescript',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'You want an object mapping each of these statuses to a display colour:',
      '',
      code(
        'ts',
        "type Status = 'open' | 'closed' | 'pending';",
        '',
        'const colours: ??? = { open: "green", closed: "grey", pending: "amber" };'
      ),
      '',
      'Write the type that requires **every** status to have a string value.'
    ),
    graderConfig: {
      accept: ['record<status, string>', 'record<status,string>'],
      acceptPatterns: ['Record\\s*<\\s*Status\\s*,\\s*string\\s*>'],
      nearMisses: {
        '{ [key: string]: string }':
          'An index signature allows any key and does not require all three. Record with the union is stricter.',
        'map<status, string>': 'Map is a runtime collection, not a type for an object literal.',
      },
      hints: [
        'One utility type builds an object type from a key union and a value type.',
        '`Record<Keys, Value>`',
        '`Record<Status, string>`',
      ],
    },
    canonicalAnswer: 'Record<Status, string>',
    solution: code('ts', 'const colours: Record<Status, string> = { … };'),
    explanation:
      '`Record<K, V>` builds an object type whose keys are `K` and whose values are `V`. Using a **union of literals** as `K` makes it exhaustive: add a fourth status and every `Record<Status, …>` in the codebase becomes a compile error until you fill it in, which is precisely the safety you want for colour maps, labels and reducers. Contrast with an index signature `{ [k: string]: string }`, which allows any key, requires none, and makes every lookup possibly-undefined under `noUncheckedIndexedAccess`.',
  },

  {
    slug: 'ts-unknown-vs-any',
    title: 'unknown versus any',
    category: 'typescript',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'A reviewer changes the type of a parsed JSON response from `any` to `unknown`.',
      '',
      'Explain what that buys you and what it now forces you to do.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'disable',
            'turns off',
            'no check',
            'anything',
            'opt out',
            'bypass',
            'silently',
          ],
          missingFeedback: 'What does `any` do to type checking on that value?',
        },
        {
          synonyms: ['narrow', 'check', 'guard', 'typeof', 'assert', 'validate', 'before'],
          missingFeedback: 'What must you do before you can use an `unknown` value?',
        },
      ],
      hints: [
        '`any` is an escape hatch; `unknown` is a lid.',
        'With `any`, `response.user.name.toUpperCase()` compiles even if it will crash.',
        'With `unknown`, you must narrow (typeof, a type guard, a schema parse) before touching it.',
      ],
    },
    canonicalAnswer:
      'any disables type checking entirely, so any property access or call compiles even when it will crash at runtime. unknown accepts any value but permits nothing until you narrow it with a typeof check, a type guard or a schema validation, so the unsafe step becomes explicit.',
    solution: code(
      'ts',
      'const data: unknown = await res.json();',
      '',
      '// Must narrow before use:',
      "if (typeof data === 'object' && data !== null && 'user' in data) {",
      '  // …',
      '}',
      '',
      '// Or validate with a schema library and get a typed value out.'
    ),
    explanation:
      '`any` switches off type checking for that value and everything reached through it, so mistakes propagate silently. One `any` at an API boundary can defeat types across a whole module. `unknown` is the type-safe counterpart: every value is assignable *to* it, but you cannot read a property, call it, or assign it elsewhere until you have narrowed it. That forces the validation step to be written rather than assumed, which is exactly what you want at the edges of a program (JSON, `catch` clauses, third-party payloads).',
  },

  {
    slug: 'ts-discriminated-union',
    title: 'Exhaustive switch on a union',
    category: 'typescript',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'You have:',
      '',
      code(
        'ts',
        'type Result =',
        "  | { status: 'ok'; data: string }",
        "  | { status: 'error'; message: string };"
      ),
      '',
      'How do you get the compiler to **fail the build** when someone later adds a third variant and forgets to handle it?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['never'],
          missingFeedback: 'Which type is assignable from nothing, and so acts as the tripwire?',
        },
        {
          synonyms: ['default', 'exhaustive', 'switch', 'else'],
          missingFeedback: 'Where do you put the check, which branch of the switch?',
        },
      ],
      hints: [
        'Switch on the discriminant (`status`) and handle every case.',
        'In the default branch, assign the value to something of type `never`.',
        'Once a variant is unhandled it is no longer narrowed away, so it stops being assignable to `never` and the build fails.',
      ],
    },
    canonicalAnswer:
      'Switch on the status discriminant, handle every case, and in the default branch assign the value to a variable of type never. An exhaustiveness check. When a new variant is added it is no longer narrowed away, so it is not assignable to never and compilation fails.',
    solution: code(
      'ts',
      'function render(result: Result): string {',
      '  switch (result.status) {',
      "    case 'ok':    return result.data;",
      "    case 'error': return result.message;",
      '    default: {',
      '      const exhaustive: never = result; // ← compile error if a case is missed',
      '      return exhaustive;',
      '    }',
      '  }',
      '}'
    ),
    explanation:
      'A **discriminated union** is a union whose members share a literal-typed field, which lets the compiler narrow each `case` to one variant automatically. The exhaustiveness trick relies on that narrowing: by the `default` branch every handled variant has been eliminated, so the remaining type is `never`, and only `never` is assignable to `never`. Add a third variant and that assignment breaks, turning a silent runtime gap into a compile error. This is one of the highest-value patterns in a TypeScript codebase.',
  },

  {
    slug: 'ts-as-const',
    title: 'Widening and const assertions',
    category: 'typescript',
    difficulty: 'medium',
    type: 'short-text',
    prompt: md(
      'This fails because `method` is inferred as `string`, not `"GET"`:',
      '',
      code(
        'ts',
        "const config = { method: 'GET' };",
        'fetchTyped(config); // expects { method: "GET" | "POST" }'
      ),
      '',
      'What do you append to the object literal to keep the literal types?'
    ),
    graderConfig: {
      accept: ['as const', 'as const;'],
      acceptPatterns: ['as\\s+const'],
      nearMisses: {
        readonly: '`readonly` prevents reassignment but does not stop literal widening.',
        'as string': 'That widens it further. You want to keep the narrow literal type.',
      },
      hints: [
        'There is a two-word assertion that stops literal types from widening.',
        'It also makes the object deeply readonly.',
        '`as const`',
      ],
    },
    canonicalAnswer: 'as const',
    solution: code(
      'ts',
      "const config = { method: 'GET' } as const;",
      '// type: { readonly method: "GET" }'
    ),
    explanation:
      "By default TypeScript **widens** literals in mutable positions. `const config = { method: 'GET' }` infers `string` for the property because you could reassign it later. `as const` freezes the inference: every property becomes `readonly` and keeps its literal type, and arrays become readonly tuples. It is the standard way to derive a union from a runtime array, via `typeof COLOURS[number]`, which keeps the values and the type in one place instead of two.",
  },

  {
    slug: 'ts-optional-vs-undefined',
    title: 'Optional property versus undefined',
    category: 'typescript',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'What is the practical difference between these two?',
      '',
      code('ts', 'interface A { name?: string }', 'interface B { name: string | undefined }')
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'omit',
            'leave out',
            'absent',
            'missing',
            'not provide',
            "don't provide",
            'optional',
          ],
          missingFeedback:
            'For one of them you can leave the key out entirely, which, and what about the other?',
        },
        {
          synonyms: ['must', 'required', 'explicit', 'has to', 'still'],
          missingFeedback: 'What does the second interface force the caller to do?',
        },
      ],
      hints: [
        'Think about `const b: B = {}`. Does it compile?',
        'In `A` the key may be absent; in `B` the key must be present, even if its value is undefined.',
        'That distinction is what makes `B` useful for "you must decide about this field".',
      ],
    },
    canonicalAnswer:
      'In A the property can be omitted entirely, so {} is valid. In B the key is required and must be present, though its value may be undefined, so you have to write { name: undefined } explicitly.',
    solution: code(
      'ts',
      'const a: A = {};                  // ok. Key may be absent',
      'const b: B = {};                  // error. Property "name" is missing',
      'const b2: B = { name: undefined }; // ok. Present but undefined'
    ),
    explanation:
      'The `?` makes the **key** optional; `| undefined` only widens the value type while keeping the key required. That difference matters when you want to force a decision. A config object where every flag must be spelled out, even as `undefined`. It also shows up in `Object.keys` results and in spread behaviour. Turning on `exactOptionalPropertyTypes` sharpens the distinction further: it stops you assigning an explicit `undefined` to a `?` property, so "absent" and "present but undefined" stay genuinely separate.',
  },

  {
    slug: 'ts-non-null-assertion',
    title: 'The non-null assertion operator',
    category: 'typescript',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'A teammate silences a strict-null error with a trailing `!`:',
      '',
      code('ts', "const el = document.getElementById('root')!;", 'el.append(child);'),
      '',
      'What does `!` actually do here, and what is the risk?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['compile', 'type', 'tells the compiler', 'assert', 'removes null', 'strips'],
          missingFeedback: 'Does `!` change anything at runtime, or only at the type level?',
        },
        {
          synonyms: [
            'runtime',
            'crash',
            'throw',
            'still null',
            'typeerror',
            'blow up',
            'error at run',
          ],
          missingFeedback: 'What happens if the value really is null despite the assertion?',
        },
      ],
      hints: [
        '`!` emits no JavaScript at all.',
        'It only tells the type checker "trust me, this is not null".',
        'If it *is* null you get a runtime TypeError, with the compiler having waved it through.',
      ],
    },
    canonicalAnswer:
      'The ! is a purely compile-time assertion that removes null and undefined from the type; it emits no runtime code and performs no check. If the value really is null the code throws a TypeError at runtime, exactly as it would have without types.',
    solution: code(
      'ts',
      '// Prefer an explicit check that also gives a useful message:',
      "const el = document.getElementById('root');",
      "if (!el) throw new Error('#root is missing from index.html');",
      'el.append(child);'
    ),
    explanation:
      'The non-null assertion is erased at compile time. It emits **no** JavaScript and performs no check, so it is a promise to the type checker rather than a guarantee. When the promise is wrong you get the same `TypeError` you would have had in plain JS, only now the type system said it was fine. It is reasonable in narrow cases (immediately after a check the compiler cannot follow, or in tests), but an explicit `if (!x) throw` is usually better because it fails with a message that says what was actually missing.',
  },

  {
    slug: 'ts-generic-constraint',
    title: 'Constrain a generic',
    category: 'typescript',
    difficulty: 'medium',
    type: 'short-text',
    prompt: md(
      'This helper must accept an array of anything that has an `id`, and return a lookup keyed by it:',
      '',
      code(
        'ts',
        'function byId<T ???>(items: T[]): Map<string, T> {',
        '  return new Map(items.map((i) => [i.id, i]));',
        '}'
      ),
      '',
      'Fill in the constraint on `T`.'
    ),
    graderConfig: {
      accept: ['extends { id: string }', 'extends {id: string}', 'extends {id:string}'],
      acceptPatterns: ['extends\\s*\\{\\s*id\\s*:\\s*string\\s*;?\\s*\\}'],
      closeSubstrings: {
        extends: 'Right keyword. What shape does it need to extend?',
      },
      hints: [
        'A bare `T` knows nothing, so `i.id` is an error.',
        'Use `extends` to require a shape.',
        '`function byId<T extends { id: string }>(…)`',
      ],
    },
    canonicalAnswer: 'extends { id: string }',
    solution: code(
      'ts',
      'function byId<T extends { id: string }>(items: T[]): Map<string, T> {',
      '  return new Map(items.map((i) => [i.id, i]));',
      '}'
    ),
    explanation:
      "A generic parameter is opaque until you constrain it, so `i.id` is an error on a bare `T`. `extends` states the minimum shape while **preserving the caller's exact type**. Pass `User[]` and you get `Map<string, User>`, not `Map<string, {id: string}>`. That is the whole point of a generic here; typing the parameter as `{ id: string }[]` directly would work but would throw away every other field on the way out.",
  },

  {
    slug: 'ts-return-type',
    title: 'Derive a type from a value',
    category: 'typescript',
    difficulty: 'medium',
    type: 'short-text',
    prompt: md(
      'You want the type of whatever `buildConfig()` returns, without writing it out by hand:',
      '',
      code(
        'ts',
        'function buildConfig() { return { retries: 3, verbose: false }; }',
        '',
        'type Config = ???;'
      )
    ),
    graderConfig: {
      accept: ['returntype<typeof buildconfig>'],
      acceptPatterns: ['ReturnType\\s*<\\s*typeof\\s+buildConfig\\s*>'],
      nearMisses: {
        'typeof buildconfig': 'That is the type of the *function*, not of what it returns.',
        'returntype<buildconfig>':
          'Almost. `buildConfig` is a value, so you need `typeof` to get to its type.',
      },
      hints: [
        "There is a utility type that extracts a function's return type.",
        'You need `typeof` to go from the value `buildConfig` to its type.',
        '`ReturnType<typeof buildConfig>`',
      ],
    },
    canonicalAnswer: 'ReturnType<typeof buildConfig>',
    solution: code('ts', 'type Config = ReturnType<typeof buildConfig>;'),
    explanation:
      '`typeof` in *type position* lifts a value into its type, and `ReturnType<F>` then extracts what the function returns, so the type follows the implementation automatically instead of drifting from it. The same family covers `Parameters<F>`, `Awaited<T>` for unwrapping promises, and `T[number]` for the element type of an array. Deriving types from values like this is the single best habit for keeping types honest as code changes.',
  },

  {
    slug: 'ts-satisfies',
    title: 'satisfies versus a type annotation',
    category: 'typescript',
    difficulty: 'hard',
    type: 'explain',
    prompt: md(
      'Compare these two:',
      '',
      code(
        'ts',
        'const routesA: Record<string, string> = { home: "/", about: "/about" };',
        'const routesB = { home: "/", about: "/about" } satisfies Record<string, string>;'
      ),
      '',
      'Why might you prefer `satisfies`?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['narrow', 'literal', 'specific', 'keeps', 'preserv', 'exact', 'infer'],
          missingFeedback: 'What happens to the *inferred* type of the value in each case?',
        },
        {
          synonyms: ['check', 'validat', 'conform', 'still', 'error if'],
          missingFeedback: 'Does `satisfies` still verify the value against the type?',
        },
      ],
      hints: [
        'An annotation forces the value *down* to the declared type.',
        'With `routesA`, `routesA.home` is just `string` and `routesA.nope` is allowed.',
        '`satisfies` checks conformance but keeps the narrow inferred type, so keys and literal values survive.',
      ],
    },
    canonicalAnswer:
      'The annotation widens the value to Record<string, string>, so the specific keys and literal values are lost and any key looks valid. satisfies still checks that the value conforms, but leaves the narrow inferred type in place, so you keep the exact keys and literal types while getting the validation.',
    solution: code(
      'ts',
      'routesA.home;  // string  , and routesA.typo is allowed',
      'routesB.home;  // "/"     , and routesB.typo is a compile error',
      '',
      'type RouteName = keyof typeof routesB; // "home" | "about"'
    ),
    explanation:
      'A type annotation is a *ceiling*: the value is checked against it and then treated as that type, so the literal keys and values are discarded. `satisfies` (TS 4.9+) performs the same check but leaves the **inferred** type alone, giving you validation without widening. The payoff is real: `keyof typeof routesB` yields `"home" | "about"`, so you get autocomplete and typo errors on lookups, while `routesA` gives you `string` and silently accepts anything.',
  },

  {
    slug: 'ts-type-guard',
    title: 'Write a user-defined type guard',
    category: 'typescript',
    difficulty: 'hard',
    type: 'short-text',
    prompt: md(
      'This helper checks the shape but the compiler still sees `unknown` at the call site:',
      '',
      code(
        'ts',
        'function isUser(value: unknown) {',
        "  return typeof value === 'object' && value !== null && 'id' in value;",
        '}'
      ),
      '',
      'What do you change the **return type** to so callers get narrowing?'
    ),
    graderConfig: {
      accept: ['value is user', ': value is user'],
      acceptPatterns: ['value\\s+is\\s+User'],
      nearMisses: {
        boolean:
          'A plain boolean is what it already returns. That is why narrowing does not happen.',
        'value: user': 'Close. The syntax is `parameterName is Type`.',
      },
      hints: [
        'A boolean return tells the compiler nothing about *what* was checked.',
        'TypeScript has a special return-type syntax for predicates.',
        '`function isUser(value: unknown): value is User`',
      ],
    },
    canonicalAnswer: 'value is User',
    solution: code(
      'ts',
      'function isUser(value: unknown): value is User {',
      "  return typeof value === 'object' && value !== null && 'id' in value;",
      '}',
      '',
      'if (isUser(data)) {',
      '  data.id; // narrowed to User here',
      '}'
    ),
    explanation:
      'A **type predicate** return type, `param is Type`, tells the compiler that a `true` result means the argument has that type, so narrowing flows to the call site. A plain `boolean` carries no such information. The catch is that TypeScript takes your word for it: the predicate is only as sound as the checks inside, and a sloppy guard is as dangerous as a cast. For untrusted input, a schema validator that returns a parsed value is safer than a hand-written guard. The related `asserts value is Type` form narrows for the rest of the scope instead of inside an `if`.',
  },
];
