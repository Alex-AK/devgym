import { code, md, type ProblemDraft } from './types';

export const jsApiProblems: ProblemDraft[] = [
  {
    slug: 'js-find',
    title: 'First element matching a predicate',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt:
      'Which array method returns the **first element** that matches a predicate function (the element itself, not its position)?',
    graderConfig: {
      accept: ['find', 'array.prototype.find', '.find', 'find()', 'arr.find'],
      nearMisses: {
        filter: 'filter() returns *all* matches in a new array. We want a single element.',
        findindex: 'findIndex() returns the position, not the element.',
        indexof: 'indexOf() takes a value, not a predicate, and returns a position.',
      },
      hints: [
        'It takes a callback and stops at the first match.',
        'Four letters, introduced in ES6.',
      ],
    },
    canonicalAnswer: 'find',
    solution: code('js', 'const firstMatch = items.find((item) => item.id === wanted);'),
    explanation:
      '`Array.prototype.find(predicate)` walks the array and returns the **first element** for which the predicate is truthy, or `undefined` if none match, and it stops walking as soon as it finds one. Its neighbours differ in what they hand back: `findIndex()` gives the position, `filter()` gives an array of every match, and `some()` gives a boolean. Because a miss yields `undefined` rather than `null`, guard the result before dereferencing it.',
  },

  {
    slug: 'js-dedupe',
    title: 'Deduplicate an array',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Given:',
      '',
      code('js', "const tags = ['sale', 'new', 'sale', 'clearance', 'new'];"),
      '',
      'Write the shortest expression that produces a new array with the duplicates removed.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        '\\[\\s*\\.\\.\\.\\s*new\\s+Set\\(\\s*tags\\s*\\)\\s*\\]',
        'Array\\.from\\(\\s*new\\s+Set\\(\\s*tags\\s*\\)\\s*\\)',
      ],
      closeSubstrings: {
        'new set':
          'Right idea. A Set drops duplicates, but you need to turn it back into an array.',
        filter: 'filter + indexOf works but is O(n²); there is a one-liner built for this.',
      },
      hints: [
        'There is a built-in collection that cannot hold duplicate values.',
        'A `Set` dedupes, but you still have to convert it back to an array.',
        '`[...new Set(tags)]`. Or `Array.from(new Set(tags))`.',
      ],
    },
    canonicalAnswer: '[...new Set(tags)]',
    solution: code('js', "[...new Set(tags)]; // ['sale', 'new', 'clearance']"),
    explanation:
      '`Set` stores each value at most once, so wrapping an array in one and spreading it back out is the idiomatic dedupe, and it preserves first-seen order. It compares with SameValueZero, so it dedupes primitives but **not** objects: two structurally identical objects are different references and both survive. For those you need a key function, typically `new Map(items.map((i) => [i.id, i])).values()`.',
  },

  {
    slug: 'js-object-entries',
    title: 'Iterate an object safely',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'You need to loop over an object and use both the key and the value:',
      '',
      code('js', 'const counts = { sale: 3, new: 7 };', 'for (const [key, value] of ???) { … }'),
      '',
      'Which built-in call produces those `[key, value]` pairs?'
    ),
    graderConfig: {
      accept: ['object.entries(counts)', 'object.entries'],
      acceptPatterns: ['Object\\.entries\\(\\s*counts\\s*\\)'],
      nearMisses: {
        'object.keys(counts)':
          'Object.keys() gives you only the keys. You would have to look each value up.',
        'object.values(counts)': 'Object.values() gives you only the values, with no keys.',
        'for in':
          '`for…in` also walks inherited enumerable keys, which is why Object.entries is preferred.',
      },
      hints: [
        'Three sibling methods on `Object` return keys, values, or both.',
        '`Object.entries(obj)` returns an array of `[key, value]` pairs.',
      ],
    },
    canonicalAnswer: 'Object.entries(counts)',
    solution: code('js', 'for (const [key, value] of Object.entries(counts)) {', '  // …', '}'),
    explanation:
      "`Object.entries()` returns an array of `[key, value]` pairs for the object's **own enumerable string keys**, which destructures beautifully in a `for…of`. Prefer it over `for…in`, which also walks up the prototype chain and is the reason older code is littered with `hasOwnProperty` guards. Its inverse, `Object.fromEntries()`, rebuilds an object from pairs. Together they let you `map`/`filter` an object as if it were an array.",
  },

  {
    slug: 'js-optional-chaining',
    title: 'Safe deep property access',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Given:',
      '',
      code('js', "const user = { name: 'Dana', address: null };"),
      '',
      'What does `user.address?.city` evaluate to?'
    ),
    graderConfig: {
      accept: ['undefined'],
      nearMisses: {
        null: 'Optional chaining short-circuits to `undefined`, not `null`, even when the value was null.',
        error: "It doesn't throw. That's the whole point of `?.`",
        typeerror: "It doesn't throw. That's the whole point of `?.`",
      },
      hints: [
        '`?.` stops evaluating instead of throwing when the left side is nullish.',
        'It short-circuits to one specific value, and it is the same one whether the left side was null or undefined.',
      ],
    },
    canonicalAnswer: 'undefined',
    solution: code('js', 'user.address?.city; // undefined (no TypeError)'),
    explanation:
      'Optional chaining short-circuits when the value to its left is `null` **or** `undefined`, and the result is always `undefined`. It normalises both nullish cases into one. Without it, `user.address.city` throws `TypeError: Cannot read properties of null`. It works for calls and indexes too (`fn?.()`, `arr?.[0]`), which is handy for optional callbacks. Do not sprinkle it defensively everywhere though: it can hide a genuinely missing value that you would rather crash on in development.',
  },

  {
    slug: 'js-nullish-vs-or',
    title: '?? versus ||',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A colleague writes `const pageSize = input || 20;` and a user who asks for `0` items gets 20.',
      '',
      'Explain what went wrong and which operator fixes it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['falsy', 'falsey'],
          missingFeedback: 'Name the category of values that `||` rejects. 0 is one of them.',
        },
        {
          synonyms: ['??', 'nullish'],
          missingFeedback: 'Which operator only falls back for null/undefined?',
        },
        {
          synonyms: ['null', 'undefined'],
          missingFeedback: 'Say exactly which two values `??` treats as missing.',
        },
      ],
      hints: [
        '`||` does not ask "is this missing", it asks "is this falsy".',
        "`0`, `''`, `NaN` and `false` are all falsy but are perfectly valid inputs.",
        'The nullish coalescing operator `??` falls back only for `null` and `undefined`.',
      ],
    },
    canonicalAnswer:
      '`||` falls back for any falsy value, and 0 is falsy, so a valid 0 gets replaced. Use `??` (nullish coalescing), which only falls back when the left side is null or undefined.',
    solution: code(
      'js',
      'const pageSize = input ?? 20; // 0 stays 0; only null/undefined fall back'
    ),
    explanation:
      '`||` tests **falsiness**, and `0`, `\'\'`, `NaN` and `false` are all falsy while being perfectly legitimate values, so a real user input of `0` gets silently overwritten by the default. `??` tests only for `null` and `undefined`, which is what "no value was provided" actually means. This is the single most common source of default-value bugs in modern JS. Note you cannot mix `??` with `||`/`&&` without parentheses; that is a deliberate syntax error to stop ambiguous precedence.',
  },

  {
    slug: 'js-array-last',
    title: 'Last element of an array',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Given `const rows = [1, 2, 3];`, write the modern one-call expression that returns the **last** element using a negative index.'
    ),
    graderConfig: {
      accept: ['rows.at(-1)', 'at(-1)', '.at(-1)'],
      acceptPatterns: ['\\bat\\(\\s*-\\s*1\\s*\\)'],
      nearMisses: {
        'rows[rows.length - 1]': 'That works, but the problem asked for the negative-index method.',
        'rows[-1]':
          'Bracket notation does not support negative indexes. That reads a property named "-1" and gives undefined.',
        'rows.pop()': 'pop() returns the last element but *removes* it, mutating the array.',
      },
      hints: [
        'ES2022 added a method that accepts negative indexes.',
        '`arr.at(-1)`. Bracket notation cannot do this.',
      ],
    },
    canonicalAnswer: 'rows.at(-1)',
    solution: code('js', 'rows.at(-1); // 3'),
    explanation:
      '`Array.prototype.at()` accepts negative indexes that count back from the end, so `at(-1)` is the last element and `at(-2)` the one before it. `rows[-1]` does **not** work: bracket notation converts `-1` to the string key `"-1"`, which no array has, so you get `undefined` with no error. Unlike `pop()`, `at()` does not mutate. It works on strings and `TypedArray`s too.',
  },

  {
    slug: 'js-shallow-copy',
    title: 'Copy an object with an override',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'You must not mutate `settings`. Write an expression producing a **new** object identical to it but with `theme` set to `"dark"`.',
      '',
      code('js', "const settings = { theme: 'light', fontSize: 14 };")
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        '\\{\\s*\\.\\.\\.\\s*settings\\s*,\\s*theme\\s*:\\s*[\'"`]dark[\'"`]\\s*,?\\s*\\}',
        'Object\\.assign\\(\\s*\\{\\s*\\}\\s*,\\s*settings\\s*,\\s*\\{\\s*theme\\s*:\\s*[\'"`]dark[\'"`]\\s*\\}\\s*\\)',
      ],
      closeSubstrings: {
        '...settings': 'Right tool. Check that the override comes *after* the spread.',
        'object.assign':
          'Object.assign works, but the first argument must be a fresh `{}` or you mutate settings.',
      },
      hints: [
        'Spread copies the existing properties; a later key wins over an earlier one.',
        "`{ ...settings, theme: 'dark' }`. Order matters, the override goes last.",
      ],
    },
    canonicalAnswer: "{ ...settings, theme: 'dark' }",
    solution: code('js', "const next = { ...settings, theme: 'dark' };"),
    explanation:
      'Object spread copies own enumerable properties into a fresh object, and **later keys win**, so putting the override after the spread is what makes it an override rather than a no-op. This is a *shallow* copy: nested objects are still shared references, so mutating `next.nested.x` would also change `settings.nested.x`. `Object.assign(settings, …)` is the trap version. It mutates its first argument, which is exactly what the problem forbids.',
  },

  {
    slug: 'js-reduce-sum',
    title: 'Total a field with reduce',
    category: 'js-apis',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Sum the `qty` of every line in one expression:',
      '',
      code('js', 'const lines = [{ qty: 2 }, { qty: 1 }, { qty: 4 }];'),
      '',
      'Use `reduce`. Remember the initial value.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'reduce\\(\\s*\\(?\\s*\\w+\\s*,\\s*\\w+\\s*\\)?\\s*=>\\s*\\w+\\s*\\+\\s*\\w+\\.qty\\s*,\\s*0\\s*\\)',
        'reduce\\(\\s*function[^)]*\\)\\s*\\{[\\s\\S]*return[\\s\\S]*\\}\\s*,\\s*0\\s*\\)',
      ],
      closeSubstrings: {
        reduce:
          'Right method. Check the accumulator order (`acc + line.qty`) and that you passed `0` as the initial value.',
      },
      hints: [
        'reduce takes a callback `(accumulator, item)` and an initial value.',
        'Without the initial value, reduce on an empty array throws.',
        '`lines.reduce((total, line) => total + line.qty, 0)`',
      ],
    },
    canonicalAnswer: 'lines.reduce((total, line) => total + line.qty, 0)',
    solution: code('js', 'lines.reduce((total, line) => total + line.qty, 0); // 7'),
    explanation:
      'The accumulator comes **first** in the callback and whatever you return becomes the accumulator for the next item. Always pass the initial value: without it, `reduce` uses the first element as the seed, which breaks on an array of objects (you would add a number to an object) and throws `TypeError` outright on an empty array. `0` also makes the empty case return a sensible `0` instead of exploding.',
  },

  {
    slug: 'js-sort-numbers',
    title: 'Why sort() mangles numbers',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md('What exactly does this log?', '', code('js', 'console.log([10, 9, 1].sort());')),
    graderConfig: {
      accept: ['[1, 10, 9]', '[1,10,9]', '1, 10, 9', '1,10,9'],
      acceptPatterns: ['\\[?\\s*1\\s*,\\s*10\\s*,\\s*9\\s*\\]?'],
      nearMisses: {
        '[1, 9, 10]':
          'That is what you would get *with* a comparator. The default sort does something else.',
        '[1,9,10]':
          'That is what you would get *with* a comparator. The default sort does something else.',
      },
      hints: [
        'The default sort does not compare numbers numerically.',
        'It converts each element to a string and compares those.',
        '"10" sorts before "9" because "1" < "9" character by character.',
      ],
    },
    canonicalAnswer: '[1, 10, 9]',
    solution: code(
      'js',
      '[10, 9, 1].sort();            // [1, 10, 9]  ← string comparison',
      '[10, 9, 1].sort((a, b) => a - b); // [1, 9, 10]  ← numeric'
    ),
    explanation:
      'With no comparator, `sort()` converts every element to a **string** and compares UTF-16 code units, so `"10"` sorts before `"9"` on the strength of its first character. Any numeric sort needs an explicit comparator: `(a, b) => a - b`. The comparator must return a negative number, zero, or a positive number. Returning a boolean (`a > b`) is a subtle bug because `false` coerces to `0`, meaning "equal". `sort()` also mutates in place and returns the same array.',
  },

  {
    slug: 'js-sort-mutates',
    title: 'sort() mutates its array',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'In a React component you write:',
      '',
      code('js', 'const newest = items.sort((a, b) => b.date - a.date);'),
      '',
      '`items` comes straight from props. Explain the bug and how to avoid it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['mutat', 'in place', 'in-place'],
          missingFeedback: 'What does sort() do to the original array?',
        },
        {
          synonyms: ['copy', 'spread', 'slice', 'tosorted', '...'],
          missingFeedback:
            'Name a way to sort without touching the original. Copy it, or use the non-mutating method.',
        },
      ],
      hints: [
        '`sort()` does not return a new array.',
        'It sorts in place and returns a reference to the *same* array, so props get mutated.',
        'Copy first (`[...items].sort(…)`) or use `items.toSorted(…)` (ES2023).',
      ],
    },
    canonicalAnswer:
      'sort() mutates the array in place and returns the same reference, so this mutates the props array. Copy it first with [...items].sort(...) or use the non-mutating items.toSorted(...).',
    solution: code(
      'js',
      'const newest = [...items].sort((a, b) => b.date - a.date);',
      '// or, ES2023:',
      'const newest = items.toSorted((a, b) => b.date - a.date);'
    ),
    explanation:
      '`sort()` sorts **in place** and returns a reference to the very same array, so `newest === items` and the props array has been reordered underneath React. Because the reference never changed, React sees no new value and may not re-render. You get a stale UI *and* a mutation bug in one line. Copy first with `[...items]` or `items.slice()`, or use the ES2023 non-mutating twins `toSorted`, `toReversed`, `toSpliced` and `with`. `reverse()` and `splice()` have exactly the same hazard.',
  },

  {
    slug: 'js-flatmap',
    title: 'Map then flatten',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Each order has an array of tags. Produce one flat array of every tag, in one call:',
      '',
      code('js', "const orders = [{ tags: ['a', 'b'] }, { tags: ['c'] }];")
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['flatMap\\(\\s*\\(?\\s*\\w+\\s*\\)?\\s*=>\\s*\\w+\\.tags\\s*\\)'],
      closeSubstrings: {
        'map(': 'map() alone gives you an array of arrays. You need the flattening step as well.',
        flat: 'You have the right pieces; there is a single method that does map and flatten together.',
      },
      hints: [
        "`map` alone would give `[['a','b'], ['c']]`.",
        'One method maps and then flattens one level.',
        '`orders.flatMap((order) => order.tags)`',
      ],
    },
    canonicalAnswer: 'orders.flatMap((order) => order.tags)',
    solution: code('js', "orders.flatMap((order) => order.tags); // ['a', 'b', 'c']"),
    explanation:
      '`flatMap` is `map` followed by `flat(1)`. It flattens exactly **one** level, so nested arrays inside your tags would survive. Beyond concatenating, it doubles as a combined map-and-filter: return `[]` to drop an item and `[x]` to keep it, which avoids a second pass. `flat(Infinity)` is the sledgehammer for arbitrarily deep nesting.',
  },

  {
    slug: 'js-group-by',
    title: 'Group records by a key',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Group these by `city` into `{ Bristol: [...], Lyon: [...] }`.',
      '',
      code(
        'js',
        'const people = [',
        "  { name: 'Dana', city: 'Bristol' },",
        "  { name: 'Omar', city: 'Lyon' },",
        "  { name: 'Sam',  city: 'Bristol' },",
        '];'
      ),
      '',
      'Any correct approach is fine. `reduce` or a newer built-in.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'Object\\.groupBy\\(\\s*people\\s*,',
        'reduce\\([\\s\\S]*\\)',
        'for\\s*\\(\\s*const[\\s\\S]*of\\s+people',
      ],
      closeSubstrings: {
        groupby: 'Right idea. Check the exact name and argument order.',
      },
      hints: [
        'Either accumulate into an object with `reduce`, or use the ES2024 built-in.',
        '`Object.groupBy(people, (p) => p.city)` does it in one call.',
        'With reduce, seed an empty object and push into `acc[key] ??= []`.',
      ],
    },
    canonicalAnswer: 'Object.groupBy(people, (person) => person.city)',
    solution: code(
      'js',
      '// ES2024:',
      'Object.groupBy(people, (person) => person.city);',
      '',
      '// Portable:',
      'people.reduce((acc, person) => {',
      '  (acc[person.city] ??= []).push(person);',
      '  return acc;',
      '}, {});'
    ),
    explanation:
      '`Object.groupBy(items, keyFn)` (ES2024) returns a plain object keyed by the callback\'s return value. Note it produces a null-prototype object, so there is no inherited `toString` to collide with a group literally named "toString". The `reduce` version is the portable equivalent, and `(acc[key] ??= []).push(x)` is the tidy way to create-or-append in one expression. Use `Map.groupBy` when your keys are not strings.',
  },

  {
    slug: 'js-deep-clone',
    title: 'Deep clone without a library',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You need a genuine **deep** copy of a nested plain object, with no library. Which single built-in function does this in modern browsers and Node?'
    ),
    graderConfig: {
      accept: ['structuredclone', 'structuredclone()', 'structuredclone(obj)'],
      acceptPatterns: ['structuredClone\\('],
      nearMisses: {
        'json.parse(json.stringify(obj))':
          'That is the old trick, but it destroys Dates, Maps, Sets and undefined. There is a real built-in now.',
        'object.assign': 'Object.assign is a shallow copy.',
        '{...obj}': 'Spread is a shallow copy. Nested objects stay shared.',
      },
      hints: [
        'It is a global function, not a method on Object.',
        'It uses the same algorithm the browser uses to send data to a Web Worker.',
        '`structuredClone(value)`',
      ],
    },
    canonicalAnswer: 'structuredClone',
    solution: code('js', 'const copy = structuredClone(original);'),
    explanation:
      '`structuredClone()` implements the structured clone algorithm (the same one `postMessage` uses) and handles nested objects, arrays, `Date`, `Map`, `Set`, `RegExp`, typed arrays and even circular references. The old `JSON.parse(JSON.stringify(x))` trick silently turns `Date` into a string, drops `undefined` and functions entirely, and throws on cycles. `structuredClone` cannot clone functions, DOM nodes or class prototypes. It throws `DataCloneError` rather than failing quietly, which is the better failure mode.',
  },

  {
    slug: 'js-await-in-loop',
    title: 'Awaiting inside a loop',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This takes 3 seconds for 3 independent requests that each take 1 second:',
      '',
      code('js', 'for (const id of ids) {', '  results.push(await fetchUser(id));', '}'),
      '',
      'Explain why, and how to make it take ~1 second.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['sequential', 'serial', 'one at a time', 'one after', 'waits for'],
          missingFeedback: 'Describe the order the requests currently run in.',
        },
        {
          synonyms: ['promise.all', 'all(', 'parallel', 'concurrent'],
          missingFeedback: 'Name the combinator (or the property) that lets them overlap.',
        },
        {
          synonyms: ['map', 'start', 'kick off', 'fire'],
          missingFeedback: 'How do you create all the promises before awaiting any of them?',
        },
      ],
      hints: [
        '`await` suspends the whole loop body until that one promise settles.',
        'The requests are independent, so nothing needs them to be ordered.',
        '`await Promise.all(ids.map(fetchUser))` starts them all, then waits once.',
      ],
    },
    canonicalAnswer:
      'The await makes the loop sequential: each iteration waits for the previous request to finish. Since they are independent, map them to promises to start them all in parallel, then await Promise.all(ids.map((id) => fetchUser(id))).',
    solution: code('js', 'const results = await Promise.all(ids.map((id) => fetchUser(id)));'),
    explanation:
      '`await` suspends the enclosing async function until that promise settles, so a loop body containing `await` runs strictly **sequentially** and total time is the sum of every request. Because a promise starts executing the moment it is created, `ids.map(…)` fires all the requests immediately and `Promise.all` then waits once for the slowest, turning sum into max. Sequential is still the right call when each step depends on the previous one, or when you need to avoid hammering a rate-limited API; in that case cap the concurrency rather than going fully serial.',
  },

  {
    slug: 'js-map-vs-object',
    title: 'When Map beats a plain object',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You are building a lookup keyed by DOM element, and entries are added and removed constantly.',
      '',
      'Give two concrete reasons to reach for a `Map` instead of a plain `{}` here.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'any',
            'object as key',
            'non-string',
            'reference',
            'element as key',
            'any type',
          ],
          missingFeedback: 'What kinds of keys can a Map hold that an object cannot?',
        },
        {
          synonyms: ['size', 'delete', 'iterat', 'order', 'prototype', 'insertion'],
          missingFeedback:
            'Name an API or safety advantage. Size, delete, iteration order, or prototype pollution.',
        },
      ],
      hints: [
        'Think about what happens to a DOM element used as an object key.',
        'Object keys are coerced to strings, so every element becomes `"[object HTMLDivElement]"`.',
        'Map also gives you `.size`, real `.delete()`, guaranteed insertion order, and no prototype keys.',
      ],
    },
    canonicalAnswer:
      'A Map accepts any value as a key, including the DOM element reference itself, whereas object keys are coerced to strings so every element collapses to the same key. Map also has a real size property, delete, and guaranteed insertion order, with no inherited prototype keys to collide with.',
    solution: code(
      'js',
      'const meta = new Map();',
      'meta.set(el, { clicks: 0 }); // the element itself is the key',
      'meta.size;                   // O(1) count',
      'meta.delete(el);             // real removal',
      '',
      '// WeakMap if you want entries to disappear when the element is GCed'
    ),
    explanation:
      'Object keys are coerced to strings, so every DOM element becomes `"[object HTMLDivElement]"` and they all collide. A `Map` keys on the reference itself. `Map` also gives you `.size` in O(1) (objects need `Object.keys().length`), a real `.delete()`, guaranteed insertion order for iteration, and no inherited keys like `constructor` to guard against. For this exact case a `WeakMap` is often better still: it holds keys weakly, so removing the element from the DOM lets the entry be garbage collected instead of leaking.',
  },

  {
    slug: 'js-allsettled',
    title: 'Every outcome from a batch of promises',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You fire 3 fetches with `Promise.all` and one rejects. The whole thing rejects and you lose the other two results.',
      '',
      'Which Promise combinator gives you **every** outcome, and what is the shape of what it resolves with?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['allsettled'],
          missingFeedback:
            "Name the combinator. It's a static method on Promise that never short-circuits.",
        },
        {
          synonyms: ['status'],
          missingFeedback:
            'Each result object has a field telling you whether that promise fulfilled or rejected.',
        },
        {
          synonyms: ['value', 'reason'],
          missingFeedback: "What's on the result object for a fulfilled promise vs a rejected one?",
        },
      ],
      hints: [
        'It never rejects, no matter what the input promises do.',
        'It resolves with an array of objects, one per input promise.',
        "Each object is `{status: 'fulfilled', value}` or `{status: 'rejected', reason}`.",
      ],
    },
    canonicalAnswer:
      "Promise.allSettled. It always resolves with an array of objects, one per promise, each carrying a status of 'fulfilled' with a value or 'rejected' with a reason.",
    solution: md(
      '`Promise.allSettled(promises)`. It always fulfils, with an array of result objects in input order:',
      '',
      code(
        'js',
        'const results = await Promise.allSettled([a, b, c]);',
        '// [',
        "//   { status: 'fulfilled', value: <resolved value> },",
        "//   { status: 'rejected',  reason: <rejection reason> },",
        '// ]',
        "const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);"
      )
    ),
    explanation:
      "`Promise.all` short-circuits: the first rejection rejects the aggregate immediately and the other results are unreachable. `Promise.allSettled` never rejects. It waits for every input to settle and fulfils with an array of descriptor objects in **input order**, one per promise. Fulfilled entries are `{ status: 'fulfilled', value }` and rejected ones are `{ status: 'rejected', reason }`, so you branch on `status` rather than using try/catch. Use `all` when any failure should abort the whole operation, and `allSettled` when you want partial success (dashboards, batch imports, fan-out reads).",
  },

  {
    slug: 'js-microtask-order',
    title: 'Predict the event-loop order',
    category: 'js-apis',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'In what order do these log? Answer with the four letters.',
      '',
      code(
        'js',
        "console.log('a');",
        "setTimeout(() => console.log('b'));",
        "Promise.resolve().then(() => console.log('c'));",
        "console.log('d');"
      )
    ),
    graderConfig: {
      accept: ['a d c b', 'adcb', 'a, d, c, b'],
      acceptPatterns: ['\\ba[\\s,]+d[\\s,]+c[\\s,]+b\\b', '\\badcb\\b'],
      nearMisses: {
        'a d b c': 'Close, but microtasks (promise callbacks) run before timers, not after.',
        'a b c d':
          'Both `console.log` calls are synchronous; they finish before anything scheduled runs.',
        'a c d b':
          '`.then()` is scheduled, not immediate. The rest of the synchronous script runs first.',
      },
      hints: [
        'All synchronous code runs to completion first.',
        'Then the microtask queue drains. That is where promise callbacks live.',
        'Only then does the event loop pick up timers (macrotasks).',
      ],
    },
    canonicalAnswer: 'a d c b',
    solution: md(
      '`a d c b`',
      '',
      code(
        'js',
        "console.log('a');                                  // 1: sync",
        "setTimeout(() => console.log('b'));                // 4: macrotask",
        "Promise.resolve().then(() => console.log('c'));     // 3: microtask",
        "console.log('d');                                  // 2: sync"
      )
    ),
    explanation:
      'The synchronous script always runs to completion first, so `a` and `d` come out before anything that was scheduled. Then the **microtask** queue drains completely: promise callbacks, `queueMicrotask` and `await` continuations. That gives you `c`. Only after that does the event loop take one **macrotask**, which is the `setTimeout` callback, giving `b`. The practical consequence: a microtask that queues another microtask can starve timers indefinitely, whereas `setTimeout(fn, 0)` always yields to the browser first (letting it paint).',
  },

  {
    slug: 'js-closure-var',
    title: 'var in a loop with a callback',
    category: 'js-apis',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'What does this log, and how many times?',
      '',
      code('js', 'for (var i = 0; i < 3; i++) {', '  setTimeout(() => console.log(i));', '}')
    ),
    graderConfig: {
      accept: ['3 3 3', '333', '3, 3, 3', '3 three times', 'three threes'],
      acceptPatterns: ['\\b3[\\s,]+3[\\s,]+3\\b', '3\\s*(three times|x\\s*3)'],
      nearMisses: {
        '0 1 2': 'That is what `let` would give you. `var` behaves differently here.',
        '0, 1, 2': 'That is what `let` would give you. `var` behaves differently here.',
      },
      hints: [
        '`var` is function-scoped, not block-scoped.',
        'All three callbacks close over the *same* binding of `i`.',
        'By the time the timers fire, the loop has finished and `i` is 3.',
      ],
    },
    canonicalAnswer: '3 3 3',
    solution: md(
      '`3`, three times.',
      '',
      code(
        'js',
        'for (let i = 0; i < 3; i++) {',
        '  setTimeout(() => console.log(i)); // 0 1 2. Let creates a fresh binding per iteration',
        '}'
      )
    ),
    explanation:
      '`var` declares **one** function-scoped binding, so all three closures capture the same variable. The callbacks only run after the synchronous loop has finished, at which point `i` is already `3`. `let` fixes it because a `for` loop with `let` creates a **fresh binding each iteration**, and each closure captures its own. Logging `0 1 2`. This is why the pre-ES6 workaround was an IIFE per iteration to manufacture that separate scope by hand.',
  },

  {
    slug: 'js-promise-timeout',
    title: 'Time out a slow request',
    category: 'js-apis',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You want `fetchUser()` to fail if it has not resolved within 2 seconds.',
      '',
      'Describe how to build that with promise combinators, and what the pattern does *not* do.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['race'],
          missingFeedback:
            'Which combinator settles as soon as the *first* of several promises settles?',
        },
        {
          synonyms: ['settimeout', 'timer', 'delay', 'reject after'],
          missingFeedback: 'What do you race the request against?',
        },
        {
          synonyms: ['cancel', 'abort', 'still', 'keeps running', 'continues'],
          missingFeedback: 'What happens to the losing request? Does it stop?',
        },
      ],
      hints: [
        '`Promise.race` settles with whichever input settles first.',
        'Race the real request against a promise that rejects after 2000ms.',
        'Racing does not cancel the loser. The fetch keeps going unless you abort it with an AbortController.',
      ],
    },
    canonicalAnswer:
      'Use Promise.race to race the fetch against a promise that rejects after a setTimeout of 2000ms; whichever settles first wins. It does not cancel the losing request. The fetch keeps running, so pair it with an AbortController to actually abort it.',
    solution: code(
      'js',
      'function timeout(ms) {',
      '  return new Promise((_, reject) =>',
      "    setTimeout(() => reject(new Error('timeout')), ms),",
      '  );',
      '}',
      '',
      'const user = await Promise.race([fetchUser(), timeout(2000)]);',
      '',
      '// Better. Actually cancels the request:',
      'const user2 = await fetchUser({ signal: AbortSignal.timeout(2000) });'
    ),
    explanation:
      '`Promise.race` settles with the first input to settle, so racing the request against a timer that rejects gives you a deadline. The catch is that **racing does not cancel the loser**: the fetch keeps running, still consumes a connection, and its eventual result is simply ignored. A real leak under load. Pair it with an `AbortController`, or skip the race entirely and use `AbortSignal.timeout(ms)`, which aborts the request itself. Note `race` on an empty array never settles at all.',
  },

  {
    slug: 'js-abort',
    title: 'Cancelling an in-flight fetch',
    category: 'js-apis',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'Which web API lets you cancel an in-flight `fetch`, and how do you wire it up?',
      '',
      '(Name the API and the two key steps.)'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['abortcontroller'],
          missingFeedback: "It's a controller object made for exactly this.",
        },
        {
          synonyms: ['signal'],
          missingFeedback: "Something from the controller gets passed into fetch's options object.",
        },
        {
          synonyms: ['.abort', 'abort()'],
          missingFeedback: 'How do you actually trigger the cancellation?',
        },
      ],
      hints: [
        '`new AbortController()`.',
        "Pass `controller.signal` as fetch's `signal` option.",
        'Call `controller.abort()` to cancel; the fetch rejects with an AbortError.',
      ],
    },
    canonicalAnswer:
      'Use an AbortController: pass controller.signal into fetch options, then call controller.abort() to cancel.',
    solution: code(
      'js',
      'const controller = new AbortController();',
      '',
      'fetch(url, { signal: controller.signal }).catch((err) => {',
      "  if (err.name === 'AbortError') return; // cancelled on purpose",
      '  throw err;',
      '});',
      '',
      'controller.abort(); // cancels the request'
    ),
    explanation:
      '`AbortController` is the generic cancellation primitive: it owns a `signal` you hand to the operation, and an `abort()` method you keep for yourself. Pass `controller.signal` as fetch\'s `signal` option, then call `controller.abort()`. The pending promise rejects with a `DOMException` whose `name` is `"AbortError"`, so filter that out rather than reporting it as a failure. A controller is single-use: once aborted it stays aborted, so create a fresh one per request (the usual pattern for cancelling a stale search-as-you-type call). The same signal works with `addEventListener`, so one controller can tear down listeners and requests together.',
  },
];
