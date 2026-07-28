import { code, md, type ProblemDraft } from './types';

export const reactProblems: ProblemDraft[] = [
  {
    slug: 'react-functional-update',
    title: 'Two increments, one increase',
    category: 'react',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'Clicking this button increases the count by **1**, not 2:',
      '',
      code(
        'jsx',
        'const [count, setCount] = useState(0);',
        '',
        'function onClick() {',
        '  setCount(count + 1);',
        '  setCount(count + 1);',
        '}'
      ),
      '',
      'Rewrite the body so it increases by 2. (One line, used twice, is fine.)'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['setCount\\(\\s*\\(?\\s*\\w+\\s*\\)?\\s*=>\\s*\\w+\\s*\\+\\s*1\\s*\\)'],
      closeSubstrings: {
        setcount:
          'Right function. The argument needs to be a function of the previous value, not a number.',
      },
      hints: [
        '`count` is captured from the render that created this handler, so both calls compute the same number.',
        'The setter accepts a function that receives the latest queued value.',
        '`setCount((c) => c + 1);` twice.',
      ],
    },
    canonicalAnswer: 'setCount((c) => c + 1)',
    solution: code(
      'jsx',
      'function onClick() {',
      '  setCount((c) => c + 1);',
      '  setCount((c) => c + 1);',
      '}'
    ),
    explanation:
      '`count` is a **const captured by that render**: both calls read the same `0` and both queue "set it to 1", so the second overwrites the first. The functional form `setCount(c => c + 1)` receives the latest queued value instead of the captured one, so the two updates compose. The rule of thumb: whenever the next state is derived from the previous state, use the updater function. React batches these updates and applies them in order at the end of the event.',
  },

  {
    slug: 'react-index-key',
    title: 'Why index keys break lists',
    category: 'react',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'A reviewer flags this in a list where rows can be reordered and deleted:',
      '',
      code('jsx', '{items.map((item, i) => <Row key={i} item={item} />)}'),
      '',
      'Explain what goes wrong and what the key should be.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'identity',
            'identif',
            'which',
            'reorder',
            'reuse',
            'wrong',
            'match',
            'position',
          ],
          missingFeedback: 'What does React use the key for when the list changes?',
        },
        {
          synonyms: ['state', 'input', 'focus', 'stale', 'dom'],
          missingFeedback: 'Name a concrete symptom: what gets attached to the wrong row?',
        },
        {
          synonyms: ['id', 'stable', 'unique'],
          missingFeedback: 'What should the key be instead?',
        },
      ],
      hints: [
        'Keys tell React which element in the new list corresponds to which in the old one.',
        'If you delete the first item, every remaining item changes index. React thinks they all changed.',
        'Component state and DOM state (like an input value or focus) stay with the index and end up on the wrong row.',
      ],
    },
    canonicalAnswer:
      'React uses the key to match elements between renders. With an index key, deleting or reordering shifts every index, so React reuses the wrong DOM nodes and component state. An input value or focus ends up on the wrong row. Use a stable unique id from the data instead.',
    solution: code('jsx', '{items.map((item) => <Row key={item.id} item={item} />)}'),
    explanation:
      'A key is React\'s **identity** for an element across renders: same key means "this is the same thing, update it", different key means "unmount and remount". Indexes are positional, so removing the first item renumbers everything and React happily reuses row 0\'s DOM node and state for what is now a different record. Half-typed inputs, checkbox states and focus all move to the wrong row. A stable id from the data fixes it. Index keys are only safe for a list that is static, never reordered and never filtered.',
  },

  {
    slug: 'react-effect-cleanup',
    title: 'Clean up an effect',
    category: 'react',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'This subscribes on every mount but the app leaks listeners over time:',
      '',
      code('jsx', 'useEffect(() => {', "  window.addEventListener('resize', onResize);", '}, []);'),
      '',
      'What is missing, and when does React run that missing piece?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['cleanup', 'clean up', 'return', 'removeeventlistener', 'unsubscribe'],
          missingFeedback: 'What should the effect return?',
        },
        {
          synonyms: ['unmount', 'before', 're-run', 'rerun', 'again', 'next'],
          missingFeedback:
            'When does React invoke the cleanup? Say at least one of the two moments.',
        },
      ],
      hints: [
        'An effect can return a function.',
        'React calls that function on unmount, and also before re-running the effect.',
        "`return () => window.removeEventListener('resize', onResize);`",
      ],
    },
    canonicalAnswer:
      'The effect must return a cleanup function that removes the listener. React calls it when the component unmounts, and also before re-running the effect when its dependencies change.',
    solution: code(
      'jsx',
      'useEffect(() => {',
      "  window.addEventListener('resize', onResize);",
      "  return () => window.removeEventListener('resize', onResize);",
      '}, []);'
    ),
    explanation:
      'Whatever an effect returns is its **cleanup**, and React runs it in two situations: before the effect re-runs because a dependency changed, and when the component unmounts. Skipping it leaks listeners, timers, subscriptions and in-flight requests. In development, StrictMode deliberately mounts, unmounts and remounts every component once, precisely so a missing cleanup shows up immediately as a doubled subscription rather than in production weeks later.',
  },

  {
    slug: 'react-derived-state',
    title: 'Copying props into state',
    category: 'react',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'A component receives `items` as a prop and does this:',
      '',
      code('jsx', 'const [sorted, setSorted] = useState(sortItems(items));'),
      '',
      'It shows stale data when `items` changes. Explain why, and what to do instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['initial', 'first render', 'only once', 'ignored', 'never updates', 'once'],
          missingFeedback: 'When is the argument to useState actually used?',
        },
        {
          synonyms: [
            'during render',
            'derive',
            'calculate',
            'compute',
            'usememo',
            'just compute',
            'no state',
          ],
          missingFeedback: 'What should you do instead of storing it in state?',
        },
      ],
      hints: [
        'The argument to `useState` is only the *initial* value.',
        'On later renders React ignores it entirely and keeps the stored state.',
        'Anything derivable from props should be computed during render, not mirrored into state.',
      ],
    },
    canonicalAnswer:
      'The argument to useState is only the initial value. React ignores it on every later render, so the state keeps the first sort forever. Derive it during render instead: const sorted = sortItems(items), wrapped in useMemo only if the sort is genuinely expensive.',
    solution: code(
      'jsx',
      '// Just derive it:',
      'const sorted = sortItems(items);',
      '',
      '// Only if profiling shows the sort is expensive:',
      'const sorted = useMemo(() => sortItems(items), [items]);'
    ),
    explanation:
      '`useState(initial)` uses its argument **only on the first render**; afterwards React returns the stored value and the expression is discarded (though still evaluated, so it also wastes work). Mirroring props into state creates two sources of truth that drift apart. The fix is to derive during render. Cheap, always correct, impossible to desynchronise. Reach for `useMemo` only when the computation is measurably expensive, and remember it is a performance hint, not a correctness guarantee.',
  },

  {
    slug: 'react-effect-object-dep',
    title: 'An effect that loops forever',
    category: 'react',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'This fires an infinite request loop:',
      '',
      code(
        'jsx',
        'const options = { pageSize: 20 };',
        '',
        'useEffect(() => {',
        '  fetchData(options);',
        '}, [options]);'
      ),
      '',
      'Explain the cause and give a fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'new object',
            'recreated',
            'every render',
            'new reference',
            'identity',
            'reference',
          ],
          missingFeedback: 'What is different about `options` on each render?',
        },
        {
          synonyms: ['object.is', 'reference', 'shallow', 'compares', 'equality', '==='],
          missingFeedback: 'How does React compare dependencies?',
        },
        {
          synonyms: ['usememo', 'move', 'outside', 'primitive', 'pagesize', 'destructure'],
          missingFeedback: 'Name a fix. Hoist it, memoise it, or depend on the primitive instead.',
        },
      ],
      hints: [
        'The object literal is rebuilt on every render.',
        'React compares deps with `Object.is`, which is reference equality for objects.',
        'So the dep always looks new → effect runs → setState → render → new object → …',
      ],
    },
    canonicalAnswer:
      'The object literal is recreated on every render, and React compares dependencies by reference with Object.is, so the dep always looks changed and the effect re-runs forever. Fix it by hoisting the constant object outside the component, memoising it with useMemo, or depending on the primitive [options.pageSize] instead.',
    solution: code(
      'jsx',
      '// Best: it never changes, so hoist it out of the component',
      'const OPTIONS = { pageSize: 20 };',
      '',
      '// Or depend on the primitive',
      'useEffect(() => {',
      '  fetchData({ pageSize });',
      '}, [pageSize]);'
    ),
    explanation:
      'React compares each dependency with `Object.is`, which for objects, arrays and functions means **reference** equality, and a literal written inside the component body is a brand-new reference every render. The effect therefore re-runs, sets state, triggers a render, creates another object, and loops. The fixes in order of preference: hoist truly constant values out of the component, depend on primitives rather than the object wrapping them, or `useMemo`/`useCallback` when the value genuinely depends on props.',
  },

  {
    slug: 'react-controlled-input',
    title: 'A read-only input',
    category: 'react',
    difficulty: 'easy',
    type: 'explain',
    prompt: md(
      'Typing in this field does nothing:',
      '',
      code('jsx', 'const [name, setName] = useState("");', '', '<input value={name} />'),
      '',
      'Explain why and what is missing.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['onchange', 'oninput', 'handler'],
          missingFeedback: 'Which prop is missing?',
        },
        {
          synonyms: [
            'controlled',
            'state',
            'setname',
            'source of truth',
            'never changes',
            'state is',
          ],
          missingFeedback:
            'Explain the controlled-input contract: what drives the displayed value?',
        },
      ],
      hints: [
        'A `value` prop makes the input **controlled**: React owns what is displayed.',
        'Every keystroke re-renders with the same state, so the old value is put straight back.',
        'You need `onChange={(e) => setName(e.target.value)}` to feed the state.',
      ],
    },
    canonicalAnswer:
      'Passing value makes it a controlled input, so React always renders the state value; without an onChange handler the state never updates and each keystroke is immediately overwritten. Add onChange={(e) => setName(e.target.value)}.',
    solution: code('jsx', '<input value={name} onChange={(e) => setName(e.target.value)} />'),
    explanation:
      'A **controlled** input takes its displayed value from React state, so the DOM is re-synchronised on every render. Without an `onChange` that writes back to state, your keystroke is replaced by the unchanged state value and the field appears frozen. React warns about exactly this in development. The alternatives are `defaultValue` for an uncontrolled field (the DOM owns the value; read it with a ref) or `readOnly` if you genuinely want it non-editable.',
  },

  {
    slug: 'react-ref-vs-state',
    title: 'useRef versus useState',
    category: 'react',
    difficulty: 'medium',
    type: 'explain',
    prompt: md(
      'You need to keep a mutable value across renders. An interval id, but changing it should **not** re-render.',
      '',
      'Which hook, and what is the key behavioural difference from the other one?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['useref'],
          missingFeedback: 'Name the hook.',
        },
        {
          synonyms: ['re-render', 'rerender', 're render', 'render'],
          missingFeedback: 'State the difference in terms of rendering.',
        },
        {
          synonyms: ['.current', 'current'],
          missingFeedback: 'How do you read and write the value it holds?',
        },
      ],
      hints: [
        'One hook stores a value that survives renders without triggering them.',
        '`useRef` returns a stable object; you mutate `ref.current`.',
        'Changing `ref.current` never schedules a render. That is the whole point.',
      ],
    },
    canonicalAnswer:
      'useRef. It returns a stable mutable object whose .current you read and write, and changing it does not trigger a re-render, unlike useState which schedules one on every update.',
    solution: code(
      'jsx',
      'const timerRef = useRef(null);',
      '',
      'useEffect(() => {',
      '  timerRef.current = setInterval(tick, 1000);',
      '  return () => clearInterval(timerRef.current);',
      '}, []);'
    ),
    explanation:
      '`useRef` returns the **same object** on every render, and mutating `.current` neither schedules a render nor is tracked by React, which makes it the right home for timer ids, previous values, and anything the UI does not display. `useState` is for values the UI depends on; updating it re-renders. The corollary: never read or write `ref.current` during render, because React has no way to know it changed and your output would be inconsistent. Refs also hold DOM nodes when passed as the `ref` prop.',
  },

  {
    slug: 'react-lifting-state',
    title: 'Where should the state live?',
    category: 'react',
    difficulty: 'easy',
    type: 'short-text',
    prompt: md(
      'Two sibling components need to read and update the same filter value.',
      '',
      'What is the standard React name for the refactor that puts the state where both can reach it?'
    ),
    graderConfig: {
      accept: [
        'lifting state up',
        'lift state up',
        'lifting state',
        'lift the state up',
        'lifting the state up',
        'state lifting',
      ],
      acceptPatterns: ['lift(ing)?\\s+(the\\s+)?state(\\s+up)?'],
      nearMisses: {
        context:
          'Context is one way to distribute it, but the refactor itself has a specific name.',
        redux: 'A store is one option, but the built-in answer has a specific name.',
        'prop drilling':
          'Prop drilling is the *consequence* people complain about, not the refactor.',
      },
      hints: [
        'The state moves to the closest common ancestor.',
        'Three words, the first is a verb ending in -ing.',
      ],
    },
    canonicalAnswer: 'lifting state up',
    solution: md(
      '**Lifting state up**: move the state into the closest common parent and pass the value down as a prop plus a setter (or a callback) back up.',
      '',
      code(
        'jsx',
        'function Parent() {',
        "  const [filter, setFilter] = useState('');",
        '  return (',
        '    <>',
        '      <FilterInput value={filter} onChange={setFilter} />',
        '      <ResultList filter={filter} />',
        '    </>',
        '  );',
        '}'
      )
    ),
    explanation:
      'Lifting state up puts the shared value in the closest common ancestor, making that component the single source of truth while the children become controlled and stateless. Easier to test and reuse. Do it *only as far as necessary*: hoisting state higher than it needs to be re-renders a larger subtree and makes components harder to move. When the distance becomes genuinely painful, that is the signal to reach for Context or a store, not before.',
  },

  {
    slug: 'react-stale-closure',
    title: 'A stale value inside an interval',
    category: 'react',
    difficulty: 'hard',
    type: 'explain',
    prompt: md(
      'This logs `0` forever, no matter how much `count` increases:',
      '',
      code(
        'jsx',
        'const [count, setCount] = useState(0);',
        '',
        'useEffect(() => {',
        '  const id = setInterval(() => console.log(count), 1000);',
        '  return () => clearInterval(id);',
        '}, []);'
      ),
      '',
      'Explain the mechanism and give a fix.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['closure', 'captur', 'closes over', 'snapshot', 'first render'],
          missingFeedback: 'What did the callback capture, and from when?',
        },
        {
          synonyms: ['empty', '[]', 'dependen', 'never re-run', 'never rerun', 'only once'],
          missingFeedback: 'Why is the effect never refreshed with a newer value?',
        },
        {
          synonyms: [
            'ref',
            'add count',
            'dependency array',
            'updater',
            'functional',
            'include count',
          ],
          missingFeedback:
            'Give a fix. Add the dependency, use a ref, or use the functional updater.',
        },
      ],
      hints: [
        'Each render creates a new `count` const and a new callback closing over it.',
        'With `[]`, the effect and its callback are created once, on the first render, where `count` was 0.',
        'Fix by adding `count` to the deps (re-creating the interval), or keep the latest value in a ref.',
      ],
    },
    canonicalAnswer:
      'The interval callback closes over the count from the first render, and the empty dependency array means the effect never re-runs, so that stale snapshot of 0 lives forever. Fix it by adding count to the dependency array so the interval is recreated, by keeping the latest value in a ref, or by using the functional updater form if you only need to update state.',
    solution: code(
      'jsx',
      '// Option 1. Re-create the interval when count changes',
      'useEffect(() => {',
      '  const id = setInterval(() => console.log(count), 1000);',
      '  return () => clearInterval(id);',
      '}, [count]);',
      '',
      '// Option 2. Keep the latest value in a ref, interval stays stable',
      'const countRef = useRef(count);',
      'useEffect(() => { countRef.current = count; }, [count]);',
      'useEffect(() => {',
      '  const id = setInterval(() => console.log(countRef.current), 1000);',
      '  return () => clearInterval(id);',
      '}, []);'
    ),
    explanation:
      "Every render creates fresh consts and fresh closures over them; the interval callback created on the first render permanently sees that render's `count` of `0`. The empty dependency array is what makes it permanent. The effect never re-runs, so no newer closure is ever installed. This is the **stale closure**, the most common React bug after key misuse. Adding the dependency is the honest fix; a ref is the right call when you want a stable subscription that still reads current values.",
  },

  {
    slug: 'react-memo-when',
    title: 'When useMemo actually helps',
    category: 'react',
    difficulty: 'hard',
    type: 'explain',
    prompt: md(
      'A colleague wraps every computed value in `useMemo`, including `const total = a + b;`.',
      '',
      'Explain why that is not free, and name a case where `useMemo` genuinely matters.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['cost', 'overhead', 'not free', 'memory', 'compar', 'slower', 'expense'],
          missingFeedback: 'What does useMemo itself cost on every render?',
        },
        {
          synonyms: [
            'expensive',
            'reference',
            'identity',
            'dependency',
            'memo',
            'stable',
            'effect',
          ],
          missingFeedback:
            'Name a case where it does matter. Expensive work, or a stable reference for a dep/memo child.',
        },
      ],
      hints: [
        '`useMemo` stores the value and the deps, and compares the deps on every render.',
        'For `a + b` the bookkeeping costs more than the addition.',
        'It earns its keep for genuinely expensive computations, or to keep a stable reference for a dependency array or a `React.memo` child.',
      ],
    },
    canonicalAnswer:
      'useMemo is not free. It allocates, stores the deps and compares them on every render, which for a + b costs more than just doing the addition. It matters for genuinely expensive computations, and for keeping a stable object or function reference so that a dependency array or a React.memo child does not see a new value every render.',
    solution: code(
      'jsx',
      '// Not worth it',
      'const total = useMemo(() => a + b, [a, b]);',
      'const total = a + b; // just do this',
      '',
      '// Worth it. Expensive work',
      'const parsed = useMemo(() => parseHugeCsv(text), [text]);',
      '',
      '// Worth it. Stable reference for a memoised child or a dep array',
      'const config = useMemo(() => ({ pageSize }), [pageSize]);'
    ),
    explanation:
      'Every `useMemo` allocates a closure, stores the dependency array and runs a comparison on each render, so for trivial arithmetic the bookkeeping is more expensive than recomputing. It pays off in two situations: the computation is genuinely costly, or you need a **stable reference** so a dependency array or a `React.memo` child does not see a new object every render. Treat it as a targeted fix after measuring, not a default, and note the React Compiler is designed to make most manual memoisation unnecessary.',
  },

  {
    slug: 'react-fetch-race',
    title: 'Out-of-order fetch results',
    category: 'react',
    difficulty: 'hard',
    type: 'explain',
    prompt: md(
      'A search box fetches on every keystroke. Occasionally the results for an older query overwrite a newer one.',
      '',
      code(
        'jsx',
        'useEffect(() => {',
        '  fetch(`/api/search?q=${query}`)',
        '    .then((r) => r.json())',
        '    .then(setResults);',
        '}, [query]);'
      ),
      '',
      'Explain the bug and how the effect cleanup fixes it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'race',
            'out of order',
            'order',
            'slower',
            'earlier',
            'stale response',
            'later',
          ],
          missingFeedback: 'Name the class of bug: what is not guaranteed about response order?',
        },
        {
          synonyms: ['cleanup', 'return', 'abort', 'cancel', 'ignore', 'flag'],
          missingFeedback: 'What does the effect need to return, and what does it do?',
        },
      ],
      hints: [
        'Responses can arrive in a different order than the requests were sent.',
        'A slow request for "ab" can land after a fast one for "abc".',
        'Return a cleanup that either aborts the request or sets an `ignore` flag so the stale `setResults` is skipped.',
      ],
    },
    canonicalAnswer:
      'It is a race condition: responses are not guaranteed to arrive in request order, so a slow earlier request can resolve after a newer one and overwrite it. Return a cleanup function from the effect that sets an ignore flag (or aborts via an AbortController), so a response from a superseded render never calls setResults.',
    solution: code(
      'jsx',
      'useEffect(() => {',
      '  const controller = new AbortController();',
      '  fetch(`/api/search?q=${query}`, { signal: controller.signal })',
      '    .then((r) => r.json())',
      '    .then(setResults)',
      "    .catch((e) => { if (e.name !== 'AbortError') throw e; });",
      '',
      '  return () => controller.abort();',
      '}, [query]);'
    ),
    explanation:
      "Nothing guarantees that HTTP responses arrive in the order the requests were sent, so a slow request for `ab` can land after a fast one for `abc` and clobber the newer results. React runs the cleanup **before** re-running the effect, which gives you exactly the hook you need to invalidate the superseded request. Either `controller.abort()` (which also stops the network work) or a simple `let ignore = false` flag checked before calling `setResults`. This is the canonical example in React's own docs, and the reason data-fetching libraries exist.",
  },

  {
    slug: 'react-list-fragment-key',
    title: 'Key on a fragment',
    category: 'react',
    difficulty: 'medium',
    type: 'short-text',
    prompt: md(
      'You need to render two sibling elements per item, so the shorthand `<>…</>` cannot take a key:',
      '',
      code(
        'jsx',
        '{rows.map((row) => (',
        '  <??? key={row.id}>',
        '    <dt>{row.term}</dt>',
        '    <dd>{row.def}</dd>',
        '  </???>',
        '))}'
      ),
      '',
      'What do you write instead of the shorthand?'
    ),
    graderConfig: {
      accept: ['react.fragment', '<react.fragment>', 'fragment'],
      acceptPatterns: ['React\\.Fragment'],
      nearMisses: {
        div: 'A wrapper div would break the <dl> structure. You need something that renders nothing.',
        '<>': 'The shorthand is exactly what cannot take a key. You need the long form.',
      },
      hints: [
        'The shorthand `<>` accepts no props at all, including `key`.',
        'There is a long form of the same component.',
        '`<React.Fragment key={…}>`',
      ],
    },
    canonicalAnswer: 'React.Fragment',
    solution: code(
      'jsx',
      '{rows.map((row) => (',
      '  <React.Fragment key={row.id}>',
      '    <dt>{row.term}</dt>',
      '    <dd>{row.def}</dd>',
      '  </React.Fragment>',
      '))}'
    ),
    explanation:
      'The `<>…</>` shorthand is syntax sugar that accepts **no** props, so any list of fragments needs the explicit `<React.Fragment key={…}>` form. This matters most inside elements with strict content models like `<dl>`, `<table>` and `<select>`, where inserting a wrapper `<div>` would produce invalid HTML and break styling. A fragment groups children without emitting a DOM node of its own.',
  },
];
