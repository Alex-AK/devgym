import { code, md, type ProblemDraft } from './types';

export const domProblems: ProblemDraft[] = [
  {
    slug: 'dom-event-delegation',
    title: 'One listener for a growing list',
    category: 'dom',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'A table gets new rows constantly, and attaching a click listener to every row is both slow and misses rows added later.',
      '',
      'Name the technique that solves this and the two pieces that make it work.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['delegation', 'delegate'],
          missingFeedback: 'Name the technique.',
        },
        {
          synonyms: ['parent', 'container', 'ancestor', 'table', 'one listener'],
          missingFeedback: 'Where does the single listener go?',
        },
        {
          synonyms: ['target', 'closest', 'matches'],
          missingFeedback: 'How do you work out which row was actually clicked?',
        },
      ],
      hints: [
        'Events bubble up from the element that was clicked.',
        'Put one listener on the container instead of one per row.',
        'Inside the handler, use `event.target.closest(selector)` to find the row.',
      ],
    },
    canonicalAnswer:
      'Event delegation: attach a single listener to the parent container and use event.target.closest("tr") inside the handler to find which row was clicked. Because events bubble, rows added later are covered automatically.',
    solution: code(
      'js',
      "table.addEventListener('click', (event) => {",
      "  const row = event.target.closest('tr[data-id]');",
      '  if (!row || !table.contains(row)) return;',
      '  select(row.dataset.id);',
      '});'
    ),
    explanation:
      'Events **bubble** from the deepest element up through its ancestors, so a listener on the container sees clicks on every descendant. Including ones added after the listener was attached, which is the property that makes this work for dynamic lists. `event.target` is what was actually clicked (possibly a `<span>` inside the cell), so `closest(selector)` walks up to the element you care about. One listener also means one thing to remove on teardown, instead of N leaked handlers.',
  },

  {
    slug: 'dom-target-vs-currenttarget',
    title: 'The click that reported the icon',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'One listener on the table handles every row. Clicking the chevron inside a row logs the `<svg>`',
      'rather than the table:',
      '',
      code(
        'js',
        "table.addEventListener('click', (event) => {",
        '  console.log(event.target);',
        '});'
      ),
      '',
      'Name the property that is the element the listener is attached to, whatever was clicked.'
    ),
    graderConfig: {
      accept: ['currenttarget', 'event.currenttarget', 'e.currenttarget'],
      acceptPatterns: ['currentTarget'],
      nearMisses: {
        target: 'That is the one already in the code: the deepest element under the pointer.',
        this: 'In a regular function `this` is that element, but an arrow function has no binding of its own. The event carries the answer either way.',
      },
      hints: [
        'The event carries two element properties, and they answer different questions.',
        'One is where the event started, the other is where this listener lives. `target` is the first one.',
        '`event.currentTarget`',
      ],
    },
    canonicalAnswer: 'currentTarget',
    solution: code(
      'js',
      "table.addEventListener('click', (event) => {",
      '  event.currentTarget; // the table, always',
      '  event.target; // the svg, the span, the cell: whatever was under the pointer',
      '',
      "  const row = event.target.closest('tr[data-order-id]');",
      '  if (row) select(row.dataset.orderId);',
      '});'
    ),
    explanation:
      '`target` is where the event started and it does not change as the event travels, so every handler on the way up sees the same one. `currentTarget` is the element whose listener is running, so it differs in each of those handlers. Delegation needs both: `currentTarget` is the container you attached to, `target` is what was actually clicked, and `event.target.closest(selector)` is the step from one to the other. One catch that produces a confusing `null`: `currentTarget` is only set while the event is being dispatched, so reading it after an `await` or inside a `setTimeout` gives you nothing. Copy what you need out of the event before you yield.',
  },

  {
    slug: 'dom-queryselectorall-type',
    title: 'querySelectorAll does not return an array',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'This throws `nodes.map is not a function`:',
      '',
      code(
        'js',
        "const nodes = document.querySelectorAll('.row');",
        'const ids = nodes.map((n) => n.id);'
      ),
      '',
      'Write the shortest fix to the first line or the second so `map` works.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        '\\[\\s*\\.\\.\\.\\s*nodes\\s*\\]',
        'Array\\.from\\(\\s*nodes\\s*\\)',
        '\\[\\s*\\.\\.\\.\\s*document\\.querySelectorAll',
        'Array\\.from\\(\\s*document\\.querySelectorAll',
      ],
      closeSubstrings: {
        'array(':
          '`Array(x)` wraps x in a one-element array rather than converting it. Use `Array.from(x)` or `[...x]`.',
        foreach: 'NodeList does have forEach, but the question asks to make `map` work.',
        nodelist: 'Right diagnosis. Now convert it to a real array.',
      },
      hints: [
        '`querySelectorAll` returns a NodeList, not an Array.',
        'NodeList has `forEach` but none of the other array methods.',
        'Spread it or use `Array.from`: `[...nodes]`.',
      ],
    },
    canonicalAnswer: '[...nodes]',
    solution: code(
      'js',
      "const nodes = [...document.querySelectorAll('.row')];",
      'const ids = nodes.map((n) => n.id);'
    ),
    explanation:
      '`querySelectorAll` returns a **static** `NodeList`. Array-like and iterable, with a `forEach`, but without `map`, `filter` or `reduce`. Spreading it or using `Array.from` gives you a real array. Note the contrast with `getElementsByClassName`, which returns a **live** `HTMLCollection` that updates as the DOM changes. Iterating one of those while removing elements is a classic off-by-several bug.',
  },

  {
    slug: 'dom-localstorage-json',
    title: 'localStorage stores strings',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'This reads back the string `"[object Object]"`:',
      '',
      code(
        'js',
        "localStorage.setItem('prefs', { theme: 'dark' });",
        "const prefs = localStorage.getItem('prefs');"
      ),
      '',
      'What must wrap the value on the way in?'
    ),
    graderConfig: {
      accept: ['json.stringify', 'json.stringify()', 'stringify'],
      acceptPatterns: ['JSON\\.stringify\\('],
      nearMisses: {
        'json.parse': 'JSON.parse is for the way *out*. The question is about writing.',
        tostring:
          'toString() on a plain object gives "[object Object]". That is the bug, not the fix.',
      },
      hints: [
        'Web Storage can only hold strings; anything else is coerced with String().',
        'Serialize on the way in, parse on the way out.',
        '`JSON.stringify(value)`',
      ],
    },
    canonicalAnswer: 'JSON.stringify',
    solution: code(
      'js',
      "localStorage.setItem('prefs', JSON.stringify({ theme: 'dark' }));",
      "const prefs = JSON.parse(localStorage.getItem('prefs') ?? '{}');"
    ),
    explanation:
      'Web Storage values are always strings, so a plain object is coerced with `String()` into `"[object Object]"`. Silently, with no error. Serialise with `JSON.stringify` on the way in and `JSON.parse` on the way out. Two things to guard on the read: `getItem` returns `null` for a missing key (so give `JSON.parse` a fallback), and stored JSON can be corrupt or from an older shape, so a `try/catch` around the parse is not paranoia. Remember `Date` objects do not survive the round trip.',
  },

  {
    slug: 'dom-prevent-vs-stop',
    title: 'preventDefault versus stopPropagation',
    category: 'dom',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A form submit handler calls `event.stopPropagation()` and the page still reloads.',
      '',
      'Explain what each of the two methods does and which one was needed.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['preventdefault', 'prevent default'],
          missingFeedback: 'Name the method that was actually needed.',
        },
        {
          synonyms: ['browser', 'default', 'built-in', 'native', 'submit', 'reload', 'navigation'],
          missingFeedback: 'What does preventDefault cancel?',
        },
        {
          synonyms: ['bubbl', 'propagat', 'ancestor', 'parent', 'up the tree'],
          missingFeedback: 'What does stopPropagation stop?',
        },
      ],
      hints: [
        'They solve two unrelated problems.',
        '`stopPropagation` stops the event travelling to ancestor listeners. It has no effect on the browser action.',
        '`preventDefault` cancels the browser default, which for a form submit is the navigation.',
      ],
    },
    canonicalAnswer:
      'preventDefault cancels the browser default action, here the form navigation, which is what was needed. stopPropagation only stops the event bubbling to ancestor listeners and has no effect on the default behaviour.',
    solution: code(
      'js',
      "form.addEventListener('submit', (event) => {",
      '  event.preventDefault();   // stop the page reloading',
      '  // event.stopPropagation(); // unrelated. Only affects other listeners',
      '  submitViaFetch();',
      '});'
    ),
    explanation:
      "They act on two different axes. `preventDefault()` cancels the **browser's** built-in reaction (navigating on a form submit or a link click, checking a checkbox, showing the context menu) while leaving the event to keep bubbling. `stopPropagation()` stops other **listeners** on ancestors from seeing the event, and has no effect whatsoever on the default action. Reach for `stopPropagation` sparingly: it silently breaks unrelated delegated handlers higher up, which is a miserable bug to track down.",
  },

  {
    slug: 'dom-innerhtml-xss',
    title: 'Rendering untrusted text',
    category: 'dom',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You are inserting a user-supplied comment into the page:',
      '',
      code('js', 'el.innerHTML = comment;'),
      '',
      'Which property should you assign to instead, so the string is rendered as text and never parsed as HTML?'
    ),
    graderConfig: {
      accept: ['textcontent', 'el.textcontent', '.textcontent'],
      acceptPatterns: ['textContent'],
      nearMisses: {
        innertext:
          'innerText is close but it is layout-aware, slower, and reflects styling. TextContent is the right default.',
        outerhtml: 'outerHTML has exactly the same injection problem as innerHTML.',
      },
      hints: [
        'You want the string treated as characters, not markup.',
        'The property sets text and escapes nothing because nothing is parsed.',
        '`el.textContent = comment;`',
      ],
    },
    canonicalAnswer: 'textContent',
    solution: code('js', 'el.textContent = comment; // never parsed as HTML'),
    explanation:
      "`innerHTML` parses the string as markup, so a comment containing `<img src=x onerror=…>` executes. The classic stored XSS. `textContent` sets the node's text directly with no parsing, so markup is impossible by construction. Prefer it over `innerText`, which triggers layout (making it slower) and returns only *rendered* text, so it is affected by CSS. When you genuinely need to render HTML, sanitise first. `DOMPurify`, or the built-in `setHTML()` where available.",
  },

  {
    slug: 'dom-dataset',
    title: 'Read a data attribute',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'Given `<tr data-order-id="42">`, write the expression that reads `"42"` from the element `row`.'
    ),
    graderConfig: {
      accept: ['row.dataset.orderid'],
      acceptPatterns: [
        'row\\.dataset\\.orderId',
        'row\\.getAttribute\\(\\s*[\'"`]data-order-id[\'"`]\\s*\\)',
      ],
      nearMisses: {
        'row.dataset.order-id':
          'Hyphens are not valid in property names. The dataset key is camelCased.',
        'row.data.orderid': 'The property is called `dataset`, not `data`.',
      },
      hints: [
        'There is a property that exposes all `data-*` attributes as an object.',
        'Hyphenated attribute names become camelCase keys.',
        '`row.dataset.orderId`',
      ],
    },
    canonicalAnswer: 'row.dataset.orderId',
    solution: code('js', "row.dataset.orderId; // '42'. Always a string"),
    explanation:
      '`dataset` exposes every `data-*` attribute, converting the hyphenated name to camelCase. `data-order-id` becomes `dataset.orderId`. Values are **always strings**, so `data-count="0"` comes back as `"0"` (truthy!) and needs an explicit `Number()`. Writing to `dataset` updates the attribute in the DOM, which makes it a convenient way to pass a record id from server-rendered HTML into a delegated event handler.',
  },

  {
    slug: 'dom-debounce-throttle',
    title: 'Debounce versus throttle',
    category: 'dom',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'You have two problems: a search box that fires a request per keystroke, and a scroll handler running hundreds of times a second.',
      '',
      'Which technique fits each, and what is the difference between them?'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['debounce', 'debounc'],
          missingFeedback: 'Name the technique that waits for the activity to stop.',
        },
        {
          synonyms: ['throttl'],
          missingFeedback: 'Name the technique that runs at a fixed maximum rate.',
        },
        {
          synonyms: ['stop', 'quiet', 'idle', 'last', 'pause', 'settles', 'finish'],
          missingFeedback: 'Say what triggers a debounced call: what has to happen first?',
        },
      ],
      hints: [
        'One waits for silence; the other guarantees a steady rate.',
        'Debounce: run once, after the events stop for N ms. Perfect for the search box.',
        'Throttle: run at most once per N ms while events keep coming. Perfect for scroll.',
      ],
    },
    canonicalAnswer:
      'Debounce the search box: it waits until the user stops typing for N ms and then runs once. Throttle the scroll handler: it runs at most once per N ms while the events keep coming. Debounce collapses a burst into a single trailing call; throttle enforces a maximum rate throughout.',
    solution: code(
      'js',
      'function debounce(fn, ms) {',
      '  let id;',
      '  return (...args) => {',
      '    clearTimeout(id);',
      '    id = setTimeout(() => fn(...args), ms);',
      '  };',
      '}',
      '',
      'function throttle(fn, ms) {',
      '  let last = 0;',
      '  return (...args) => {',
      '    const now = performance.now();',
      '    if (now - last < ms) return;',
      '    last = now;',
      '    fn(...args);',
      '  };',
      '}'
    ),
    explanation:
      '**Debounce** resets a timer on every call and only fires once the events stop for the full delay, so a burst of 20 keystrokes produces exactly one request, which is what a search box wants. **Throttle** lets the first call through and then ignores others until the window elapses, guaranteeing a steady maximum rate. Right for scroll and resize, where you want feedback *during* the activity, not only after it. Picking the wrong one is very visible: a throttled search box fires needless requests, and a debounced scroll handler does nothing until the user stops scrolling.',
  },

  {
    slug: 'dom-classlist-toggle',
    title: 'Toggle a class conditionally',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'Write the single call that adds the class `active` to `el` when `isActive` is true and removes it when false.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: ['classList\\.toggle\\(\\s*[\'"`]active[\'"`]\\s*,\\s*isActive\\s*\\)'],
      closeSubstrings: {
        'classlist.toggle': 'Right method. It takes a second argument that forces the state.',
        classname: 'Assigning className would wipe every other class on the element.',
      },
      hints: [
        '`classList.toggle(name)` flips it, but you want to force a specific state.',
        'It accepts a second boolean argument.',
        "`el.classList.toggle('active', isActive)`",
      ],
    },
    canonicalAnswer: "el.classList.toggle('active', isActive)",
    solution: code('js', "el.classList.toggle('active', isActive);"),
    explanation:
      "The optional second argument to `toggle` **forces** the state rather than flipping it, which turns four lines of if/else into one and, importantly, is idempotent, so calling it repeatedly with the same value is safe. Compare with `el.className = 'active'`, which destroys every other class on the element. `classList` also gives you `add`, `remove`, `replace` and `contains`, all of which operate on individual classes without touching the rest.",
  },

  {
    slug: 'dom-intersection-observer',
    title: 'Detect when an element scrolls into view',
    category: 'dom',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You need to lazy-load images and trigger infinite scroll without running `getBoundingClientRect()` on every scroll event.',
      '',
      'Which browser API is designed for this?'
    ),
    graderConfig: {
      accept: ['intersectionobserver', 'intersection observer', 'new intersectionobserver'],
      acceptPatterns: ['IntersectionObserver'],
      nearMisses: {
        mutationobserver: 'MutationObserver watches DOM changes, not visibility.',
        resizeobserver: 'ResizeObserver watches size changes, not intersection with the viewport.',
        'scroll event': 'That is the approach the question is trying to replace.',
      },
      hints: [
        'It is an observer, like MutationObserver and ResizeObserver.',
        'It reports when an element intersects an ancestor or the viewport.',
        '`new IntersectionObserver(callback, options)`',
      ],
    },
    canonicalAnswer: 'IntersectionObserver',
    solution: code(
      'js',
      'const observer = new IntersectionObserver(',
      '  (entries) => {',
      '    for (const entry of entries) {',
      '      if (!entry.isIntersecting) continue;',
      '      load(entry.target);',
      '      observer.unobserve(entry.target);',
      '    }',
      '  },',
      "  { rootMargin: '200px' }, // start loading before it is visible",
      ');',
      '',
      'images.forEach((img) => observer.observe(img));'
    ),
    explanation:
      '`IntersectionObserver` reports visibility changes **asynchronously, off the main thread**, so it avoids the scroll-handler-plus-`getBoundingClientRect` pattern that forces synchronous layout on every frame and causes jank. `rootMargin` grows the trigger area so you can start loading before the element is actually on screen, and `threshold` controls how much must be visible. Remember to `unobserve` once an element has done its job, and `disconnect()` on teardown.',
  },
];
