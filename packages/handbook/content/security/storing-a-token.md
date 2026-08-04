---
title: Storing a token
question: Should the session token live in a cookie or in localStorage, and what does each expose?
order: 4
practise:
  - security-samesite-none-secure
  - security-token-storage
  - security-cookie-flags
  - session-revocation-nestjs
sources:
  - author: MDN
    title: Set-Cookie header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
  - author: MDN
    title: Using HTTP cookies
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
  - author: MDN
    title: 'Window: localStorage property'
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
  - author: IETF
    title: 'RFC 6265: HTTP State Management Mechanism'
    url: https://www.rfc-editor.org/rfc/rfc6265.html
  - author: IETF
    title: 'draft-ietf-httpbis-rfc6265bis-22: Cookies: HTTP State Management Mechanism'
    url: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22
  - author: IETF
    title: 'RFC 6819: OAuth 2.0 Threat Model and Security Considerations'
    url: https://www.rfc-editor.org/rfc/rfc6819.html
  - author: OWASP
    title: Session Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - author: OWASP
    title: Cross-Site Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
  - author: Mozilla
    title: 'Bugzilla 1617609: Enable sameSite=lax by default'
    url: https://bugzilla.mozilla.org/show_bug.cgi?id=1617609
verified: 2026-08-02
---

## The model

A browser has two places to keep a session token, and they fail in opposite directions.

`localStorage` and `sessionStorage` are key-value stores scoped to an origin, and every script on
that origin reads them. OWASP states the consequence directly: "Do not store authentication tokens,
session IDs, JWTs, refresh tokens, or any credential in `localStorage` or `sessionStorage`. These
APIs are accessible to any JavaScript executing in the origin, so a single XSS vulnerability
discloses every token." The two differ only in lifetime, `localStorage` "data has no expiration
time" against `sessionStorage` cleared "when the page session ends", which changes nothing about the
exposure. Neither is attached to a request for you, so your code sets the `Authorization` header
itself, which [authentication headers](../headers/authentication.md) covers.

A cookie inverts all of it. The server sends it once and the browser attaches it to every matching
request from then on, whether or not the code making that request knew a cookie existed. That is the
value and the problem in one: it survives a reload, and it also fires on a request another site
provoked. OWASP: "Since browser requests automatically include all cookies including session
cookies, this attack works unless proper authorization is used". CSRF exists because of the
attachment.

So the trade is XSS exposure against CSRF exposure, and it is not symmetric. CSRF has three cookie
attributes that close most of it for a line of config. XSS has no cookie attribute that closes it.

### The three attributes

`HttpOnly` "forbids JavaScript from accessing the cookie, for example, through the `Document.cookie`
property". RFC 6265 frames it as an API restriction rather than a language one: it "instructs the
user agent to omit the cookie when providing access to cookies via 'non-HTTP' APIs".

`Secure` means the cookie "is sent to the server only when a request is made with the `https:`
scheme (except on localhost)". It constrains transport and nothing else, as MDN warns: cookies with
it "can still be read/modified either with access to the client's hard disk or from JavaScript if
the `HttpOnly` cookie attribute is not set."

`SameSite` decides which cross-site requests carry it:

- `Strict` sends it "only for requests originating from the same site that set the cookie". Arrive
  from a link on another site and you land logged out.
- `Lax` adds back cross-site requests meeting two criteria: "The request is a top-level navigation",
  and "The request uses a safe method: in particular, this excludes `POST`, `PUT`, and `DELETE`." A
  link click still carries the cookie. A `fetch`, an `<img>`, and an `<iframe>` navigation do not.
- `None` sends it everywhere, and the specification refuses it without `Secure`: "abort this
  algorithm and ignore the cookie entirely unless the cookie's secure-only-flag is true."

Set it explicitly, because the default is not settled. With the attribute absent the specification
says only to "set the cookie's same-site-flag to 'Default'" and leaves the treatment to the browser,
and MDN as of this page's verified date hedges to match: "Some browsers use `Lax` as the default
value if `SameSite` is not specified." Chromium does. Firefox does not, and its meta bug for the
change is resolved WONTFIX: "the current behaviour is when no SameSite attribute is set we use None
by default." Nothing above them settles it either: RFC 6265 predates the attribute, and `rfc6265bis`
is still an Internet-Draft in the RFC Editor queue, without a number.

### HttpOnly is not a cure for XSS

An injected script cannot read an `HttpOnly` cookie and does not need to. MDN: "a cookie that has
been created with `HttpOnly` will still be sent with JavaScript-initiated requests, for example,
when calling `XMLHttpRequest.send()` or `fetch()`." The script calls your API from your own page,
the browser attaches the cookie, and the request arrives indistinguishable from one the user made.

What the flag buys is narrow and real. Without it, the attacker exfiltrates a credential and replays
it from their own machine, after the tab is closed. With it, they act as the user only while their
code is running on your page. That is containment, not prevention.

### Cookie prefixes

`__Secure-` and `__Host-` are enforced on the way in: the name commits the cookie to a set of
attributes, and a `Set-Cookie` that breaks the promise is dropped rather than corrected. `__Secure-`
cookies "must be set with the `Secure` attribute by a secure page (HTTPS)". `__Host-` requires that
too, and "in addition, they must not have a `Domain` attribute specified, and the `Path` attribute
must be set to `/`". What you get back is the reason to use it: "This guarantees that such cookies
are only sent to the host that set them, and not to any other host on the domain. It also guarantees
that they are set host-wide and cannot be overridden on any path on that host. This combination
yields a cookie that is as close as can be to treating the origin as a security boundary."

Origin-like is as good as cookies get. RFC 6265 says they "do not provide isolation by port" and "do
not provide isolation by scheme", and 6265bis notes "Ports are the only piece of the origin model
that `__Host-` cookies continue to ignore." OWASP names it as recommended for session IDs, and it is
the strongest thing you can put in front of a session cookie's name.

### Scope and lifetime

`Domain` only ever widens. Omit it and the cookie goes to the host that set it "but not on its
subdomains"; set it and "subdomains are always included", leading dots ignored. The weakness runs
the other way too, which is why a subdomain you do not control is your problem: RFC 6265's weak
integrity section describes a sibling domain setting a cookie with a parent `Domain`, after which
the victim "will be unable to distinguish this cookie from a cookie it set itself".

`Path` "indicates the path that must exist in the requested URL for the browser to send the `Cookie`
header", defaulting to the path of the request that set it. It is scoping, not a control: RFC 6265
is explicit that it carries no integrity protection either.

Lifetime is `Max-Age` in seconds or `Expires` as a date, and "if both `Expires` and `Max-Age` are
set, `Max-Age` has precedence." Omit both and you get a session cookie, deleted "when the current
session ends". That end is the browser's to define: "some browsers use session restoring when
restarting. This can cause session cookies to last indefinitely."

### Revocation, and where in-memory fits

An opaque session id is a lookup key. The server holds the state, so deleting the row ends the
session on the next request. A self-contained JWT carries its own claims and is checked by
signature, so nothing is consulted and there is nothing to delete: it is valid until it expires. RFC
6819 draws the same line between handles and assertions. "Handles enable simple revocation", and
against that, "implementing token revocation is more difficult with assertions than with handles."

That bill comes due at logout, at password change, and at "this account looks compromised". The
mitigation is a short access-token lifetime plus a revocable refresh token: "The authorization
server can revoke the refresh token at any time, causing the granted access to be revoked once the
current access token expires." Your exposure is the gap between the revocation and that expiry, so
size the access-token lifetime against it.

The in-memory option follows from both halves. Keep the access token in a JavaScript variable that
is never persisted and the refresh token in a `__Host-` cookie with `HttpOnly` and `Secure`: no
store on the origin holds a credential, and the long-lived half is revocable. It costs a loading
state on every cold start, since a reload wipes the variable and the app refreshes before its first
real request. An injected script can still call that refresh endpoint, so this narrows the window
rather than closing it.

## Worked example

The cookie a session id should ship as, where `Path=/` and the absent `Domain` are not choices but
what the `__Host-` prefix demands:

```http
Set-Cookie: __Host-session=<opaque-id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

What each store hands to a script that should not be running:

```js
localStorage.getItem('token'); // the token, to any script on the origin
document.cookie; // '' for the HttpOnly cookie: not in this string, by design

// and the part HttpOnly does not stop, from that same injected script:
await fetch('/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ to: 'attacker', amount: 5000 }),
}); // same-origin, so the browser attaches the cookie and the server sees the user
```

The in-memory pattern, with the cookie doing the persisting:

```js
let accessToken = null; // dies on reload, which is the point

async function authedFetch(path, init = {}) {
  if (!accessToken) {
    // nothing to send: the __Host- refresh cookie is attached by the browser
    const res = await fetch('/auth/refresh', { method: 'POST' });
    if (!res.ok) throw new Error('Session expired'); // revoked, or no refresh cookie
    accessToken = (await res.json()).accessToken;
  }
  const headers = { ...init.headers, Authorization: `Bearer ${accessToken}` };
  return fetch(path, { ...init, headers });
}
```

## Traps

**You moved the token out of `localStorage` into an `HttpOnly` cookie and the pentest still lands.**
The finding was XSS, and the storage change never touched it. The injected script no longer reads
the token, so it spends it instead, on a same-origin `fetch` that carries the cookie automatically.
Fixing storage limits what an attacker takes home; only
[stopping the injection](./untrusted-input-becomes-code.md) stops it.

**The `Set-Cookie` header is right there in devtools and the cookie is nowhere.** The browser
rejected it whole rather than repairing it, silently. Usual causes: a `__Host-` name sent with a
`Domain` attribute or a `Path` other than `/`, `SameSite=None` without `Secure`, or `Secure` over
plain `http` on a host that is not localhost. The specification says "abort this algorithm and
ignore the cookie entirely", so there is no half-applied state to inspect.

**Nobody hit CSRF in testing and the report finds it anyway.** The cookie has no `SameSite`
attribute and the tester used Firefox, where an absent attribute still means `None`, so Chromium's
`Lax` default was covering for you. Set the attribute, and treat it as the second layer regardless:
OWASP is clear that "`SameSite` is useful as a defense-in-depth control but it does not replace a
proper CSRF defense in most deployments", because `Lax` still permits a cross-site top-level GET.

**The user pressed log out, the UI cleared, and their old token still works.** The token is a
self-contained JWT, so logging out deleted the client's copy and nothing else. The server validates
by signature and consults no store, so a token captured earlier stays good until its `exp`. Keep
server-side state you can delete, or shrink the gap with a short lifetime and a revocable refresh
token.

**The marketing subdomain got compromised and the main app's sessions went with it.** Somebody set
`Domain=example.com` to share a login across hosts, so every subdomain receives the session cookie,
third-party hosting included. The reverse holds without any sharing: a subdomain can write a cookie
scoped to the parent, and the parent cannot tell it from its own. Drop `Domain` and use `__Host-`.

**Users report staying logged in for weeks, and the session cookie has no `Expires`.** A session
cookie ends when the browser decides the session ended, and a browser that restores tabs on launch
restores those cookies with them. Set `Max-Age`, and give the server-side record its own lifetime:
the cookie's expiry is only the client's opinion.
