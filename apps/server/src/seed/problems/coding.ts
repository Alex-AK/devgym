import { codeProblem, md, type ProblemDraft } from './types';

/**
 * Write-the-function problems. Your code runs against real assertions, so the
 * tests double as the spec: read them to see the edge cases before you start.
 */
export const codingProblems: ProblemDraft[] = [
  codeProblem({
    slug: 'code-chunk',
    title: 'Chunk an array',
    difficulty: 'easy',
    relevance: 'occasional',
    prompt: md(
      'Split an array into groups of at most `size`, preserving order.',
      '',
      'The last group may be short. An empty input gives an empty array.'
    ),
    starter: 'function chunk(items, size) {\n  \n}',
    tests: [
      {
        name: 'splits evenly',
        expression: 'chunk([1, 2, 3, 4], 2)',
        expected: [
          [1, 2],
          [3, 4],
        ],
      },
      {
        name: 'leaves a short final group',
        expression: 'chunk([1, 2, 3, 4, 5], 2)',
        expected: [[1, 2], [3, 4], [5]],
      },
      { name: 'handles an empty array', expression: 'chunk([], 3)', expected: [] },
      {
        name: 'handles a size larger than the array',
        expression: 'chunk([1, 2], 10)',
        expected: [[1, 2]],
      },
      {
        name: 'does not mutate the input',
        expression: '(() => { const xs = [1, 2, 3]; chunk(xs, 2); return xs; })()',
        expected: [1, 2, 3],
      },
    ],
    reference:
      'function chunk(items, size) {\n  const out = [];\n  for (let i = 0; i < items.length; i += size) {\n    out.push(items.slice(i, i + size));\n  }\n  return out;\n}',
    hints: [
      'Step through the array `size` at a time rather than one at a time.',
      '`slice(i, i + size)` clamps at the end for you, so the last group needs no special case.',
    ],
    explanation:
      'Advancing the loop counter by `size` rather than 1 is the whole trick, and `slice` already clamps past the end, so the short final group falls out for free. `slice` also copies, so the input is never mutated. Watch the degenerate case in real code: a `size` of 0 makes `i += 0` an infinite loop, which is worth a guard when the value comes from user input.',
  }),

  codeProblem({
    slug: 'code-unique-by',
    title: 'Deduplicate by a key',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Remove duplicates from an array of objects, comparing by the value a key function returns.',
      '',
      'Keep the **first** occurrence of each key, in original order.'
    ),
    starter: 'function uniqueBy(items, keyFn) {\n  \n}',
    tests: [
      {
        name: 'keeps the first of each key',
        expression: "uniqueBy([{id: 1, n: 'a'}, {id: 2, n: 'b'}, {id: 1, n: 'c'}], (x) => x.id)",
        expected: [
          { id: 1, n: 'a' },
          { id: 2, n: 'b' },
        ],
      },
      { name: 'handles an empty array', expression: 'uniqueBy([], (x) => x)', expected: [] },
      {
        name: 'keeps everything when all keys differ',
        expression: 'uniqueBy([{id: 1}, {id: 2}], (x) => x.id)',
        expected: [{ id: 1 }, { id: 2 }],
      },
      {
        name: 'works with non-string keys',
        expression: 'uniqueBy([{d: 1}, {d: 1}, {d: 2}], (x) => x.d)',
        expected: [{ d: 1 }, { d: 2 }],
      },
    ],
    reference:
      'function uniqueBy(items, keyFn) {\n  const seen = new Set();\n  const out = [];\n  for (const item of items) {\n    const key = keyFn(item);\n    if (seen.has(key)) continue;\n    seen.add(key);\n    out.push(item);\n  }\n  return out;\n}',
    hints: [
      '`[...new Set(items)]` cannot help: the objects are distinct references.',
      'Track the keys you have already emitted in a `Set`.',
      'Push the item only the first time its key shows up.',
    ],
    explanation:
      'A `Set` of *keys* is what makes this O(n); the tempting `filter` + `findIndex` version is O(n²) and gets slow fast. Keeping the first occurrence rather than the last is the usual expectation, and it falls out of iterating forwards. A one-liner alternative is `[...new Map(items.map((i) => [keyFn(i), i])).values()]`, but note that keeps the **last** occurrence, because later `set` calls overwrite.',
  }),

  codeProblem({
    slug: 'code-count-by',
    title: 'Tally by a key',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Count how many items fall into each bucket, returning a plain object of counts.',
      '',
      'Order of keys does not matter.'
    ),
    starter: 'function countBy(items, keyFn) {\n  \n}',
    tests: [
      {
        name: 'counts repeated keys',
        expression: "countBy(['a', 'bb', 'c', 'dd'], (s) => s.length)",
        expected: { 1: 2, 2: 2 },
      },
      { name: 'handles an empty array', expression: 'countBy([], (x) => x)', expected: {} },
      {
        name: 'counts a single bucket',
        expression: "countBy([1, 2, 3], () => 'all')",
        expected: { all: 3 },
      },
      {
        name: 'is not confused by a key named toString',
        expression: "countBy(['toString'], (s) => s)",
        expected: { toString: 1 },
      },
    ],
    reference:
      'function countBy(items, keyFn) {\n  const counts = Object.create(null);\n  for (const item of items) {\n    const key = keyFn(item);\n    counts[key] = (counts[key] ?? 0) + 1;\n  }\n  return counts;\n}',
    hints: [
      'Accumulate into an object as you walk the array.',
      'The last test is the interesting one: a plain `{}` already has a `toString`.',
      'Start from `Object.create(null)` (or a `Map`) so nothing is inherited.',
    ],
    explanation:
      'The last test is the whole point. A plain `{}` inherits `toString` from `Object.prototype`, so `counts["toString"]` is a *function* rather than `undefined`, `?? 0` does not fire, and you get `"function toString() { [native code] }1"`. Starting from `Object.create(null)` gives a bare object with nothing inherited; a `Map` avoids it too, and also keeps non-string keys as themselves. Note object keys are coerced to strings either way, which is why the numeric buckets come back as `"1"` and `"2"`.',
  }),

  codeProblem({
    slug: 'code-flatten',
    title: 'Flatten to a depth',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Flatten a nested array by `depth` levels, without using `Array.prototype.flat`.',
      '',
      'A depth of 0 returns a shallow copy.'
    ),
    starter: 'function flatten(items, depth = 1) {\n  \n}',
    tests: [
      {
        name: 'flattens one level by default',
        expression: 'flatten([1, [2, [3]]])',
        expected: [1, 2, [3]],
      },
      { name: 'flattens two levels', expression: 'flatten([1, [2, [3]]], 2)', expected: [1, 2, 3] },
      { name: 'depth 0 copies', expression: 'flatten([1, [2]], 0)', expected: [1, [2]] },
      {
        name: 'handles deep nesting with a large depth',
        expression: 'flatten([1, [2, [3, [4, [5]]]]], Infinity)',
        expected: [1, 2, 3, 4, 5],
      },
      { name: 'handles an empty array', expression: 'flatten([])', expected: [] },
    ],
    reference:
      'function flatten(items, depth = 1) {\n  const out = [];\n  for (const item of items) {\n    if (Array.isArray(item) && depth > 0) {\n      out.push(...flatten(item, depth - 1));\n    } else {\n      out.push(item);\n    }\n  }\n  return out;\n}',
    hints: [
      'Recursion is the natural shape: an array element is itself flattenable.',
      'Decrement `depth` on the way down, and stop recursing at 0.',
      '`Array.isArray(item)` decides whether to descend.',
    ],
    explanation:
      'Passing `depth - 1` into the recursive call is what makes the depth limit work, and the `depth > 0` guard is what stops it. `Infinity - 1` is still `Infinity`, so the unlimited case needs no special handling. Beware `push(...arr)` on very large arrays: spread passes each element as an argument and can blow the call-stack limit, so a loop or `concat` is safer at scale.',
  }),

  codeProblem({
    slug: 'code-group-sort',
    title: 'Group, total, and rank',
    difficulty: 'medium',
    relevance: 'daily',
    prompt: md(
      'The bread-and-butter data question. Given line items, return total revenue per category, highest first.',
      '',
      'Ties are impossible in the tests. Return an array of `{ category, total }`.'
    ),
    starter: 'function revenueByCategory(items) {\n  \n}',
    setup:
      "const LINES = [\n  { category: 'books', price: 10, qty: 2 },\n  { category: 'toys', price: 5, qty: 1 },\n  { category: 'books', price: 3, qty: 1 },\n];",
    tests: [
      {
        name: 'totals and ranks',
        expression: 'revenueByCategory(LINES)',
        expected: [
          { category: 'books', total: 23 },
          { category: 'toys', total: 5 },
        ],
      },
      { name: 'handles an empty list', expression: 'revenueByCategory([])', expected: [] },
      {
        name: 'multiplies price by quantity',
        expression: "revenueByCategory([{ category: 'a', price: 4, qty: 3 }])",
        expected: [{ category: 'a', total: 12 }],
      },
      {
        name: 'does not mutate the input',
        expression: '(() => { revenueByCategory(LINES); return LINES.length; })()',
        expected: 3,
      },
    ],
    reference:
      'function revenueByCategory(items) {\n  const totals = new Map();\n  for (const item of items) {\n    const current = totals.get(item.category) ?? 0;\n    totals.set(item.category, current + item.price * item.qty);\n  }\n  return [...totals]\n    .map(([category, total]) => ({ category, total }))\n    .sort((a, b) => b.total - a.total);\n}',
    hints: [
      'Two steps: accumulate into a Map, then turn it into a sorted array.',
      'Multiply per row *before* adding, exactly like SUM(quantity * price) in SQL.',
      '`sort((a, b) => b.total - a.total)` is descending. Sort the copy, not the input.',
    ],
    explanation:
      'This is the JavaScript twin of a `GROUP BY … ORDER BY SUM(...) DESC` query, and it comes up constantly once the data is already in memory. Multiply per row before accumulating; summing the prices and quantities separately is the classic wrong answer. `sort` mutates, so sort the array you just built rather than anything you were handed. A `Map` beats a plain object here because it preserves insertion order and cannot collide with inherited keys.',
  }),

  codeProblem({
    slug: 'code-debounce',
    title: 'Implement debounce',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Return a function that delays calling `fn` until `ms` have passed with no further calls.',
      '',
      'A burst of calls should produce exactly one invocation, with the **last** arguments.'
    ),
    starter: 'function debounce(fn, ms) {\n  \n}',
    // These sleep on real timers, and they have to: stub the clock and the rep
    // is no longer about `setTimeout`. What keeps them honest under load is that
    // no pair of them is a race. Node runs expired timers in expiry order and
    // drains microtasks after each one, so a busy machine delays every timer and
    // reorders none. Each sleep is therefore either longer than the delay it is
    // waiting out or shorter than the one it must not reach, and moving one to
    // the wrong side of its delay is how this rep would become flaky.
    tests: [
      {
        name: 'collapses a burst into one call with the last arguments',
        expression:
          '(async () => { const seen = []; const d = debounce((x) => seen.push(x), 10); d(1); d(2); d(3); await new Promise((r) => setTimeout(r, 40)); return seen; })()',
        expected: [3],
      },
      {
        name: 'does not fire before the delay elapses',
        expression:
          '(async () => { const seen = []; const d = debounce(() => seen.push(1), 30); d(); await new Promise((r) => setTimeout(r, 5)); return seen.length; })()',
        expected: 0,
      },
      {
        name: 'fires again for a later, separate call',
        expression:
          "(async () => { const seen = []; const d = debounce((x) => seen.push(x), 10); d('a'); await new Promise((r) => setTimeout(r, 30)); d('b'); await new Promise((r) => setTimeout(r, 30)); return seen; })()",
        expected: ['a', 'b'],
      },
    ],
    reference:
      'function debounce(fn, ms) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}',
    hints: [
      'The returned function needs to remember the pending timer between calls.',
      'A closure variable holds it: every call clears the previous timer first.',
      '`clearTimeout(timer); timer = setTimeout(() => fn(...args), ms);`',
    ],
    explanation:
      'The closure over `timer` is the entire mechanism: each call cancels the pending invocation and schedules a fresh one, so only a call followed by `ms` of silence ever fires. Capturing `...args` inside the arrow is what makes the *last* arguments win. This is the trailing-edge version, which is what a search box wants; a leading-edge variant fires immediately and then ignores the burst. Compare throttle, which guarantees a steady rate rather than waiting for quiet.',
  }),

  codeProblem({
    slug: 'code-memoize',
    title: 'Implement memoize',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Wrap a function so repeated calls with the same arguments return a cached result instead of recomputing.',
      '',
      'Assume the arguments are JSON-serialisable.'
    ),
    starter: 'function memoize(fn) {\n  \n}',
    tests: [
      {
        name: 'returns the same result',
        expression: '(() => { const m = memoize((a, b) => a + b); return [m(1, 2), m(1, 2)]; })()',
        expected: [3, 3],
      },
      {
        name: 'only computes once per argument set',
        expression:
          '(() => { let calls = 0; const m = memoize((x) => { calls += 1; return x * 2; }); m(2); m(2); m(2); return calls; })()',
        expected: 1,
      },
      {
        name: 'treats different arguments as different keys',
        expression:
          '(() => { let calls = 0; const m = memoize((x) => { calls += 1; return x; }); m(1); m(2); return calls; })()',
        expected: 2,
      },
      {
        name: 'caches a falsy result rather than recomputing it',
        expression:
          '(() => { let calls = 0; const m = memoize(() => { calls += 1; return 0; }); m(); m(); return calls; })()',
        expected: 1,
      },
    ],
    reference:
      'function memoize(fn) {\n  const cache = new Map();\n  return (...args) => {\n    const key = JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const value = fn(...args);\n    cache.set(key, value);\n    return value;\n  };\n}',
    hints: [
      'Key the cache on the arguments, not just the first one.',
      '`JSON.stringify(args)` gives a usable key for serialisable inputs.',
      'Check `cache.has(key)`, not `cache.get(key)`, or a cached `0` recomputes forever.',
    ],
    explanation:
      'The last test is the one that catches people: `if (cache.get(key))` is falsy for a legitimately cached `0`, `""` or `false`, so the function recomputes every time and the cache silently does nothing. `has()` asks the right question. `JSON.stringify(args)` is a pragmatic key for plain data but ignores key order in objects and cannot handle functions or cycles; production memoizers take a custom key function. Unbounded caches also leak, which is why real ones cap size.',
  }),

  codeProblem({
    slug: 'code-retry',
    title: 'Retry with backoff',
    difficulty: 'hard',
    relevance: 'occasional',
    prompt: md(
      'Call an async `fn`, retrying on rejection up to `attempts` times in total.',
      '',
      'Resolve with the first success. If every attempt fails, reject with the **last** error. Do not wait between attempts.'
    ),
    starter: 'async function retry(fn, attempts) {\n  \n}',
    tests: [
      {
        name: 'returns immediately on success',
        expression:
          '(async () => { let calls = 0; const r = await retry(async () => { calls += 1; return 7; }, 3); return [r, calls]; })()',
        expected: [7, 1],
      },
      {
        name: 'retries until it succeeds',
        expression:
          "(async () => { let calls = 0; const r = await retry(async () => { calls += 1; if (calls < 3) throw new Error('nope'); return 'ok'; }, 5); return [r, calls]; })()",
        expected: ['ok', 3],
      },
      {
        name: 'gives up after the attempt limit',
        expression:
          "(async () => { let calls = 0; try { await retry(async () => { calls += 1; throw new Error('always'); }, 3); } catch { return calls; } })()",
        expected: 3,
      },
      {
        name: 'rejects with the last error',
        expression: "retry(async () => { throw new Error('final failure'); }, 2)",
        throws: 'final failure',
      },
    ],
    reference:
      'async function retry(fn, attempts) {\n  let lastError;\n  for (let i = 0; i < attempts; i += 1) {\n    try {\n      return await fn();\n    } catch (error) {\n      lastError = error;\n    }\n  }\n  throw lastError;\n}',
    hints: [
      'A loop with try/catch is clearer here than recursion.',
      '`return await fn()` inside the `try` exits the loop on the first success.',
      'Keep the caught error in a variable so you can rethrow the last one after the loop.',
    ],
    explanation:
      'Returning from inside the `try` is what makes the loop stop on success, and holding `lastError` outside the loop is what lets you rethrow something meaningful instead of a generic "all attempts failed". Note `attempts` counts total tries, not retries, which is worth pinning down in the name or a comment before anyone calls it. Real implementations add exponential backoff plus jitter between attempts, and only retry idempotent operations or ones carrying an idempotency key.',
  }),

  codeProblem({
    slug: 'code-promise-pool',
    title: 'Limit concurrency',
    difficulty: 'hard',
    relevance: 'occasional',
    prompt: md(
      'Run async tasks with at most `limit` in flight at once, resolving with the results **in input order**.',
      '',
      '`tasks` is an array of functions returning promises.'
    ),
    starter: 'async function pool(tasks, limit) {\n  \n}',
    tests: [
      {
        name: 'preserves input order',
        expression:
          '(async () => pool([() => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3)], 2))()',
        expected: [1, 2, 3],
      },
      {
        name: 'never exceeds the limit',
        expression:
          '(async () => { let live = 0; let peak = 0; const make = () => async () => { live += 1; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 5)); live -= 1; return 1; }; await pool([make(), make(), make(), make(), make()], 2); return peak; })()',
        expected: 2,
      },
      { name: 'handles an empty task list', expression: 'pool([], 3)', expected: [] },
      {
        name: 'still runs when the limit exceeds the task count',
        expression: 'pool([() => Promise.resolve("a")], 10)',
        expected: ['a'],
      },
    ],
    reference:
      'async function pool(tasks, limit) {\n  const results = new Array(tasks.length);\n  let next = 0;\n\n  async function worker() {\n    while (next < tasks.length) {\n      const index = next;\n      next += 1;\n      results[index] = await tasks[index]();\n    }\n  }\n\n  const size = Math.min(limit, tasks.length);\n  await Promise.all(Array.from({ length: size }, () => worker()));\n  return results;\n}',
    hints: [
      'Start exactly `limit` workers, each pulling the next task until none are left.',
      'A shared index tells each worker which task to take.',
      'Write into `results[index]` so order comes from the index, not from completion time.',
    ],
    explanation:
      'The worker-pool shape beats batching: batches of `limit` stall until the slowest in each batch finishes, whereas workers pick up the next task the instant they free up. Writing into `results[index]` is what preserves input order even though tasks finish out of order. Note `Array.from({length: n}, () => worker())` starts the workers immediately, which is the point; `Promise.all` then just waits. Add error handling in production, since one rejection here fails the whole pool.',
  }),

  codeProblem({
    slug: 'code-event-emitter',
    title: 'A tiny event emitter',
    difficulty: 'medium',
    relevance: 'foundational',
    prompt: md(
      'Implement `createEmitter()` returning an object with `on(event, fn)`, `off(event, fn)` and `emit(event, ...args)`.',
      '',
      'Handlers run in registration order. `emit` on an unknown event does nothing.'
    ),
    starter: 'function createEmitter() {\n  \n}',
    tests: [
      {
        name: 'calls a registered handler',
        expression:
          "(() => { const e = createEmitter(); const seen = []; e.on('x', (v) => seen.push(v)); e.emit('x', 1); return seen; })()",
        expected: [1],
      },
      {
        name: 'calls handlers in registration order',
        expression:
          "(() => { const e = createEmitter(); const seen = []; e.on('x', () => seen.push('a')); e.on('x', () => seen.push('b')); e.emit('x'); return seen; })()",
        expected: ['a', 'b'],
      },
      {
        name: 'off removes only that handler',
        expression:
          "(() => { const e = createEmitter(); const seen = []; const keep = () => seen.push('keep'); const drop = () => seen.push('drop'); e.on('x', keep); e.on('x', drop); e.off('x', drop); e.emit('x'); return seen; })()",
        expected: ['keep'],
      },
      {
        name: 'emitting an unknown event is a no-op',
        expression: "(() => { const e = createEmitter(); e.emit('nope'); return 'survived'; })()",
        expected: 'survived',
      },
      {
        name: 'passes every argument through',
        expression:
          "(() => { const e = createEmitter(); let got; e.on('x', (...a) => { got = a; }); e.emit('x', 1, 2, 3); return got; })()",
        expected: [1, 2, 3],
      },
    ],
    reference:
      'function createEmitter() {\n  const handlers = new Map();\n  return {\n    on(event, fn) {\n      if (!handlers.has(event)) handlers.set(event, []);\n      handlers.get(event).push(fn);\n    },\n    off(event, fn) {\n      const list = handlers.get(event);\n      if (!list) return;\n      const index = list.indexOf(fn);\n      if (index !== -1) list.splice(index, 1);\n    },\n    emit(event, ...args) {\n      for (const fn of [...(handlers.get(event) ?? [])]) fn(...args);\n    },\n  };\n}',
    hints: [
      'A Map from event name to an array of handlers is enough.',
      '`off` needs the same function reference that was passed to `on`.',
      'Emitting an unknown event should find an empty list, not crash.',
    ],
    explanation:
      'This is worth building from scratch once because it exercises closures, collections and reference equality all at once. `off` can only work by reference, which is exactly why `element.removeEventListener` fails when people pass a fresh arrow function. Copying the handler list before iterating (`[...list]`) matters more than it looks: without it, a handler that calls `off` during `emit` mutates the array mid-loop and silently skips the next handler.',
  }),

  codeProblem({
    slug: 'code-deep-equal',
    title: 'Implement deep equality',
    difficulty: 'hard',
    relevance: 'foundational',
    prompt: md(
      'Compare two values structurally: primitives by value, arrays and plain objects by their contents.',
      '',
      'Handle `NaN` as equal to itself. Ignore Maps, Sets and Dates.'
    ),
    starter: 'function isEqual(a, b) {\n  \n}',
    tests: [
      { name: 'compares primitives', expression: 'isEqual(1, 1)', expected: true },
      { name: 'treats NaN as equal to itself', expression: 'isEqual(NaN, NaN)', expected: true },
      {
        name: 'compares nested structures',
        expression: 'isEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })',
        expected: true,
      },
      {
        name: 'spots a nested difference',
        expression: 'isEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })',
        expected: false,
      },
      {
        name: 'is false for a missing key',
        expression: 'isEqual({ a: 1 }, { a: 1, b: 2 })',
        expected: false,
      },
      {
        name: 'is false for an extra key',
        expression: 'isEqual({ a: 1, b: 2 }, { a: 1 })',
        expected: false,
      },
      {
        name: 'does not confuse an array with an object',
        expression: 'isEqual([1], { 0: 1 })',
        expected: false,
      },
      { name: 'handles null without throwing', expression: 'isEqual(null, {})', expected: false },
    ],
    reference:
      'function isEqual(a, b) {\n  if (Object.is(a, b)) return true;\n  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;\n  if (Array.isArray(a) !== Array.isArray(b)) return false;\n\n  const aKeys = Object.keys(a);\n  const bKeys = Object.keys(b);\n  if (aKeys.length !== bKeys.length) return false;\n\n  return aKeys.every(\n    (key) => Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key]),\n  );\n}',
    hints: [
      '`Object.is` handles primitives *and* NaN in one check, unlike `===`.',
      '`typeof null` is `"object"`, so null needs an explicit guard before you read keys.',
      'Compare key counts in both directions, or `{a:1}` and `{a:1,b:2}` look equal.',
    ],
    explanation:
      'Three traps live in this one function. `Object.is` gets `NaN` right where `===` does not (though it also distinguishes `0` from `-0`, which may or may not be what you want). `typeof null === "object"` is a decades-old JavaScript wart, so null must be excluded before you touch keys. And comparing only one direction\'s keys makes a subset look equal, which is why the length check comes first. Real implementations go further: cycles, `Date`, `Map`, `Set`, and typed arrays all need their own branches.',
  }),

  codeProblem({
    slug: 'code-paginate',
    title: 'Paginate a list',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Return one page of results plus the metadata a UI needs.',
      '',
      'Pages are 1-indexed. Return `{ items, page, totalPages, hasNext, hasPrev }`. A page past the end gives an empty `items` array.'
    ),
    starter: 'function paginate(items, page, perPage) {\n  \n}',
    tests: [
      {
        name: 'returns the first page',
        expression: 'paginate([1, 2, 3, 4, 5], 1, 2)',
        expected: { items: [1, 2], page: 1, totalPages: 3, hasNext: true, hasPrev: false },
      },
      {
        name: 'returns a middle page',
        expression: 'paginate([1, 2, 3, 4, 5], 2, 2)',
        expected: { items: [3, 4], page: 2, totalPages: 3, hasNext: true, hasPrev: true },
      },
      {
        name: 'returns a short last page',
        expression: 'paginate([1, 2, 3, 4, 5], 3, 2)',
        expected: { items: [5], page: 3, totalPages: 3, hasNext: false, hasPrev: true },
      },
      {
        name: 'handles a page past the end',
        expression: 'paginate([1, 2], 9, 2)',
        expected: { items: [], page: 9, totalPages: 1, hasNext: false, hasPrev: true },
      },
      {
        name: 'handles an empty list',
        expression: 'paginate([], 1, 10)',
        expected: { items: [], page: 1, totalPages: 0, hasNext: false, hasPrev: false },
      },
    ],
    reference:
      'function paginate(items, page, perPage) {\n  const totalPages = Math.ceil(items.length / perPage);\n  const start = (page - 1) * perPage;\n  return {\n    items: items.slice(start, start + perPage),\n    page,\n    totalPages,\n    hasNext: page < totalPages,\n    hasPrev: page > 1,\n  };\n}',
    hints: [
      'Pages are 1-indexed, so the offset is `(page - 1) * perPage`.',
      '`Math.ceil(length / perPage)` gives the page count, and 0 items means 0 pages.',
      '`slice` clamps past the end, so an out-of-range page returns `[]` for free.',
    ],
    explanation:
      'The off-by-one that bites everyone is the offset: 1-indexed pages need `(page - 1) * perPage`, not `page * perPage`. `slice` clamping means the out-of-range and short-final-page cases need no special handling. The empty list is worth deciding deliberately: `Math.ceil(0 / 10)` is 0, so `totalPages` is 0 rather than 1, and `hasPrev` on page 9 of an empty list is arguably true. Pinning these down in the tests before writing the function is the habit worth building.',
  }),

  codeProblem({
    slug: 'code-parse-query',
    title: 'Parse a query string by hand',
    difficulty: 'medium',
    relevance: 'foundational',
    prompt: md(
      'Parse a query string into an object, without using `URL` or `URLSearchParams`.',
      '',
      'A repeated key collects into an array. A valueless key becomes `""`. Values are percent-decoded and `+` means a space.'
    ),
    starter: 'function parseQuery(search) {\n  \n}',
    tests: [
      {
        name: 'parses simple pairs',
        expression: "parseQuery('a=1&b=2')",
        expected: { a: '1', b: '2' },
      },
      {
        name: 'tolerates a leading question mark',
        expression: "parseQuery('?a=1')",
        expected: { a: '1' },
      },
      {
        name: 'collects a repeated key into an array',
        expression: "parseQuery('t=x&t=y')",
        expected: { t: ['x', 'y'] },
      },
      {
        name: 'gives a valueless key an empty string',
        expression: "parseQuery('debug')",
        expected: { debug: '' },
      },
      {
        name: 'decodes percent escapes',
        expression: "parseQuery('q=a%26b')",
        expected: { q: 'a&b' },
      },
      {
        name: 'decodes plus as a space',
        expression: "parseQuery('q=hello+world')",
        expected: { q: 'hello world' },
      },
      { name: 'handles an empty string', expression: "parseQuery('')", expected: {} },
    ],
    reference:
      "function parseQuery(search) {\n  const out = {};\n  const body = search.replace(/^\\?/, '');\n  if (!body) return out;\n\n  for (const pair of body.split('&')) {\n    if (!pair) continue;\n    const index = pair.indexOf('=');\n    const rawKey = index === -1 ? pair : pair.slice(0, index);\n    const rawValue = index === -1 ? '' : pair.slice(index + 1);\n    const key = decode(rawKey);\n    const value = decode(rawValue);\n\n    if (!(key in out)) out[key] = value;\n    else if (Array.isArray(out[key])) out[key].push(value);\n    else out[key] = [out[key], value];\n  }\n  return out;\n}\n\nfunction decode(part) {\n  return decodeURIComponent(part.replace(/\\+/g, ' '));\n}",
    hints: [
      'Strip a leading `?`, then split on `&`.',
      'Split each pair on the *first* `=` only, or a value containing `=` breaks.',
      'Replace `+` with a space **before** `decodeURIComponent`, and promote to an array on the second sighting of a key.',
    ],
    explanation:
      'Two details separate a working parser from a nearly-working one. Splitting on the first `=` via `indexOf` rather than `split("=")` keeps values that legitimately contain `=` intact, which base64 tokens frequently do. And `+` must become a space *before* percent-decoding, because decoding first would turn `%2B` into a literal `+` that then wrongly becomes a space. The repeated-key promotion is why the real `URLSearchParams` exposes `getAll` rather than returning a plain object: an inconsistent string-or-array value is awkward for callers.',
  }),

  codeProblem({
    slug: 'code-lru-cache',
    title: 'An LRU cache',
    difficulty: 'hard',
    relevance: 'foundational',
    prompt: md(
      'Implement `createCache(capacity)` with `get(key)` and `set(key, value)`.',
      '',
      'When full, evict the **least recently used** entry. Both reading and writing count as use. `get` returns `undefined` for a miss.'
    ),
    starter: 'function createCache(capacity) {\n  \n}',
    tests: [
      {
        name: 'stores and reads back',
        expression: "(() => { const c = createCache(2); c.set('a', 1); return c.get('a'); })()",
        expected: 1,
      },
      {
        name: 'returns undefined for a miss',
        expression: "(() => { const c = createCache(2); return c.get('nope'); })()",
        expectedCode: 'undefined',
      },
      {
        name: 'evicts the least recently used entry',
        expression:
          "(() => { const c = createCache(2); c.set('a', 1); c.set('b', 2); c.set('c', 3); return [c.get('a'), c.get('b'), c.get('c')]; })()",
        expectedCode: '[undefined, 2, 3]',
      },
      {
        name: 'a read counts as use',
        expression:
          "(() => { const c = createCache(2); c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3); return [c.get('a'), c.get('b')]; })()",
        expectedCode: '[1, undefined]',
      },
      {
        name: 'overwriting refreshes rather than duplicating',
        expression:
          "(() => { const c = createCache(2); c.set('a', 1); c.set('b', 2); c.set('a', 9); c.set('c', 3); return [c.get('a'), c.get('b'), c.get('c')]; })()",
        expectedCode: '[9, undefined, 3]',
      },
    ],
    reference:
      'function createCache(capacity) {\n  const map = new Map();\n  return {\n    get(key) {\n      if (!map.has(key)) return undefined;\n      const value = map.get(key);\n      map.delete(key);\n      map.set(key, value);\n      return value;\n    },\n    set(key, value) {\n      if (map.has(key)) map.delete(key);\n      map.set(key, value);\n      if (map.size > capacity) {\n        map.delete(map.keys().next().value);\n      }\n    },\n  };\n}',
    hints: [
      'A `Map` iterates in insertion order, which is most of the problem solved.',
      'To mark an entry as recently used, delete it and re-insert so it moves to the end.',
      '`map.keys().next().value` is the oldest key, ready to evict.',
    ],
    explanation:
      'The trick is that `Map` already guarantees insertion order, so "delete then re-insert" moves an entry to the most-recent end and the oldest key is simply the first one the iterator yields. That gives O(1) for both operations without hand-rolling a doubly linked list, which is the answer this question is usually expecting. Note that `set` on an existing key must delete first, otherwise the value updates but its position, and therefore its recency, does not.',
  }),

  codeProblem({
    slug: 'code-group-by-key',
    title: 'Index a list for lookup',
    difficulty: 'easy',
    relevance: 'daily',
    prompt: md(
      'Write `indexBy(items, key)` returning an object keyed by each item’s `key` property, so a list from an API can be looked up by id in constant time.',
      '',
      'Later items win on a duplicate key. An empty list gives an empty object.'
    ),
    starter: 'function indexBy(items, key) {\n  \n}',
    tests: [
      {
        name: 'indexes by the given key',
        expression: "indexBy([{ id: 'a', n: 1 }, { id: 'b', n: 2 }], 'id')",
        expected: { a: { id: 'a', n: 1 }, b: { id: 'b', n: 2 } },
      },
      {
        name: 'later duplicates win',
        expression: "indexBy([{ id: 'a', n: 1 }, { id: 'a', n: 2 }], 'id').a.n",
        expected: 2,
      },
      { name: 'handles an empty list', expression: "indexBy([], 'id')", expected: {} },
      {
        name: 'works with a numeric key',
        expression: "Object.keys(indexBy([{ code: 404 }], 'code'))",
        expected: ['404'],
      },
    ],
    reference: [
      'function indexBy(items, key) {',
      '  const out = {};',
      '  for (const item of items) {',
      '    out[item[key]] = item;',
      '  }',
      '  return out;',
      '}',
    ].join('\n'),
    hints: [
      'One pass, building an object as you go.',
      'The key is a property name held in a variable, so use bracket access.',
      'Assigning the same key twice naturally lets the later item win.',
    ],
    explanation:
      'This turns an O(n) `find` in a render loop into an O(1) lookup, which is the difference between a list of 20 and a list of 5,000 feeling the same. Two details are worth knowing: object keys are always strings, so a numeric id comes back as `"404"`, and a key of `"__proto__"` from untrusted data does not behave like an ordinary property. A `Map` avoids both, preserves insertion order and accepts any key type, which makes it the better default when the keys come from outside.',
  }),

  codeProblem({
    slug: 'code-truncate-words',
    title: 'Truncate without cutting a word',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Write `truncate(text, max)` returning `text` unchanged when it is `max` characters or fewer, and otherwise a cut-down version ending in a single `…`.',
      '',
      'The whole returned string must be at most `max` characters, and it must not end mid-word when a word boundary is available.'
    ),
    starter: 'function truncate(text, max) {\n  \n}',
    tests: [
      {
        name: 'leaves a short string alone',
        expression: "truncate('hello', 10)",
        expected: 'hello',
      },
      {
        name: 'leaves an exactly-max string alone',
        expression: "truncate('hello', 5)",
        expected: 'hello',
      },
      {
        name: 'cuts at a word boundary',
        expression: "truncate('the quick brown fox', 12)",
        expected: 'the quick…',
      },
      {
        name: 'never exceeds max',
        expression: "truncate('the quick brown fox', 12).length <= 12",
        expected: true,
      },
      {
        name: 'falls back to a hard cut with no boundary',
        expression: "truncate('supercalifragilistic', 6)",
        expected: 'super…',
      },
    ],
    reference: [
      'function truncate(text, max) {',
      '  if (text.length <= max) return text;',
      '  const slice = text.slice(0, max - 1);',
      "  const boundary = slice.lastIndexOf(' ');",
      '  const cut = boundary > 0 ? slice.slice(0, boundary) : slice;',
      "  return cut + '…';",
      '}',
    ].join('\n'),
    hints: [
      'The ellipsis counts towards the budget, so slice to `max - 1` first.',
      'Look backwards for the last space inside that slice.',
      'When there is no space, fall back to the hard cut rather than returning nothing.',
    ],
    explanation:
      'The interesting cases are the boundaries, as usual: exactly `max`, one over, and a single word longer than the budget. Forgetting that the ellipsis itself takes a character is the classic off-by-one here, and it only shows up when the caller is counting. Real text has more traps: `length` counts UTF-16 code units, so an emoji is 2 and a family emoji considerably more, and slicing blindly can split a surrogate pair into a replacement character. `Intl.Segmenter` is the correct tool when user-visible characters matter.',
  }),

  codeProblem({
    slug: 'code-safe-get',
    title: 'Read a nested path safely',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Write `get(object, path, fallback)` reading a dotted `path` like `"user.address.city"`.',
      '',
      'Return `fallback` when any step is missing or nullish. A stored `undefined` counts as missing; a stored `null`, `0`, `false` or `""` does not.'
    ),
    starter: 'function get(object, path, fallback) {\n  \n}',
    tests: [
      {
        name: 'reads a nested value',
        expression: "get({ user: { address: { city: 'Cork' } } }, 'user.address.city')",
        expected: 'Cork',
      },
      {
        name: 'falls back on a missing branch',
        expression: "get({ user: {} }, 'user.address.city', 'unknown')",
        expected: 'unknown',
      },
      {
        name: 'does not fall back on a falsy value',
        expression: "get({ count: 0 }, 'count', 99)",
        expected: 0,
      },
      {
        name: 'keeps a stored null',
        expression: "get({ a: { b: null } }, 'a.b', 'fallback')",
        expectedCode: 'null',
      },
      {
        name: 'handles a nullish root',
        expression: "get(null, 'a.b', 'fallback')",
        expected: 'fallback',
      },
      {
        name: 'reads a single segment',
        expression: "get({ a: 1 }, 'a')",
        expected: 1,
      },
    ],
    reference: [
      'function get(object, path, fallback) {',
      "  const parts = path.split('.');",
      '  let current = object;',
      '  for (const part of parts) {',
      '    if (current == null) return fallback;',
      '    current = current[part];',
      '  }',
      '  return current === undefined ? fallback : current;',
      '}',
    ].join('\n'),
    hints: [
      'Split the path and walk one segment at a time.',
      'Bail out as soon as the current value is null or undefined.',
      'Only substitute the fallback for `undefined` at the end, so a stored null survives.',
    ],
    explanation:
      'The distinction between "missing" and "falsy" is the whole exercise, and getting it wrong is how `0` and `""` silently turn into defaults. `== null` is the one place loose equality earns its keep: it matches `null` and `undefined` and nothing else. Optional chaining covers the same ground natively when the path is known at author time (`object?.user?.address?.city ?? fallback`), so this shape is only needed for a path that arrives as data, such as a column key in a configurable table.',
  }),

  codeProblem({
    slug: 'code-partition',
    title: 'Split a list in one pass',
    difficulty: 'easy',
    relevance: 'occasional',
    prompt: md(
      'Write `partition(items, predicate)` returning `[matching, notMatching]`.',
      '',
      'Both arrays keep the original order, and an empty input gives two empty arrays.'
    ),
    starter: 'function partition(items, predicate) {\n  \n}',
    tests: [
      {
        name: 'splits on the predicate',
        expression: 'partition([1, 2, 3, 4], (n) => n % 2 === 0)',
        expected: [
          [2, 4],
          [1, 3],
        ],
      },
      {
        name: 'keeps everything when all match',
        expression: 'partition([2, 4], (n) => n % 2 === 0)',
        expected: [[2, 4], []],
      },
      {
        name: 'handles an empty list',
        expression: 'partition([], () => true)',
        expected: [[], []],
      },
      {
        name: 'passes the index to the predicate',
        expression: 'partition([9, 9, 9], (_, i) => i === 1)',
        expected: [[9], [9, 9]],
      },
    ],
    reference: [
      'function partition(items, predicate) {',
      '  const yes = [];',
      '  const no = [];',
      '  items.forEach((item, index) => {',
      '    (predicate(item, index) ? yes : no).push(item);',
      '  });',
      '  return [yes, no];',
      '}',
    ].join('\n'),
    hints: [
      'Two arrays, one loop.',
      'Pick which array to push into rather than branching around two pushes.',
      'Pass the index through, the way the built-in array methods do.',
    ],
    explanation:
      'Two `filter` calls read fine and are usually fast enough, but they evaluate the predicate twice per item, which matters when it is expensive or has a side effect such as logging. The version that ternaries on the *target array* rather than the statement keeps the loop body to one line. Matching the built-in signature by passing the index is a small thing that makes a utility feel native and saves the caller reaching for a counter.',
  }),

  codeProblem({
    slug: 'code-once',
    title: 'Run it exactly once',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      'Write `once(fn)` returning a wrapped function that calls `fn` on the first invocation only, and returns that first result on every later call.',
      '',
      'Arguments from the first call are passed through. Later arguments are ignored.'
    ),
    starter: 'function once(fn) {\n  \n}',
    tests: [
      {
        name: 'calls through the first time',
        expression: 'once((n) => n * 2)(21)',
        expected: 42,
      },
      {
        name: 'returns the first result afterwards',
        expression: '(() => { const f = once((n) => n * 2); f(21); return f(1); })()',
        expected: 42,
      },
      {
        name: 'invokes the underlying function only once',
        expression:
          '(() => { let calls = 0; const f = once(() => { calls += 1; }); f(); f(); f(); return calls; })()',
        expected: 1,
      },
      {
        name: 'caches an undefined result too',
        expression:
          '(() => { let calls = 0; const f = once(() => { calls += 1; return undefined; }); f(); f(); return calls; })()',
        expected: 1,
      },
    ],
    reference: [
      'function once(fn) {',
      '  let called = false;',
      '  let result;',
      '  return function (...args) {',
      '    if (!called) {',
      '      called = true;',
      '      result = fn.apply(this, args);',
      '    }',
      '    return result;',
      '  };',
      '}',
    ].join('\n'),
    hints: [
      'The wrapper needs to remember both whether it ran and what it returned.',
      'A separate boolean is safer than checking whether the result is undefined.',
      'Set the flag before calling, so a throwing function cannot be retried into a second call.',
    ],
    explanation:
      'The `called` flag has to be separate from the cached value, or a function returning `undefined` runs every time, which is exactly the case for the initialisers this is usually wrapped around. Setting the flag before invoking is a deliberate choice: it means a throw does not leave the wrapper ready to run again, which matches "exactly once" but is worth documenting since some implementations prefer the opposite. Using `function` rather than an arrow, plus `apply`, keeps `this` working when the wrapped function is used as a method.',
  }),

  codeProblem({
    slug: 'code-sort-by-multiple',
    title: 'Sort by several keys',
    difficulty: 'medium',
    relevance: 'daily',
    prompt: md(
      'Write `sortBy(items, comparators)` where `comparators` is an array of functions, each returning a negative, zero or positive number.',
      '',
      'Use each in turn to break ties. Do not mutate the input array.'
    ),
    starter: 'function sortBy(items, comparators) {\n  \n}',
    tests: [
      {
        name: 'sorts by the first comparator',
        expression: 'sortBy([{ a: 2 }, { a: 1 }], [(x, y) => x.a - y.a]).map((o) => o.a)',
        expected: [1, 2],
      },
      {
        name: 'breaks ties with the second',
        expression:
          "sortBy([{ a: 1, b: 'z' }, { a: 1, b: 'a' }], [(x, y) => x.a - y.a, (x, y) => x.b.localeCompare(y.b)]).map((o) => o.b)",
        expected: ['a', 'z'],
      },
      {
        name: 'does not mutate the input',
        expression:
          '(() => { const input = [{ a: 2 }, { a: 1 }]; sortBy(input, [(x, y) => x.a - y.a]); return input[0].a; })()',
        expected: 2,
      },
      {
        name: 'handles no comparators',
        expression: 'sortBy([3, 1, 2], []).length',
        expected: 3,
      },
    ],
    reference: [
      'function sortBy(items, comparators) {',
      '  return [...items].sort((a, b) => {',
      '    for (const compare of comparators) {',
      '      const result = compare(a, b);',
      '      if (result !== 0) return result;',
      '    }',
      '    return 0;',
      '  });',
      '}',
    ].join('\n'),
    hints: [
      'Copy first, because `sort` mutates in place.',
      'Walk the comparators and return the first non-zero result.',
      'Returning 0 at the end means "tied on every key".',
    ],
    explanation:
      'Returning the first non-zero comparison is the whole trick, and it composes: reverse a direction by wrapping one comparator, add a key by pushing another. The copy matters because `sort` sorts in place and returns the same array, so sorting props or state directly is a mutation bug that often shows up as a list that will not rerender. `toSorted` does the copy for you where it is available. Sorting has been stable since ES2019, so items tied on every comparator keep their original relative order.',
  }),
];
