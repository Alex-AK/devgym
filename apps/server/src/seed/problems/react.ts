import { code, md, type ProblemDraft } from './types';

export const reactProblems: ProblemDraft[] = [
  {
    slug: 'react-functional-update',
    title: 'Two increments, one increase',
    category: 'react',
    difficulty: 'easy',
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'daily',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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
    relevance: 'occasional',
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

  {
    slug: 'react-unnecessary-effect',
    title: 'The effect that should not exist',
    category: 'react',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This keeps a filtered list in state:',
      '',
      code(
        'jsx',
        'const [visible, setVisible] = useState([]);',
        'useEffect(() => {',
        '  setVisible(items.filter((i) => i.name.includes(query)));',
        '}, [items, query]);'
      ),
      '',
      'Explain what is wrong with it and what to do instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['derive', 'calculate', 'compute', 'during render', 'render time', 'just a'],
          missingFeedback: 'What should happen to a value you can work out from props and state?',
        },
        {
          synonyms: [
            'extra render',
            'twice',
            'second render',
            'double',
            'render pass',
            'wasted',
            'flash',
            'stale',
          ],
          missingFeedback: 'What does the effect cost at runtime?',
        },
        {
          synonyms: ['usememo', 'const visible', 'no state', 'remove the state', 'plain variable'],
          missingFeedback: 'What replaces it?',
        },
      ],
      hints: [
        'Ask whether `visible` is really state, or just a calculation.',
        'The effect runs after paint, so React renders once with the old list and again with the new.',
        'Compute it during render, and only reach for useMemo if it is genuinely expensive.',
      ],
    },
    canonicalAnswer:
      'The filtered list is not state, it is derived from items and query, so it should be calculated during render rather than stored. Keeping it in an effect means every change renders twice, once with the stale list and again after the effect sets state, which wastes work and can flash the old content. Replace it with a plain const, wrapped in useMemo only if the filtering is genuinely expensive.',
    solution: code(
      'jsx',
      'const visible = items.filter((i) => i.name.includes(query));',
      '',
      '// only if profiling says the filter is hot',
      'const visible = useMemo(',
      '  () => items.filter((i) => i.name.includes(query)),',
      '  [items, query]',
      ');'
    ),
    explanation:
      'The question to ask of any piece of state is whether you could work it out from something you already have. If you can, it is not state, and storing it creates two sources of truth that can disagree. The effect version also renders twice per change, and between the two renders the UI shows the previous result. Effects are for synchronising with something **outside** React: the network, the DOM, a subscription, a timer. Filtering an array is none of those.',
  },

  {
    slug: 'react-context-value-identity',
    title: 'The context that rerenders everything',
    category: 'react',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Every consumer of this context rerenders on every render of the provider, even when neither value changed:',
      '',
      code('jsx', '<AuthContext.Provider value={{ user, signOut }}>'),
      '',
      'Name the hook that fixes the value.'
    ),
    graderConfig: {
      accept: ['usememo', 'usememo()', 'react.usememo'],
      acceptPatterns: ['useMemo'],
      nearMisses: {
        usecallback: 'useCallback is for the function. The whole object literal is the problem.',
        memo: 'React.memo on the consumers cannot help: the context value itself is new each time.',
      },
      hints: [
        'The object literal is a new object on every render.',
        'Context compares by identity, so a new object means every consumer is stale.',
        '`useMemo(() => ({ user, signOut }), [user, signOut])`',
      ],
    },
    canonicalAnswer: 'useMemo',
    solution: code(
      'jsx',
      'const value = useMemo(() => ({ user, signOut }), [user, signOut]);',
      'return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;'
    ),
    explanation:
      'Context propagates by reference identity, so `{ user, signOut }` written inline is a brand new object every render and every consumer is told the value changed. `React.memo` on the consumers does not help, because context updates bypass it. Memoise the value, and make sure the functions inside it are stable too, usually via `useCallback` or by defining them outside the component. If a context holds several unrelated values that change at different rates, splitting it into two contexts is often better than memoising harder.',
  },

  {
    slug: 'react-reset-state-key',
    title: 'Resetting a component for a new record',
    category: 'react',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'An edit form keeps the previous user’s draft when you switch to a different user, because the state outlives the prop change.',
      '',
      'Name the React feature that gives the component a clean slate per user, without an effect.'
    ),
    graderConfig: {
      accept: ['key', 'the key prop', 'key prop'],
      acceptPatterns: ['\\bkey\\b'],
      nearMisses: {
        useeffect:
          'An effect that resets state works, but it renders once with the stale draft first.',
        usestate: 'The state itself is not the mechanism. Something has to tell React to remount.',
      },
      hints: [
        'React reuses a component instance while its position and type stay the same.',
        'Changing one special prop makes React discard the instance and mount a fresh one.',
        '`<UserForm key={user.id} …/>`',
      ],
    },
    canonicalAnswer: 'key',
    solution: code('jsx', '<UserForm key={user.id} user={user} />'),
    explanation:
      'A changed `key` tells React the element is a different thing, so it unmounts the old instance and mounts a new one with fresh state. That is the idiomatic reset, and it is instantaneous: no render with the stale draft, no effect, no manual clearing of six fields. It is the same mechanism that makes keys matter in lists, applied deliberately. Use it sparingly and on the smallest subtree that needs resetting, because remounting also throws away scroll position, focus and any uncommitted work inside.',
  },

  {
    slug: 'react-hooks-conditional',
    title: 'Why hooks cannot go in an if',
    category: 'react',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This throws "Rendered fewer hooks than expected":',
      '',
      code('jsx', 'if (!user) return <Login />;', 'const [tab, setTab] = useState("profile");'),
      '',
      'Explain why the order matters and how to fix it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['order', 'call order', 'index', 'position', 'sequence', 'same order'],
          missingFeedback: 'How does React match a hook call to its stored state?',
        },
        {
          synonyms: ['early return', 'conditional', 'skipped', 'not called', 'if', 'fewer'],
          missingFeedback: 'What does the early return do to that?',
        },
        {
          synonyms: ['move', 'top', 'before', 'above', 'unconditional', 'always call'],
          missingFeedback: 'What is the fix?',
        },
      ],
      hints: [
        'React does not know the names of your hooks, only the order they were called in.',
        'An early return means the second render calls fewer hooks than the first.',
        'Call every hook unconditionally at the top, then return early.',
      ],
    },
    canonicalAnswer:
      'React matches each hook call to its stored state by call order, not by name, so the sequence has to be identical on every render. The early return skips the useState on some renders, so the counts no longer line up and React throws. Move every hook above the conditional so they are always called, and put the early return after them.',
    solution: code(
      'jsx',
      'const [tab, setTab] = useState("profile");',
      'if (!user) return <Login />;'
    ),
    explanation:
      'Hooks are stored in a list per component instance and read back positionally on each render, which is what makes the terse `useState` API possible without any identifier. Everything follows from that: no hooks in conditionals, loops, or after an early return. When a hook genuinely should not run, the fix is usually to move the condition **inside** it (an effect that returns early, a query with `enabled: false`) or to split the component in two so the parent decides which child to render.',
  },

  {
    slug: 'react-error-boundary',
    title: 'Catching a render error',
    category: 'react',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A `try/catch` around a component’s JSX does not stop a child’s render error from blanking the whole app.',
      '',
      'Name what does catch it, and one class of error it still will not catch.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['error boundary', 'boundary', 'componentdidcatch', 'getderivedstatefromerror'],
          missingFeedback: 'What catches a render error in React?',
        },
        {
          synonyms: [
            'event handler',
            'async',
            'promise',
            'settimeout',
            'server',
            'ssr',
            'outside render',
            'callback',
          ],
          missingFeedback: 'Name something it does not catch.',
        },
      ],
      hints: [
        'It has to be a component above the failing one in the tree.',
        'It is still a class component, or a library wrapper around one.',
        'Errors thrown outside rendering, such as in an event handler or a promise, are not caught.',
      ],
    },
    canonicalAnswer:
      'An error boundary catches it: a component implementing getDerivedStateFromError or componentDidCatch, placed above the failing component in the tree, which renders a fallback instead of the crashed subtree. It does not catch errors thrown in event handlers, in async code such as a setTimeout or a rejected promise, or in the boundary itself, because those do not happen during rendering.',
    solution: code(
      'jsx',
      'class ErrorBoundary extends React.Component {',
      '  state = { error: null };',
      '  static getDerivedStateFromError(error) {',
      '    return { error };',
      '  }',
      '  componentDidCatch(error, info) {',
      '    report(error, info.componentStack);',
      '  }',
      '  render() {',
      '    return this.state.error ? this.props.fallback : this.props.children;',
      '  }',
      '}'
    ),
    explanation:
      'A `try/catch` cannot help because the child’s render does not happen inside the parent’s call stack: React calls each component itself. Error boundaries hook into React’s own rendering, which is why they remain the one thing that still requires a class. Place them deliberately, one per meaningful region, so a failing widget takes down a card rather than the page. For the gaps, handle rejections where they happen and use `window.onerror` and `unhandledrejection` as a global net.',
  },

  {
    slug: 'react-optimistic-update',
    title: 'Updating before the server replies',
    category: 'react',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A "like" button waits for the round trip before filling in, and feels sluggish on a slow connection.',
      '',
      'Name the pattern that fixes the feel, and the two things it obliges you to handle.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['optimistic', 'optimism'],
          missingFeedback: 'Name the pattern.',
        },
        {
          synonyms: ['rollback', 'revert', 'undo', 'restore', 'roll back', 'previous'],
          missingFeedback: 'What has to happen if the request fails?',
        },
        {
          synonyms: [
            'error',
            'tell the user',
            'message',
            'toast',
            'inform',
            'reconcile',
            'server value',
            'refetch',
            'truth',
          ],
          missingFeedback: 'What else does a failure require?',
        },
      ],
      hints: [
        'Update the UI immediately and assume it will succeed.',
        'That assumption is sometimes wrong.',
        'You need to roll back and tell the user, then reconcile with what the server actually says.',
      ],
    },
    canonicalAnswer:
      'An optimistic update: apply the change to local state immediately and send the request in the background. If it fails you have to roll back to the previous value rather than leaving a lie on screen, and you have to tell the user it failed instead of failing silently. When it succeeds, reconcile with the value the server returns, since it is the source of truth and may differ from your guess.',
    solution: code(
      'jsx',
      'const [liked, setLiked] = useState(post.liked);',
      '',
      'async function toggle() {',
      '  const previous = liked;',
      '  setLiked(!previous); // optimistic',
      '  try {',
      '    const result = await api.setLiked(post.id, !previous);',
      '    setLiked(result.liked); // reconcile with the server',
      '  } catch {',
      '    setLiked(previous); // roll back',
      "    toast('Could not save your like');",
      '  }',
      '}'
    ),
    explanation:
      'Optimistic updates trade correctness-for-a-moment against a UI that feels instant, and they are worth it for small, high-frequency, low-stakes actions: likes, checkboxes, reordering. They are a poor fit for anything the user would be upset to see reversed, such as a payment. The two obligations are what separates the pattern from a bug: silent rollback confuses people, and no rollback at all leaves the screen disagreeing with the database until the next reload. React’s `useOptimistic` and the mutation helpers in data libraries encode this shape for you.',
  },

  {
    slug: 'react-state-object-mutation',
    title: 'The state update that did nothing',
    category: 'react',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The component does not rerender:',
      '',
      code(
        'jsx',
        'const [user, setUser] = useState({ name: "Ada", tier: "free" });',
        '',
        'user.tier = "pro";',
        'setUser(user);'
      ),
      '',
      'In one word, what did this update fail to do?'
    ),
    graderConfig: {
      accept: [
        'copy',
        'clone',
        'create a new object',
        'new object',
        'a new reference',
        'new reference',
        'immutably',
      ],
      acceptPatterns: [
        'new (object|reference|copy)',
        '\\bcopy\\b',
        '\\bclone\\b',
        'immutab',
        'spread',
      ],
      nearMisses: {
        rerender: 'That is the symptom. The question is what the update itself failed to do.',
      },
      hints: [
        'React compares the previous and next state with Object.is.',
        'Mutating and passing the same object means the comparison says nothing changed.',
        'Create a new object instead of editing the old one.',
      ],
    },
    canonicalAnswer: 'create a new object',
    solution: code('jsx', 'setUser({ ...user, tier: "pro" });'),
    explanation:
      'React bails out of a rerender when the next state is `Object.is`-equal to the current one, and a mutated object is still the same object. Spreading gives a new reference, which is what signals the change. Nested updates need the same treatment at every level you touch, which is where it becomes tedious and where a helper like Immer earns its place. The same identity rule drives `React.memo`, `useMemo` dependency arrays and context propagation, so learning it once pays off everywhere.',
  },

  {
    slug: 'react-list-state-index',
    title: 'Updating one row in a list',
    category: 'react',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Toggling one todo currently does this, and the list never updates:',
      '',
      code('jsx', 'todos[index].done = !todos[index].done;', 'setTodos(todos);'),
      '',
      'Name the array method that produces the correct new array.'
    ),
    graderConfig: {
      accept: ['map', 'map()', '.map', 'array.map'],
      acceptPatterns: ['\\.?\\bmap\\b'],
      nearMisses: {
        foreach: 'forEach returns nothing, so there is no new array to set.',
        splice: 'splice mutates in place, which is the problem here.',
        filter: 'filter removes items. You want to replace one.',
      },
      hints: [
        'You need a new array containing a new object for the row that changed.',
        'The other rows can keep their identity, which helps memoised children.',
        '`todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))`',
      ],
    },
    canonicalAnswer: 'map',
    solution: code(
      'jsx',
      'setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));'
    ),
    explanation:
      '`map` gives a new array, and returning the untouched items by reference means only the changed row has a new identity, so memoised rows elsewhere in the list skip rerendering. Matching on a stable `id` rather than an index also survives sorting and filtering, which an index does not. The immutable equivalents for the other operations are `filter` to remove, spread or `toSpliced` to insert, and `toSorted`/`toReversed` for the sorts that used to mutate.',
  },

  {
    slug: 'react-abort-on-unmount',
    title: 'Setting state after unmount',
    category: 'react',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A fetch resolves after the user navigates away, and the update lands on a component that no longer exists:',
      '',
      code(
        'jsx',
        'useEffect(() => {',
        '  fetch(url).then((r) => r.json()).then(setData);',
        '}, [url]);'
      ),
      '',
      'Name what the effect is missing.'
    ),
    graderConfig: {
      accept: [
        'cleanup',
        'cleanup function',
        'a cleanup function',
        'abortcontroller',
        'abort controller',
        'cancellation',
      ],
      acceptPatterns: ['clean-?up', 'AbortController', 'cancel'],
      nearMisses: {
        'ismounted flag':
          'A mounted flag silences the symptom but still lets the request run to completion.',
      },
      hints: [
        'The effect starts something that outlives it.',
        'An effect can return a function that runs before the next run and on unmount.',
        'Return a cleanup that aborts the request.',
      ],
    },
    canonicalAnswer: 'a cleanup function',
    solution: code(
      'jsx',
      'useEffect(() => {',
      '  const controller = new AbortController();',
      '  fetch(url, { signal: controller.signal })',
      '    .then((r) => r.json())',
      '    .then(setData)',
      '    .catch((err) => {',
      "      if (err.name !== 'AbortError') setError(err);",
      '    });',
      '  return () => controller.abort();',
      '}, [url]);'
    ),
    explanation:
      'Anything an effect starts, it owns: a request, a subscription, a timer, a listener. The cleanup runs before the next effect and on unmount, which handles both navigation and a rapidly changing `url`. Aborting is better than an `isMounted` flag because it actually cancels the work and frees the connection rather than just ignoring the answer. It also fixes the out-of-order response race for free, since a superseded request is cancelled rather than left to land late.',
  },

  {
    slug: 'react-transition-pending',
    title: 'Keeping the UI responsive during a slow update',
    category: 'react',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Typing in a search box that filters ten thousand rows makes each keystroke stutter, because the input cannot repaint until the list rerenders.',
      '',
      'Name the React hook that lets the input update first and marks the list update as interruptible.'
    ),
    graderConfig: {
      accept: ['usetransition', 'usetransition()', 'starttransition', 'usedeferredvalue'],
      acceptPatterns: ['use-?Transition', 'startTransition', 'useDeferredValue'],
      nearMisses: {
        usememo: 'Memoising the filter helps the cost, but the render still blocks the keystroke.',
        usecallback: 'That stabilises a function reference, which is a different problem.',
      },
      hints: [
        'React can treat some updates as lower priority than others.',
        'The urgent update is the input; the list can lag by a frame or several.',
        '`useTransition`, or `useDeferredValue` for the value-shaped version.',
      ],
    },
    canonicalAnswer: 'useTransition',
    solution: code(
      'jsx',
      'const [isPending, startTransition] = useTransition();',
      '',
      'function onChange(event) {',
      '  setQuery(event.target.value); // urgent: the input',
      '  startTransition(() => setFilter(event.target.value)); // interruptible: the list',
      '}'
    ),
    explanation:
      'Marking an update as a transition tells React it may be interrupted by anything more urgent, so a keystroke always wins over a list rerender and the input stays responsive. `isPending` gives you a handle for a subtle loading affordance without a spinner flash. `useDeferredValue` is the same idea expressed as a value rather than a callback, and it is usually the smaller change: derive the deferred query and filter from that. Neither makes the filtering faster, so if the work is genuinely heavy, virtualise the list as well.',
  },
];
