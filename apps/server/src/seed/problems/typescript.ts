import { code, md, type ProblemDraft } from './types';

export const typescriptProblems: ProblemDraft[] = [
  {
    slug: 'ts-partial',
    title: 'Make every field optional',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'occasional',
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
    relevance: 'daily',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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
    relevance: 'daily',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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
    relevance: 'daily',
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

  {
    slug: 'ts-json-parse-any',
    title: 'The any that walks in through the door',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This compiles with no error, and blows up at runtime:',
      '',
      code(
        'ts',
        'const user: User = JSON.parse(body);',
        'console.log(user.profile.name.toUpperCase());'
      ),
      '',
      'Explain why the type annotation proves nothing, and what to do at this boundary.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['any', 'returns any'],
          missingFeedback: 'What does JSON.parse return?',
        },
        {
          synonyms: [
            'no check',
            'not checked',
            'compile',
            'runtime',
            'assert',
            'assumption',
            'lie',
            'erased',
            'no validation',
          ],
          missingFeedback: 'Why does the annotation not protect you?',
        },
        {
          synonyms: [
            'validate',
            'parse',
            'schema',
            'zod',
            'valibot',
            'type guard',
            'narrow',
            'check the shape',
            'unknown',
          ],
          missingFeedback: 'What should happen at the boundary instead?',
        },
      ],
      hints: [
        'Types are erased at build time; nothing checks the shape at runtime.',
        '`JSON.parse` is typed as returning `any`, which assigns to anything silently.',
        'Validate the value at the boundary and let the type come from the validation.',
      ],
    },
    canonicalAnswer:
      'JSON.parse returns any, which assigns to any annotation without complaint, and types are erased at build time so nothing checks the real shape at runtime. The annotation is an assumption, not a check. Validate the value at the boundary with a schema or a type guard, and derive the type from the validation so the type and the runtime check cannot drift apart.',
    solution: code(
      'ts',
      'const parsed = UserSchema.safeParse(JSON.parse(body));',
      'if (!parsed.success) throw new BadRequest(parsed.error);',
      'const user = parsed.data; // typed *because* it was checked',
      '',
      '// or, without a library, narrow from unknown',
      'function isUser(value: unknown): value is User { … }'
    ),
    explanation:
      'Every value entering your program from outside is `unknown` in reality, whatever the annotation claims: request bodies, `localStorage`, query strings, third-party responses. An annotation is a promise you are making to the compiler, and at a boundary it is a promise you cannot keep. Validating once at the edge means everything downstream is genuinely typed. The pattern is sometimes called "parse, don’t validate": produce a value whose type reflects the checking that has already happened, rather than checking and hoping.',
  },

  {
    slug: 'ts-union-vs-enum',
    title: 'Enum or union of literals',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A team is choosing between these two:',
      '',
      code(
        'ts',
        "enum Status { Active = 'active', Archived = 'archived' }",
        '',
        "type Status = 'active' | 'archived';"
      ),
      '',
      'Give two reasons the union is usually preferred.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'no runtime',
            'erased',
            'zero',
            'no javascript',
            'no code',
            'emit',
            'bundle',
            'type only',
          ],
          missingFeedback: 'What does the union cost at runtime?',
        },
        {
          synonyms: [
            'plain string',
            'assign',
            'literal',
            'no import',
            'directly',
            'json',
            'api',
            'structural',
            'interop',
          ],
          missingFeedback: 'How does each behave when a plain string arrives from an API?',
        },
      ],
      hints: [
        'One of them emits JavaScript, the other disappears entirely.',
        'One of them refuses a plain string that happens to have the right value.',
        'Think about what arrives from `JSON.parse`.',
      ],
    },
    canonicalAnswer:
      'The union is erased completely, so it adds no runtime code to the bundle, while an enum emits a real object. And a union accepts any plain string with the right value, so data coming from an API or JSON assigns directly, whereas an enum member has to be imported and used explicitly even though the underlying value is identical.',
    solution: code(
      'ts',
      "export const STATUSES = ['active', 'archived'] as const;",
      'export type Status = (typeof STATUSES)[number];',
      '',
      '// one source of truth: iterate STATUSES, type with Status'
    ),
    explanation:
      'A `const` tuple plus an indexed access type gives you both halves from one declaration: a real array you can iterate, validate against or render as options, and a union type that stays in sync automatically. That pattern is exactly what this codebase uses for categories and difficulties. Numeric enums are worse still, since they allow any number in some positions and reverse-map at runtime. `const enum` avoids the emit but breaks under isolated module transpilation, which most modern build setups use.',
  },

  {
    slug: 'ts-generic-component-props',
    title: 'A component that keeps its item type',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The callback loses the element type, so `item` is `any`:',
      '',
      code(
        'ts',
        'type Props = {',
        '  items: unknown[];',
        '  renderItem: (item: unknown) => React.ReactNode;',
        '};'
      ),
      '',
      'Name the TypeScript feature that lets `renderItem` receive the caller’s element type.'
    ),
    graderConfig: {
      accept: ['generics', 'generic', 'a generic', 'type parameter', 'type parameters'],
      acceptPatterns: ['generic', 'type param'],
      nearMisses: {
        any: 'any removes the error by removing the checking, which is the opposite of the goal.',
        unknown: 'unknown is what it already is, and it is why the callback has no type.',
      },
      hints: [
        'The type of `item` should be decided by whoever uses the component.',
        'It is the same feature that makes `Array<T>` work.',
        'A generic type parameter on the props.',
      ],
    },
    canonicalAnswer: 'generics',
    solution: code(
      'ts',
      'type Props<T> = {',
      '  items: T[];',
      '  renderItem: (item: T) => React.ReactNode;',
      '};',
      '',
      'function List<T>({ items, renderItem }: Props<T>) {',
      '  return <ul>{items.map(renderItem)}</ul>;',
      '}',
      '',
      '// <List items={users} renderItem={(u) => u.name} />  u is User'
    ),
    explanation:
      'The generic parameter is inferred from the `items` prop at each call site, so `renderItem` receives the real element type with no annotation from the caller. This is the single most useful generic pattern in application code: any component that takes a collection and a render callback wants it. Add constraints when you need a property, as in `<T extends { id: string }>`, which lets the component key the list itself. Arrow function components need `<T,>` with the trailing comma in `.tsx` files, since `<T>` alone parses as JSX.',
  },

  {
    slug: 'ts-readonly-array',
    title: 'Stopping a function mutating your array',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'This compiles, and the caller’s array is sorted in place as a side effect:',
      '',
      code(
        'ts',
        'function top(items: number[]) {',
        '  return items.sort((a, b) => b - a)[0];',
        '}'
      ),
      '',
      'Name the type that would have made the compiler reject the `sort` call.'
    ),
    graderConfig: {
      accept: [
        'readonly number[]',
        'readonlyarray',
        'readonlyarray<number>',
        'readonly array',
        'readonly',
      ],
      acceptPatterns: ['readonly\\s*(number)?\\s*\\[\\]', 'ReadonlyArray'],
      nearMisses: {
        const: 'const stops reassignment of the binding, not mutation of the array.',
      },
      hints: [
        '`sort` mutates, and the parameter type currently permits that.',
        'There is a modifier that removes the mutating methods from the type.',
        '`readonly number[]`, also written `ReadonlyArray<number>`.',
      ],
    },
    canonicalAnswer: 'readonly number[]',
    solution: code(
      'ts',
      'function top(items: readonly number[]) {',
      '  return [...items].sort((a, b) => b - a)[0];',
      '  // or, without the copy: items.toSorted((a, b) => b - a)[0]',
      '}'
    ),
    explanation:
      '`readonly T[]` removes `push`, `sort`, `splice` and the rest from the type, so an accidental in-place mutation of a caller’s data becomes a compile error rather than a bug hunted down weeks later. It costs nothing at runtime and documents intent at the same time: this function only reads. Taking `readonly` parameters is a good default for anything that does not deliberately mutate. The new non-mutating methods `toSorted`, `toReversed` and `toSpliced` exist precisely so this no longer requires a defensive copy.',
  },

  {
    slug: 'ts-narrow-in-operator',
    title: 'Narrowing a union without a tag',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Neither member has a discriminant field:',
      '',
      code(
        'ts',
        'type Result = { data: string } | { error: string };',
        '',
        'function show(result: Result) {',
        '  // narrow to the error case here',
        '}'
      ),
      '',
      'Name the operator that narrows this union by checking for a property.'
    ),
    graderConfig: {
      accept: ['in', 'in operator', 'the in operator'],
      acceptPatterns: ['\\bin\\b\\s*operator', "^'?in'?$"],
      nearMisses: {
        typeof: 'typeof narrows primitives. Both members here are objects.',
        instanceof: 'instanceof needs a class. These are plain object types.',
      },
      hints: [
        'You cannot use `typeof`, because both sides are objects.',
        'You want to ask whether a property exists.',
        '`if ("error" in result)`',
      ],
    },
    canonicalAnswer: 'in',
    solution: code(
      'ts',
      'function show(result: Result) {',
      "  if ('error' in result) return renderError(result.error);",
      '  return renderData(result.data);',
      '}'
    ),
    explanation:
      'The `in` operator is a narrowing check the compiler understands, so inside the branch the union collapses to the member that has the property. It is the right tool for unions you do not control, such as a third-party response shape. When you *do* control the shape, add a literal discriminant (`{ ok: true, data } | { ok: false, error }`) and switch on it: it reads better, it survives adding a third member, and `switch` on a discriminant gives you exhaustiveness checking with `never`.',
  },

  {
    slug: 'ts-satisfies-keeps-literals',
    title: 'Keeping literal types while checking a shape',
    category: 'typescript',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'With the annotation, `config.env` is `string` and the key autocompletion is gone:',
      '',
      code(
        'ts',
        'const config: Record<string, string> = {',
        "  env: 'production',",
        "  region: 'eu-west-1',",
        '};'
      ),
      '',
      'Name the operator that validates the shape without widening, and explain the difference.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['satisfies'],
          missingFeedback: 'Name the operator.',
        },
        {
          synonyms: ['widen', 'widened', 'broaden', 'loses', 'lost', 'string instead', 'general'],
          missingFeedback: 'What does the annotation do to the inferred type?',
        },
        {
          synonyms: [
            'narrow',
            'literal',
            'specific',
            'keeps',
            'preserve',
            'inferred',
            'actual type',
            'exact',
          ],
          missingFeedback: 'What does satisfies keep that the annotation does not?',
        },
      ],
      hints: [
        'An annotation tells the compiler what the value *is*, discarding what it inferred.',
        'You want the check without giving up the inference.',
        '`satisfies Record<string, string>` after the literal.',
      ],
    },
    canonicalAnswer:
      'Use satisfies. An annotation replaces the inferred type with the declared one, so the values widen to string and the specific keys are lost. satisfies checks the literal against the type but keeps the narrow inferred type, so config.env stays the literal "production" and the keys stay known for autocompletion and exhaustiveness.',
    solution: code(
      'ts',
      'const config = {',
      "  env: 'production',",
      "  region: 'eu-west-1',",
      '} satisfies Record<string, string>;',
      '',
      "// config.env is 'production', not string",
      '// a typo in a value type is still a compile error'
    ),
    explanation:
      'The two do different jobs that look similar: an annotation is a downcast to the declared type, `satisfies` is an assertion that the inferred type is assignable to it. You get the error checking of the annotation with the precision of inference. It is most valuable for configuration objects, route tables and theme maps, where you want both "every value must be a valid colour" and "the caller should still know which keys exist". Reach for `as const satisfies …` when you also want deep readonly literals.',
  },

  {
    slug: 'ts-noimplicit-index-access',
    title: 'The array access that lied',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'This compiles cleanly and throws at runtime when the array is empty:',
      '',
      code('ts', 'const first: string = items[0];', 'first.toUpperCase();'),
      '',
      'Name the compiler flag that makes the index access return `string | undefined`.'
    ),
    graderConfig: {
      accept: [
        'nouncheckedindexedaccess',
        'nouncheckedindexaccess',
        '--nouncheckedindexedaccess',
        'nouncheckedindexedaccess: true',
      ],
      acceptPatterns: ['noUnchecked\\s*Index(ed)?\\s*Access'],
      nearMisses: {
        strictnullchecks:
          'strictNullChecks is necessary but does not cover index access on its own.',
        strict: 'strict does not include this one; it has to be enabled separately.',
      },
      hints: [
        'By default TypeScript assumes every index is in bounds.',
        'The flag is not part of `strict`, so it has to be turned on deliberately.',
        '`noUncheckedIndexedAccess`',
      ],
    },
    canonicalAnswer: 'noUncheckedIndexedAccess',
    solution: code(
      'ts',
      '// tsconfig.json',
      '{ "compilerOptions": { "noUncheckedIndexedAccess": true } }',
      '',
      'const first = items[0]; // string | undefined',
      'if (first) first.toUpperCase();',
      '// or: items.at(0)?.toUpperCase()'
    ),
    explanation:
      'Without the flag, `items[0]` is typed `string` even for an empty array, which is a documented unsoundness accepted for ergonomics. Turning it on catches a real and common class of crash, at the cost of more `?.` and early returns in loops and lookups. It is not included in `strict`, so most codebases never see it. Records get the same treatment: `record[key]` becomes possibly undefined, which is usually exactly what you want for a lookup by user-supplied key.',
  },

  {
    slug: 'ts-exhaustive-never',
    title: 'Catching the case you forgot',
    category: 'typescript',
    difficulty: 'hard',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A new member is added to a union and this switch silently falls through for it.',
      '',
      code(
        'ts',
        'switch (shape.kind) {',
        "  case 'circle': return …;",
        "  case 'square': return …;",
        '  default: /* ? */',
        '}'
      ),
      '',
      'Name the type to assign the value to in the default branch so the compiler flags the missing case.'
    ),
    graderConfig: {
      accept: ['never'],
      acceptPatterns: ['\\bnever\\b'],
      nearMisses: {
        unknown: 'unknown accepts anything, so nothing would be flagged.',
        void: 'void is about the absence of a return value, not an impossible value.',
      },
      hints: [
        'In the default branch every handled case has been eliminated.',
        'If all cases are handled, the remaining type is the empty one.',
        '`const exhaustive: never = shape;`',
      ],
    },
    canonicalAnswer: 'never',
    solution: code(
      'ts',
      'default: {',
      '  const exhaustive: never = shape;',
      '  throw new Error(`Unhandled shape: ${JSON.stringify(exhaustive)}`);',
      '}'
    ),
    explanation:
      'Narrowing removes each handled member, so in the default branch the value should have no possible type left. Assigning it to `never` compiles only when that is true, which turns "someone added a variant" into a build failure at every switch that needs updating. It is the cheapest exhaustiveness check in the language and it scales: add a member to the union and the compiler walks you round the codebase. Keep the runtime `throw` as well, since types are erased and the value can still arrive from outside.',
  },

  {
    slug: 'ts-await-typing',
    title: 'The awaited value that is still a promise',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The type of `user` here is `Promise<User>`, not `User`, and the property access fails:',
      '',
      code('ts', 'const user = api.getUser(id);', 'console.log(user.name);'),
      '',
      'Name the keyword that is missing.'
    ),
    graderConfig: {
      accept: ['await'],
      acceptPatterns: ['\\bawait\\b'],
      nearMisses: {
        async: 'async marks the enclosing function. The missing keyword is at the call site.',
        then: '.then() works, but the question is about the keyword that unwraps it inline.',
      },
      hints: [
        'The call returns a promise, and nothing unwraps it.',
        'The enclosing function has to be async for this keyword to be allowed.',
        '`await`',
      ],
    },
    canonicalAnswer: 'await',
    solution: code('ts', 'const user = await api.getUser(id);', 'console.log(user.name);'),
    explanation:
      'A forgotten `await` is one of the few async bugs TypeScript can catch for you, since `Promise<User>` has no `name` property. It gets dangerous when the property does exist on both, or when the result is only passed along, in which case the promise flows silently through the code and surfaces as `[object Promise]` in the UI. The `@typescript-eslint/no-floating-promises` rule covers the other half: a promise nobody awaits or catches, whose rejection becomes an unhandled rejection rather than an error you can see.',
  },

  {
    slug: 'ts-partial-vs-optional-update',
    title: 'Typing a partial update',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A PATCH handler takes any subset of the editable fields, but never the id or timestamps:',
      '',
      code(
        'ts',
        'type User = { id: string; name: string; email: string; createdAt: string };',
        '',
        'function update(id: string, changes: /* ? */) {}'
      ),
      '',
      'Write the type for `changes` using two built-in utility types.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'Partial<\\s*Omit<\\s*User\\s*,',
        'Omit<\\s*Partial<\\s*User\\s*>\\s*,',
        'Partial<\\s*Pick<\\s*User\\s*,',
      ],
      closeSubstrings: {
        'partial<user>': 'That allows changing the id and createdAt. Exclude them first.',
        'omit<user': 'Right start. Now make the remaining fields optional.',
      },
      hints: [
        'One utility removes the fields that must not change.',
        'The other makes what is left optional.',
        '`Partial<Omit<User, "id" | "createdAt">>`',
      ],
    },
    canonicalAnswer: "Partial<Omit<User, 'id' | 'createdAt'>>",
    solution: code(
      'ts',
      "function update(id: string, changes: Partial<Omit<User, 'id' | 'createdAt'>>) {}",
      '',
      '// or name the editable surface once and reuse it',
      "type EditableUser = Omit<User, 'id' | 'createdAt'>;"
    ),
    explanation:
      'Composing utility types keeps one source of truth: add a field to `User` and the update type follows, which a hand-written duplicate would not. `Omit` is subtraction and `Pick` is selection, and `Pick` is worth preferring when the editable set is small, because it fails loudly if a field is renamed while `Omit` silently keeps allowing it. Naming the composed type is usually better than inlining it, since the same shape is wanted by the form, the API client and the validator.',
  },

  {
    slug: 'ts-keyof',
    title: 'The key list that went stale',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The setting names are maintained by hand, and they stopped matching the interface the moment someone added a field:',
      '',
      code(
        'ts',
        'interface Settings { theme: string; fontSize: number; autosave: boolean }',
        '',
        "type SettingName = 'theme' | 'fontSize';"
      ),
      '',
      'Write the type that derives the names from `Settings` instead.'
    ),
    graderConfig: {
      accept: ['keyof settings', 'keyof'],
      acceptPatterns: ['keyof\\s+Settings'],
      nearMisses: {
        'typeof settings':
          'typeof goes from a value to a type. `Settings` is already a type, and you want its key names.',
        'object.keys(settings)': 'That is a runtime array of strings. This has to be a type.',
        string: 'string allows any key, including typos. You want exactly the three that exist.',
      },
      hints: [
        'The names already exist in the interface. The type should follow it rather than repeat it.',
        'One operator turns an object type into the union of its property names.',
        '`keyof Settings`',
      ],
    },
    canonicalAnswer: 'keyof Settings',
    solution: code(
      'ts',
      'type SettingName = keyof Settings;',
      "// 'theme' | 'fontSize' | 'autosave'",
      '',
      'function reset(name: SettingName) {}',
      "reset('colour'); // error, and it stays right when Settings changes"
    ),
    explanation:
      '`keyof T` gives the union of the property names of `T` as literal types, so the list is generated instead of maintained. Two details that come up in practice. On a type with an index signature, `keyof { [k: string]: number }` is `string | number`, because numeric keys are stringified at runtime. And `keyof` over a union yields only the keys the members share, since those are the only ones you can safely read. Its partner is the indexed access: `Settings[keyof Settings]` gives you the union of value types.',
  },

  {
    slug: 'ts-indexed-access',
    title: 'A getter that keeps the property type',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The constraint on `K` is right, but the result comes back as `unknown` so every call site has to annotate it:',
      '',
      code(
        'ts',
        'function get<T, K extends keyof T>(obj: T, key: K): unknown {',
        '  return obj[key];',
        '}',
        '',
        "const size = get(settings, 'fontSize'); // unknown, want number"
      ),
      '',
      'Write the return type meaning "the type of the property that `K` names".'
    ),
    graderConfig: {
      accept: ['t[k]'],
      acceptPatterns: ['\\bT\\s*\\[\\s*K\\s*\\]'],
      nearMisses: {
        any: 'any removes the error by removing the checking. The signature already knows which key was asked for.',
        'keyof t': 'That is the union of key names. You want the type of the value stored at one.',
        t: 'T is the whole object. You want one property out of it.',
      },
      hints: [
        'The compiler already knows `K` is one of the keys of `T`. Use that.',
        'You index a type with square brackets, the same way you index a value.',
        '`T[K]`',
      ],
    },
    canonicalAnswer: 'T[K]',
    solution: code(
      'ts',
      'function get<T, K extends keyof T>(obj: T, key: K): T[K] {',
      '  return obj[key];',
      '}',
      '',
      "const size = get(settings, 'fontSize'); // number",
      "const theme = get(settings, 'theme');   // string",
      "get(settings, 'colour');                // error: not a key of Settings"
    ),
    explanation:
      'An indexed access type reads a property type out of an object type, and it is resolved per call: ask for `fontSize` and you get `number`, ask for `theme` and you get `string`. Hand it a union of keys and you get a union of value types, so `Settings["theme" | "fontSize"]` is `string | number`. The array case is the one you will meet most often: `T[number]` is the element type, which is what makes `(typeof STATUSES)[number]` turn a const tuple into a union.',
  },

  {
    slug: 'ts-awaited',
    title: 'The derived type that is still a promise',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Deriving the type from the loader gives you the promise, not the user:',
      '',
      code(
        'ts',
        'async function loadUser() {',
        '  return db.users.findOne(id);',
        '}',
        '',
        'type LoadedUser = ReturnType<typeof loadUser>; // Promise<User>'
      ),
      '',
      'Write the type of the resolved value.'
    ),
    graderConfig: {
      accept: ['awaited', 'awaited<returntype<typeof loaduser>>'],
      acceptPatterns: ['Awaited\\s*<'],
      nearMisses: {
        await:
          '`await` is the runtime keyword and cannot appear in a type. The utility type is one letter away.',
        'returntype<typeof loaduser>':
          'That is what it already is. The function is async, so its return type is the promise.',
        'typeof loaduser':
          'That is the type of the function itself. You still have to go through its return type.',
      },
      hints: [
        'An async function returns a promise, so the derived type is a promise too.',
        'There is a utility type for the value a promise resolves to, and it composes with `ReturnType`.',
        '`Awaited<ReturnType<typeof loadUser>>`',
      ],
    },
    canonicalAnswer: 'Awaited<ReturnType<typeof loadUser>>',
    solution: code(
      'ts',
      'type LoadedUser = Awaited<ReturnType<typeof loadUser>>; // User',
      '',
      'const user: LoadedUser = await loadUser();'
    ),
    explanation:
      '`Awaited<T>` models what `await` really does, which is more than peeling off one `Promise`. It recurses, so `Awaited<Promise<Promise<string>>>` is `string`. It leaves a non-promise alone, so `Awaited<number>` is `number`, and it distributes across a union. A hand-rolled `T extends Promise<infer U> ? U : T` handles the easy case and misses the nested one. The idiom worth keeping is `Awaited<ReturnType<typeof fn>>`, which ties a client type to the function that produces it.',
  },

  {
    slug: 'ts-catch-unknown',
    title: 'The error you are not allowed to read',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Under `strict`, this does not compile:',
      '',
      code(
        'ts',
        'try {',
        '  await save();',
        '} catch (error) {',
        '  logger.error(error.message);',
        "  // TS18046: 'error' is of type 'unknown'",
        '}'
      ),
      '',
      'Anything can be thrown, so the compiler will not assume there is a `message`. Name the check that lets you read it.'
    ),
    graderConfig: {
      accept: ['instanceof error', 'error instanceof error', 'instanceof'],
      acceptPatterns: ['instanceof\\s+Error'],
      nearMisses: {
        'error as error':
          'A cast asserts without checking. Throw a string and you read `.message` off a string.',
        'typeof error':
          'typeof reports "object" for every thrown object. It cannot tell an Error from a plain one.',
        "'message' in error":
          'Close, but `in` needs an object on its right. Applied to a bare `unknown` that line is itself an error.',
      },
      hints: [
        'The compiler is right to refuse: a `throw` can carry a string, a number, or anything else.',
        'You need a runtime check that proves the value is an `Error` before touching its properties.',
        '`if (error instanceof Error) logger.error(error.message);`',
      ],
    },
    canonicalAnswer: 'error instanceof Error',
    solution: code(
      'ts',
      '} catch (error) {',
      '  logger.error(error instanceof Error ? error.message : String(error));',
      '}'
    ),
    explanation:
      '`useUnknownInCatchVariables` turns the old `any` into `unknown`, and unlike `noUncheckedIndexedAccess` it is part of `strict`, so you already have it. It is being honest: `throw` accepts any value, a rejected promise carries whatever was passed to `reject`, and plenty of libraries reject with a plain object. `instanceof Error` is the usual narrowing, with one caveat. It compares against the `Error` constructor of the current realm, so an error crossing an iframe, a worker or a `node:vm` context fails the check while still being an error. Code that has to survive that checks for a `message` property instead.',
  },

  {
    slug: 'ts-as-vs-annotation',
    title: 'The cast that was never checked',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'One of these lines is checked. The other is believed:',
      '',
      code(
        'ts',
        'interface User { id: string; name: string; email: string }',
        '',
        "const a = { id: '1' } as User; // compiles",
        "const b: User = { id: '1' };   // TS2739: missing name, email",
        '',
        'a.name.toUpperCase();          // TypeError at runtime'
      ),
      '',
      'Explain what `as` did here, and why an annotation is the better default.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'assert',
            'cast',
            'overrid',
            'no check',
            'not checked',
            'nothing is checked',
            'no checking',
            'without checking',
            'unchecked',
            'tells the compiler',
            'trust',
            'silenc',
            'suppress',
          ],
          missingFeedback: 'What does `as` do to the check on that object?',
        },
        {
          synonyms: [
            'annotation',
            'annotated',
            'compile error',
            'caught',
            'catches',
            'flag',
            'missing',
            'rejected',
            'verif',
          ],
          missingFeedback: 'What does the annotated line do that the cast does not?',
        },
        {
          synonyms: ['runtime', 'crash', 'undefined', 'typeerror', 'blow up', 'not really a user'],
          missingFeedback: 'What is the cost when the claim turns out to be false?',
        },
      ],
      hints: [
        'One line asks the compiler to check a value. The other tells it what to believe.',
        'The cast is allowed because `User` is assignable to `{ id: string }`, so the two overlap enough for an assertion. Nothing verifies the two missing fields.',
        '`as` silences the check and emits nothing; the annotation performs it, which is why only `b` reports the missing properties, and why only `a` reaches a runtime TypeError.',
      ],
    },
    canonicalAnswer:
      'as is an assertion, not a conversion: it overrides the inferred type and the compiler stops checking, so an object with no name and no email is accepted as a User. The annotation checks the literal against User instead, and the missing properties are a compile error. The cast only moves the failure to runtime, where name is undefined and toUpperCase throws a TypeError.',
    solution: code(
      'ts',
      '// Annotate, and let the compiler check the value:',
      "const b: User = { id: '1', name: 'Ada', email: 'ada@example.com' };",
      '',
      '// Where the value genuinely comes from outside, start at unknown and validate:',
      'const parsed: unknown = JSON.parse(body);',
      'if (!isUser(parsed)) throw new BadRequest();'
    ),
    explanation:
      'Three tools that look interchangeable and are not. An annotation checks the value against the type and then treats it as that type. `as` asserts a type the compiler cannot verify and performs no check at all: like `!`, it emits nothing and is a promise rather than a guarantee. `satisfies` checks without widening. `as` is not unlimited, and refuses when neither type is assignable to the other, which is why the `as unknown as X` double cast exists. What it always allows is a subset, because `User` is assignable to `{ id: string }`, and a missing field is exactly the shape of the casts that blow up. Keep `as` for the cases where you know something the compiler cannot, and write down what you know.',
  },

  {
    slug: 'ts-excess-property',
    title: 'Same object, two verdicts',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'The same object, the same parameter, and only one of these is an error:',
      '',
      code(
        'ts',
        'interface Options { retries: number }',
        'declare function createClient(options: Options): void;',
        '',
        'createClient({ retries: 3, timeout: 1000 });',
        "// TS2353: 'timeout' does not exist in type 'Options'",
        '',
        'const opts = { retries: 3, timeout: 1000 };',
        'createClient(opts); // fine'
      ),
      '',
      'Explain why.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['literal', 'inline', 'fresh', 'written directly', 'straight into'],
          missingFeedback: 'What is different about the first argument compared with the variable?',
        },
        {
          synonyms: [
            'excess propert',
            'excess',
            'extra propert',
            'extra key',
            'extra field',
            'unknown propert',
          ],
          missingFeedback: 'Name the check that only fires on one of the two.',
        },
        {
          synonyms: [
            'structural',
            'assignab',
            'compatible',
            'has everything',
            'more than',
            'superset',
            'satisfies the shape',
          ],
          missingFeedback: 'Why is the variable version legal at all?',
        },
      ],
      hints: [
        'The type of `opts` is not `Options`. It is `{ retries: number; timeout: number }`, and that is assignable to `Options`.',
        'Structural typing allows extra properties, so the second call is following the normal rule. The first error comes from a rule that applies to something narrower.',
        'It is the excess property check, and it only fires on a fresh object literal, which is why naming the value gets it past.',
      ],
    },
    canonicalAnswer:
      'TypeScript runs an excess property check on an object literal written straight into a typed position, so timeout is reported as a key that does not exist in Options. Once the literal is stored in a variable it is no longer fresh, and only the ordinary structural rule applies: the object has everything Options requires, so the extra property is still assignable and the call is fine.',
    solution: code(
      'ts',
      '// The check follows the literal, so keep the literal at the typed position:',
      'createClient({ retries: 3 });',
      '',
      '// or put the check back on a named value, without widening it:',
      'const opts = { retries: 3, timeout: 1000 } satisfies Options; // now an error'
    ),
    explanation:
      'Structural typing says an object with extra properties is assignable, and that is the rule the language actually runs on. The excess property check is a deliberate exception layered over it: a literal written directly into a typed position is treated as fresh, and a key the target does not declare is almost always a typo or a dead config option. Freshness is lost the moment the value is named, spread, or returned through a wider type, which is why extracting a variable can quietly stop catching typos. `satisfies` puts the check back without widening the value.',
  },

  {
    slug: 'ts-template-literal-type',
    title: 'Build the names from the parts',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'The route keys are maintained by hand and drift from the two lists they come from:',
      '',
      code(
        'ts',
        "type Method = 'get' | 'post';",
        "type Resource = 'users' | 'orders';",
        '',
        "type Route = 'get:users' | 'get:orders' | 'post:users' | 'post:orders';"
      ),
      '',
      'Write the type that produces all four from `Method` and `Resource`.'
    ),
    graderConfig: {
      accept: ['`${Method}:${Resource}`'],
      acceptPatterns: ['\\$\\{\\s*Method\\s*\\}\\s*:\\s*\\$\\{\\s*Resource\\s*\\}'],
      nearMisses: {
        'method | resource': 'That is a union of the four individual values, not of the pairs.',
        'method + resource':
          'Types are not concatenated with `+`. The syntax mirrors a JavaScript template literal.',
        'record<method, resource>': 'Record builds an object type. You want a union of strings.',
      },
      hints: [
        'The four names are every `Method` paired with every `Resource`.',
        'A string type can be written with template literal syntax, and interpolating a union expands to every combination.',
        'Backticks in type position: `` `${Method}:${Resource}` ``.',
      ],
    },
    canonicalAnswer: '`${Method}:${Resource}`',
    solution: code(
      'ts',
      'type Route = `${Method}:${Resource}`;',
      "// 'get:users' | 'get:orders' | 'post:users' | 'post:orders'",
      '',
      '// add a method, and every route type follows'
    ),
    explanation:
      'Interpolating a union into a template literal type expands to the cross product, so the names are generated from the lists they depend on rather than restated. The same feature drives key remapping in mapped types, where `` `on${Capitalize<K & string>}` `` turns field names into handler names, and it ships with four intrinsics: `Uppercase`, `Lowercase`, `Capitalize` and `Uncapitalize`. Interpolate an unbounded `string` and you get a pattern instead of a list: `` type Hex = `#${string}` `` rejects the literal `"ff0000"` at compile time, though it can say nothing about a string computed at runtime.',
  },

  {
    slug: 'ts-overload-signature',
    title: 'The overload that will not take the union',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'The implementation handles both, and the call still fails:',
      '',
      code(
        'ts',
        'function load(source: string): Promise<string>;',
        'function load(source: URL): Promise<string>;',
        'function load(source: string | URL): Promise<string> {',
        "  return readFile(typeof source === 'string' ? source : source.pathname);",
        '}',
        '',
        'declare const input: string | URL;',
        'load(input); // TS2769: No overload matches this call'
      ),
      '',
      'Explain why, and what the third signature is actually for.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'implementation',
            'not callable',
            'not visible',
            'not part of',
            'hidden',
            'type-check the body',
            'typecheck the body',
          ],
          missingFeedback: 'Which signatures can a caller see?',
        },
        {
          synonyms: ['overload', 'declared signature', 'the list', 'one of the two'],
          missingFeedback: 'What does the compiler match the call against?',
        },
        {
          synonyms: [
            'union',
            'third',
            'add',
            'single signature',
            'one signature',
            'string | url',
            'widen',
          ],
          missingFeedback: 'What would let a `string | URL` value through?',
        },
      ],
      hints: [
        'At a call site the compiler only ever sees the two declared signatures.',
        'A `string | URL` value has to satisfy one signature on its own, and neither of the two accepts both.',
        'The implementation signature is not callable; it exists to type-check the body. Add an overload for the union, or drop the overloads and take `string | URL` in one signature.',
      ],
    },
    canonicalAnswer:
      'Only the two overload signatures are visible to callers. The implementation signature is not callable and exists to type-check the body. The compiler resolves each call against the overload list and needs one entry that accepts the argument on its own, and neither string nor URL accepts a value that could be either. Adding a third overload for string | URL, or dropping the overloads for a single signature taking the union, fixes it.',
    solution: code(
      'ts',
      '// Either declare the union as a third overload…',
      'function load(source: string): Promise<string>;',
      'function load(source: URL): Promise<string>;',
      'function load(source: string | URL): Promise<string>;',
      '',
      '// …or drop the overloads, because one signature already describes it',
      'function load(source: string | URL): Promise<string> { … }'
    ),
    explanation:
      'An overload set is two things at once: a public list of signatures, and one implementation signature that callers never see. Resolution walks the list top to bottom and takes the first signature that accepts the arguments, so order them most specific first, and the return type you get is whatever that signature declares. TypeScript checks the implementation against each overload, so they cannot contradict each other outright, but the check is loose about return types: an implementation returning `string | number` satisfies an overload promising `number`, and nothing notices when it returns the wrong one. A union parameter or a generic is usually the better tool. Overloads earn their place when the return type depends on which arguments were passed.',
  },

  {
    slug: 'ts-branded-type',
    title: 'Two ids that are the same type',
    category: 'typescript',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Both ids are strings, so nothing stops you passing the wrong one:',
      '',
      code(
        'ts',
        'type UserId = string;',
        'type OrderId = string;',
        '',
        'declare function cancel(id: OrderId): void;',
        '',
        "const userId: UserId = '42';",
        'cancel(userId); // compiles, and cancels an order that does not exist'
      ),
      '',
      'Name the technique that keeps the two apart at compile time while they stay plain strings at runtime.'
    ),
    graderConfig: {
      accept: [
        'branded type',
        'branded types',
        'brand',
        'branding',
        'nominal type',
        'nominal types',
        'nominal typing',
        'opaque type',
        'opaque types',
      ],
      acceptPatterns: ['brand', 'nominal', 'opaque'],
      nearMisses: {
        'type alias':
          'That is what they already are, and an alias is transparent: both are string.',
        'as const': 'That pins literal types. It does not keep two string types apart.',
        enum: 'A string enum does refuse a plain string, but it fixes the values in advance. Ids are not a known set.',
      },
      hints: [
        'The two types are identical, so the compiler is right to allow it. You have to make them structurally different.',
        'Add something to each type that exists only in the type system and never in the emitted JavaScript.',
        'A branded (nominal) type: `type UserId = string & { readonly __brand: "UserId" }`.',
      ],
    },
    canonicalAnswer: 'branded type',
    solution: code(
      'ts',
      'declare const brand: unique symbol;',
      'type Brand<T, B extends string> = T & { readonly [brand]: B };',
      '',
      "type UserId = Brand<string, 'UserId'>;",
      "type OrderId = Brand<string, 'OrderId'>;",
      '',
      'const toUserId = (raw: string): UserId => {',
      "  if (!/^\\d+$/.test(raw)) throw new Error('bad id');",
      '  return raw as UserId; // the one place a cast is allowed',
      '};',
      '',
      'cancel(toUserId(input)); // error: UserId is not assignable to OrderId'
    ),
    explanation:
      'TypeScript compares structure, not names, so `UserId` and `OrderId` are both just `string` and an alias is a nickname rather than a new type. A brand adds a phantom property that no real value carries, which makes the two mutually unassignable while the values stay strings at runtime, since the brand is erased with everything else. The cost is that a value needs a cast to enter the branded type, and that is the point: one function validates and casts, and everything downstream is trusted. Use a `unique symbol` for the key so nothing can produce the property by accident. The same trick types `Email`, `Cents` and `SafeHtml`.',
  },

  {
    slug: 'ts-mapped-key-remap',
    title: 'Generate the handler names',
    category: 'typescript',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'Every field needs a handler, and the names are being maintained one by one:',
      '',
      code(
        'ts',
        'type Fields = { id: string; name: string };',
        '',
        'type Handlers = {',
        '  onId: (value: string) => void;',
        '  onName: (value: string) => void;',
        '};'
      ),
      '',
      'Fill in the clause that renames each key as the mapped type produces it:',
      '',
      code('ts', 'type Handlers<T> = {', '  [K in keyof T ???]: (value: T[K]) => void;', '};')
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['as\\s*`?on\\$\\{\\s*Capitalize\\s*<'],
      closeSubstrings: {
        capitalize:
          'Right helper. It belongs in a clause on the key itself, straight after `in keyof T`.',
        '${': 'Template literal syntax is right. The key also has to be capitalised, so `id` becomes `onId`.',
      },
      hints: [
        'A mapped type can rewrite the key it produces, not only reuse it.',
        'The clause goes after `in keyof T`, and the new name is built with a template literal type.',
        'The clause is `as` plus a template literal: `` as `on${Capitalize<K & string>}` ``. The `K & string` is what keeps `Capitalize` happy.',
      ],
    },
    canonicalAnswer: 'as `on${Capitalize<K & string>}`',
    solution: code(
      'ts',
      'type Handlers<T> = {',
      '  [K in keyof T as `on${Capitalize<K & string>}`]: (value: T[K]) => void;',
      '};',
      '',
      '// Handlers<Fields> = {',
      '//   onId: (value: string) => void;',
      '//   onName: (value: string) => void;',
      '// }'
    ),
    explanation:
      'The `as` clause in a mapped type has nothing to do with a type assertion. It rewrites each key on the way out, and a template literal type builds the new name. `K & string` is needed because `keyof T` also covers `number | symbol` while `Capitalize` only accepts strings. The clause has a second use that is just as valuable: map a key to `never` and it drops out of the result, so `[K in keyof T as T[K] extends string ? K : never]` keeps only the string-valued properties. Between renaming and filtering, most bespoke utility types are one mapped type.',
  },

  {
    slug: 'ts-conditional-infer',
    title: 'Pull the element type out',
    category: 'typescript',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'Your API client types every list response as an array, and each screen needs the type of a single row without restating it:',
      '',
      code(
        'ts',
        'type ElementOf<T> = ???;',
        '',
        'type A = ElementOf<User[]>; // want User',
        'type B = ElementOf<string>; // want never'
      ),
      '',
      'Write the conditional type.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'extends\\s+(?:readonly\\s+)?\\(\\s*infer\\s+(\\w+)\\s*\\)\\s*\\[\\s*\\]\\s*\\?\\s*\\1\\b',
        'extends\\s+(?:Readonly)?Array\\s*<\\s*infer\\s+(\\w+)\\s*>\\s*\\?\\s*\\1\\b',
      ],
      closeSubstrings: {
        infer:
          'Right keyword. It goes inside the pattern on the right of `extends`, and the true branch returns what it captured.',
        extends:
          'A conditional type needs `extends`, a `?` branch and a `:` branch. What pattern matches an array of anything?',
      },
      hints: [
        'A type can branch: `T extends Something ? X : Y`.',
        'You need to capture the element type while the match happens, rather than name it in advance.',
        '`type ElementOf<T> = T extends (infer U)[] ? U : never;`',
      ],
    },
    canonicalAnswer: 'T extends (infer U)[] ? U : never',
    solution: code(
      'ts',
      'type ElementOf<T> = T extends (infer U)[] ? U : never;',
      '',
      'type A = ElementOf<User[]>; // User',
      'type B = ElementOf<string>; // never'
    ),
    explanation:
      '`infer` declares a type variable inside the pattern being matched and binds whatever lands in that position, and it exists only in the true branch. The built-ins are written this way: `ReturnType<T>` is `T extends (...args: any) => infer R ? R : any`, and `Awaited` is the same idea applied recursively. One behaviour to know before you rely on it. A conditional whose left side is a bare type parameter distributes over unions, so `ElementOf<string[] | number[]>` is `string | number` rather than one branch winning, and `ElementOf<never>` is `never` because distributing over an empty union produces nothing. Wrap both sides in a tuple, `[T] extends [X]`, when you want the union treated as one type.',
  },

  {
    slug: 'ts-assertion-function',
    title: 'Narrowing without an if',
    category: 'typescript',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Two ways from `unknown` to `User`:',
      '',
      code(
        'ts',
        'function isUser(value: unknown): value is User { … }',
        'function assertIsUser(value: unknown): asserts value is User { … }'
      ),
      '',
      'The second one is used like this, and `data.id` compiles:',
      '',
      code('ts', 'const data: unknown = JSON.parse(body);', 'assertIsUser(data);', 'data.id;'),
      '',
      'Explain how the assertion form differs from the predicate.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['throw', 'exception', 'raises', 'never returns normally'],
          missingFeedback: 'What does the assertion do when the value fails the check?',
        },
        {
          synonyms: [
            'rest of',
            'from then on',
            'after the call',
            'onward',
            'whole scope',
            'without an if',
            'no branch',
            'every line after',
          ],
          missingFeedback: 'Where does the narrowing apply in each case?',
        },
        {
          synonyms: ['boolean', 'true or false', 'returns nothing', 'returns void', 'no return'],
          missingFeedback: 'What does each of the two return?',
        },
      ],
      hints: [
        'One gives you a value to branch on. The other gives you a guarantee, provided the next line runs at all.',
        'The assertion never returns `false`. Reaching the line after the call already means the check passed.',
        'A predicate returns a boolean and narrows inside an `if`. An assertion returns nothing, throws on failure, and narrows everything after the call.',
      ],
    },
    canonicalAnswer:
      'The predicate returns a boolean, so it only narrows inside a branch you write around it: if (isUser(data)) { … }. The assertion function returns nothing and throws when the check fails, so the compiler treats reaching the next line as proof and the value stays narrowed for the rest of the scope, with no if at all.',
    solution: code(
      'ts',
      'function assertIsUser(value: unknown): asserts value is User {',
      "  if (typeof value !== 'object' || value === null || !('id' in value)) {",
      "    throw new Error('Not a user');",
      '  }',
      '}',
      '',
      'assertIsUser(data);',
      'data.id; // User for the rest of the scope'
    ),
    explanation:
      '`asserts value is User` describes an effect on control flow rather than a value: if the call returns at all, the narrowing holds from there on. Two things to remember before using it. TypeScript requires the call target to have an explicit type annotation, so `const assertIsUser = (v: unknown): asserts v is User => { … }` fails at every call site with TS2775 until you annotate the const, which is why these are usually written as function declarations. And, exactly like a predicate, the compiler takes the signature on trust: a body that checks the wrong thing narrows to a lie. The related `asserts value` form, with no `is T`, narrows the argument to truthy, which is how `node:assert` is typed.',
  },

  {
    slug: 'ts-falsy-vs-nullish',
    title: 'The count of zero that went missing',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      '`0` is a real count, and this reports it as no count at all:',
      '',
      code(
        'ts',
        'function label(count: number | undefined): string {',
        "  if (!count) return 'none';",
        '  return `${count} items`;',
        '}',
        '',
        "label(0); // 'none', and it should be '0 items'"
      ),
      '',
      'Rewrite the guard so only a missing count takes the first branch.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'count\\s*[!=]==?\\s*undefined',
        'count\\s*[!=]==?\\s*null',
        'typeof\\s+count\\s*[!=]==?\\s*\\W?undefined',
      ],
      closeSubstrings: {
        '!count':
          'That is the check you already have. `!` asks about truthiness, and `0` is falsy.',
        'count > 0':
          'That still sends `0` down the missing branch. The question is whether a count arrived at all.',
      },
      hints: [
        '`!count` asks whether the value is falsy, and MDN lists `0`, `-0`, `0n`, `""` and `NaN` alongside `null` and `undefined`.',
        'You want a check for presence, not for truthiness.',
        "`if (count === undefined) return 'none';`, or `count == null` when either nullish value can arrive.",
      ],
    },
    canonicalAnswer: "if (count === undefined) return 'none';",
    solution: code(
      'ts',
      'function label(count: number | undefined): string {',
      "  if (count === undefined) return 'none';",
      '  return `${count} items`;',
      '}',
      '',
      '// count == null when null can arrive as well as undefined'
    ),
    explanation:
      'Truthiness and presence are different questions, and the falsy list is longer than most people hold in their head. On a `number | undefined` this routes a real zero down the missing path, and on a `string | undefined` it does the same to an empty search box, which is how a price of 0 and a blank filter both turn into "nothing here". Write the check you mean: `count === undefined` for one nullish value, `count == null` for both, and that loose comparison is the one worth keeping, because it is true for `null` and `undefined` and nothing else. `count || 10` is the same bug in expression form and `count ?? 10` is its fix, for the same reason.',
  },

  {
    slug: 'ts-as-const-not-frozen',
    title: 'as const did not freeze anything',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'The config is `as const`, and a module that never met the types writes to it anyway:',
      '',
      code(
        'ts',
        'const config = { retries: 3 } as const;',
        '',
        "config.retries = 5;      // TS2540: Cannot assign to 'retries'",
        'Object.isFrozen(config); // false'
      ),
      '',
      'Name the call that makes the object read-only at runtime too.'
    ),
    graderConfig: {
      accept: ['object.freeze', 'object.freeze()', 'freeze', 'object.freeze(config)'],
      acceptPatterns: ['Object\\.freeze'],
      nearMisses: {
        'as const': 'That is what it already has, and it is erased before the first line runs.',
        readonly: '`readonly` is a compile-time promise, the same one `as const` already made.',
        const: '`const` stops the binding being reassigned. It says nothing about the object.',
      },
      hints: [
        'Types are erased, so anything at the type level is gone by the time the code runs.',
        'You need a runtime call from the standard library, not a type-level one.',
        '`Object.freeze(config)`, and note that MDN calls it shallow.',
      ],
    },
    canonicalAnswer: 'Object.freeze',
    solution: code(
      'ts',
      'const config = Object.freeze({ retries: 3 } as const);',
      '// as const keeps the literal type; Object.freeze makes the write throw',
      '',
      '// freeze is shallow, so a nested object needs its own call',
      'const nested = Object.freeze({ retry: Object.freeze({ times: 3 }) });'
    ),
    explanation:
      '`as const` and `readonly` are promises to the compiler, and the compiler is gone by the time the code runs, which is what `Object.isFrozen` is reporting. `Object.freeze` is the runtime half, and MDN notes it is shallow, the opposite of `as const` going all the way down. In strict mode, which is every ES module, writing to a frozen property throws a `TypeError` rather than failing quietly. Most application code never needs the runtime half, because everything touching the object was type-checked. Reach for it at a boundary: an object handed to a library, exported from a package, or shared with code the compiler never saw.',
  },

  {
    slug: 'ts-readonly-shallow',
    title: 'readonly, and the mutation it did not stop',
    category: 'typescript',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      "The parameter is `readonly` and the second line still edits the caller's data:",
      '',
      code(
        'ts',
        'type Row = { id: string; tags: string[] };',
        '',
        'function archive(rows: readonly Row[]) {',
        "  rows.push(newRow);                                 // Property 'push' does not exist",
        "  for (const row of rows) row.tags.push('archived'); // no error",
        '}'
      ),
      '',
      'In one word, what is `readonly` here?'
    ),
    graderConfig: {
      accept: ['shallow', 'shallow only', 'it is shallow', 'only shallow'],
      acceptPatterns: ['\\bshallow\\b'],
      nearMisses: {
        deep: 'It is the opposite. Only the array itself is protected.',
        immutable: 'The array is. The objects it holds are not.',
      },
      hints: [
        '`readonly Row[]` removes the array’s own mutating methods: `push`, `sort`, `splice`.',
        'It says nothing about the objects the array holds. `row.tags` is still a plain `string[]`.',
        'One word, and it is what `readonly`, `Readonly<T>` and `Object.freeze` all have in common.',
      ],
    },
    canonicalAnswer: 'shallow',
    solution: code(
      'ts',
      '// readonly has to be written at every level you want protected',
      'type Row = { readonly id: string; readonly tags: readonly string[] };',
      '',
      'function archive(rows: readonly Row[]) {',
      '  rows.push(newRow); // error',
      "  for (const row of rows) row.tags.push('archived'); // error too",
      '}'
    ),
    explanation:
      '`readonly T[]` removes `push`, `sort`, `splice` and the rest from the array type, and stops there. The elements keep whatever types they already had, so one `readonly` protects exactly one level. TypeScript ships no deep version, so you either repeat it at each level you care about or reach for a recursive mapped type, which is what type-fest publishes as `ReadonlyDeep`. The direction is worth knowing too: a `number[]` is assignable to a `readonly number[]` parameter and not the other way round, which makes `readonly` cheap to add to a function that only reads and awkward to add to what one returns.',
  },
];
