---
title: The DOM API's sharp edges
question: Which of these DOM methods does not do what its name suggests?
order: 13
practise:
  - dom-queryselectorall-type
  - dom-dataset
  - dom-classlist-toggle
  - dom-intersection-observer
  - dom-localstorage-json
  - dom-innerhtml-xss
sources:
  - author: MDN
    title: Document.querySelectorAll()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll
  - author: MDN
    title: Document.getElementsByClassName()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
  - author: MDN
    title: Document.getElementsByTagName()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByTagName
  - author: MDN
    title: HTMLElement.dataset
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
  - author: MDN
    title: DOMTokenList.toggle()
    url: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/toggle
  - author: MDN
    title: Intersection Observer API
    url: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  - author: MDN
    title: Storage.setItem()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
  - author: MDN
    title: JSON.stringify()
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - author: MDN
    title: Element.innerHTML
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
  - author: MDN
    title: Node.textContent
    url: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
  - author: MDN
    title: Element.insertAdjacentHTML()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
  - author: MDN
    title: Element.setHTML()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML
  - author: MDN
    title: HTML Sanitizer API
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API
  - author: OWASP
    title: DOM based XSS Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
verified: 2026-08-01
---

## The model

The DOM is old, and it grew in layers. Several of the calls you make every day are named as if they
return one thing and return something subtly different, and the gap is where the bugs live. Here is
the short tour, one line of what it really does and one line of what that costs.

**`querySelectorAll` gives you a `NodeList`, not an array.** It "returns a static (not live)
`NodeList`", in document order. It is iterable and has `forEach`, and that is the whole trap: the one
array method it does have is the one that makes you assume the rest are there. `map`, `filter`,
`reduce`, `find` and `slice` are all absent. `[...nodes]` or `Array.from(nodes)` gets you a real
array.

**`getElementsByClassName` gives you a live `HTMLCollection`.** MDN warns: "Changes in the DOM will
reflect in the array as the changes occur. If an element selected by this array no longer qualifies
for the selector, it will automatically be removed." Live is useful when you want a count that stays
current. It goes wrong in a loop that edits the DOM, because the collection shrinks while the index
climbs.

**`dataset` renames your attributes.** The mapping drops the `data-` prefix and then, "for any dash
followed by an ASCII lowercase letter a to z, remove the dash and uppercase the letter". So
`data-order-id` is `dataset.orderId`, and `data-abc-def` is `dataset.abcDef`. Every value is a
string, in both directions: assigning `null` writes `data-example="null"`. `data-count="0"` reads
back as `"0"`, which is truthy.

**`classList.toggle` takes a second argument.** With `force`, it "turns the toggle into a one
way-only operation": `true` only adds, `false` only removes. That is the entire if/else you were
about to write, and it is idempotent, so calling it again with the same value changes nothing. It
also touches one class rather than replacing the attribute, which is what `className =` does.

**`IntersectionObserver` replaces the scroll handler rather than tidying it.** The old approach used
"event handlers and loops calling methods like `Element.getBoundingClientRect()`", and "since all
this code runs on the main thread, even one of these can cause performance problems", because reading
that geometry forces layout. The observer reports asynchronously instead, so "sites no longer need to
do anything on the main thread to watch for this kind of element intersection". `rootMargin` grows or
shrinks the root's box before intersections are computed, so you can start loading before the element
is on screen; `threshold` sets how much has to be visible.

**`localStorage` holds strings and nothing else.** "`Storage` only supports storing and retrieving
strings. If you want to save other data types, you have to convert them to strings." So an object
round-trips through `JSON.stringify` and `JSON.parse`, and comes back missing everything JSON cannot
represent. A `Date` implements `toJSON`, so it goes in as an object and comes back as an ISO string.
A `Map` or a `Set` "will become `{}`", and a property whose value is `undefined` is omitted
entirely.

### innerHTML is the one that is a vulnerability

The others are surprises. This one is an attack surface. Assigning a string to `innerHTML` "parses
this value as HTML and replaces all the element's descendants with the result", so any markup in
user-controlled text becomes real elements. MDN calls it "probably the most common vector for
cross-site scripting (XSS) attacks". Injected `<script>` elements do not run, which is the detail
that makes people think they are safe, and it protects nothing. MDN's own example:

```js
const name = "<img src='x' onerror='alert(1)'>";
el.innerHTML = name; // shows the alert
```

`textContent` is the fix nearly every time, and OWASP puts it first: "The most fundamental safe way
to populate the DOM with untrusted data is to use the safe assignment property `textContent`."
Nothing is parsed, so markup is impossible by construction rather than by escaping. It is faster
too. MDN on using `innerHTML` for text: "it is still less semantic and slower because it needs to
invoke the HTML parser."

When the content really is HTML, `Element.setHTML()` parses and sanitizes in one step, stripping
`<script>`, `<iframe>`, `<object>` and event handler attributes. Check before you rely on it: as of
this page's verified date, both `setHTML()` and the HTML Sanitizer API carry MDN's "Limited
availability" banner, "not Baseline because it does not work in some of the most widely-used
browsers". Treat it as something to feature-detect, not something to reach for by default.

## Worked example

Each one-liner, with the version people write instead:

```js
const rows = document.querySelectorAll('tr[data-order-id]');
rows.map((r) => r.dataset.orderId); // TypeError: rows.map is not a function
[...rows].map((r) => r.dataset.orderId); // ['42', '43']

row.dataset.orderId; // '42', from <tr data-order-id="42">
Number(row.dataset.orderId); // 42, because dataset values are strings

el.classList.toggle('active', isActive); // adds when true, removes when false
el.className = isActive ? 'active' : ''; // and every other class is gone

el.innerHTML = comment; // any markup in the string becomes real elements
el.textContent = comment; // characters, never markup
```

Visibility, without touching the main thread on every frame:

```js
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      load(entry.target);
      observer.unobserve(entry.target); // it has done its job
    }
  },
  { rootMargin: '200px' } // start loading before it is on screen
);

images.forEach((img) => observer.observe(img));
```

And the storage round trip, with the read guarded on both counts:

```js
localStorage.setItem('prefs', JSON.stringify({ theme: 'dark', seenAt: new Date() }));

const raw = localStorage.getItem('prefs'); // null if the key is missing
const prefs = raw ? JSON.parse(raw) : {}; // and JSON.parse throws on anything that is not JSON

typeof prefs.seenAt; // 'string'. The Date did not survive
```

## Traps

**`nodes.map is not a function`, on a thing you can already `forEach`.** `querySelectorAll` returned
a `NodeList`, which has `forEach` and nothing else from the array methods. Spread it or use
`Array.from` at the point of the query, so the rest of the function works with an array.

**Half the elements were skipped, and running it twice finished the job.** The loop is over a live
`HTMLCollection` from `getElementsByClassName` or `getElementsByTagName`, and removing the class
removes the element from the collection mid-iteration, so `i++` steps over its replacement. Snapshot
it first with `[...els]`, or use `querySelectorAll`, which is static.

**Reading the attribute gives `NaN`, or `id is not defined`.** A hyphen is not valid in a property
name, so `row.dataset.user-id` parses as `row.dataset.user - id` and does arithmetic on two things
that do not exist. `row.dataset.userid` fails more quietly: the mapping camel-cases rather than
flattening, so `data-user-id` is `dataset.userId` and nothing else. When the attribute name is
dynamic, `getAttribute('data-user-id')` sidesteps the question.

**The stored value reads back as the literal string `[object Object]`.** `localStorage.setItem` got
an object and coerced it, silently and with no error. `JSON.stringify` on the way in, `JSON.parse` on
the way out, and guard both ends of the read: `getItem` gives `null` for a missing key, and
`JSON.parse` throws on anything that is not JSON.

**Every input in the panel went blank and the buttons stopped responding.** Something did
`el.innerHTML += '<li>…</li>'`. That reads the whole subtree out as a string, discards it, and parses
the string back into brand new elements. The new elements are not the old ones, so every listener
attached to them is gone and every value a user had typed but not submitted goes with it.
`insertAdjacentHTML` "does not reparse the element it is being used on, and thus it does not corrupt
the existing elements inside that element", and `append` with a real node is better still.

**The comment field runs JavaScript.** The value went to `innerHTML`, so `<img src=x onerror=…>` in a
comment executes for everyone who loads the page. Stored XSS, in one assignment. `textContent` is the
fix and needs no escaping, no allowlist, and no dependency. Reach for a sanitizer only when the
requirement really is user-authored HTML, and check its support before you ship it.
