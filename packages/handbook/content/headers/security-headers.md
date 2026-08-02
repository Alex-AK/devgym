---
title: Security headers
question: Which of these security headers actually stops an attack, and which ones are theatre?
order: 6
practise:
  - security-csp-unsafe-inline
  - security-hsts-redirect
  - security-nosniff-mime
  - security-referrer-policy
  - security-sri
sources:
  - author: MDN
    title: Content Security Policy (CSP)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
  - author: MDN
    title: 'Content-Security-Policy: script-src directive'
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
  - author: MDN
    title: 'Content-Security-Policy: frame-ancestors directive'
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
  - author: MDN
    title: Content-Security-Policy-Report-Only header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only
  - author: W3C
    title: Content Security Policy Level 3
    url: https://www.w3.org/TR/CSP3/
  - author: MDN
    title: Strict-Transport-Security header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
  - author: IETF
    title: 'RFC 6797: HTTP Strict Transport Security (HSTS)'
    url: https://www.rfc-editor.org/rfc/rfc6797
  - author: Chromium
    title: HSTS Preload List Submission
    url: https://hstspreload.org/
  - author: MDN
    title: X-Content-Type-Options header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options
  - author: MDN
    title: Referrer-Policy header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy
  - author: W3C
    title: Referrer Policy
    url: https://www.w3.org/TR/referrer-policy/
  - author: MDN
    title: Subresource Integrity
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
  - author: MDN
    title: X-XSS-Protection header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
  - author: MDN
    title: X-Frame-Options header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
verified: 2026-08-02
---

## The model

Every header on this page moves a decision the browser was going to make anyway. It already has an
answer to each question: run the script it finds in the markup, second-guess the `Content-Type` you
sent, hand the whole URL to the next site, speak plain HTTP when a link says `http://`. Each header
changes one of those answers, which is what makes them one topic rather than a checklist. You are
overriding a default, so the question worth asking of each is what the default was and what breaks
when you change it. Cookie attributes and output encoding are the same job in a different shape, and
they live in [storing a token](../security/storing-a-token.md) and
[where untrusted input becomes code](../security/untrusted-input-becomes-code.md).

### Content-Security-Policy

`script-src` is an allowlist. It "specifies valid sources for JavaScript", and resources "may be
loaded if they match any of the given source expressions". Anything else does not execute.

Inline script has no source to match, so it sits outside that allowlist by default and no origin you
name puts it back. Event handler attributes go with it: MDN's note is "inline event handlers are
blocked as well", covering `onclick="…"` and `onerror="…"`. That exclusion is the point of the
directive, because an injected payload nearly always lands as inline script.

`'unsafe-inline'` is a blanket exception to it. Every inline script and event handler in the
document executes, and the browser cannot tell the ones you wrote from the one that arrived in a
comment. `script-src 'self' 'unsafe-inline'` still refuses a script from another origin, and gives
back the half that catches XSS.

Two mechanisms keep specific inline scripts without that. A **nonce** is a random value you put in
the policy and echo on the tags you trust, and MDN names the constraint: "this nonce value needs to
be dynamically generated as it has to be unique for each HTTP request". A **hash** is the digest of
the exact script text, computed ahead of time. Either makes the blanket exception redundant, and
browsers act on that: "If a directive contains nonce or hash expressions, then the `unsafe-inline`
keyword is ignored by browsers." So the migration is: add the nonce, watch nothing break, then
delete the keyword.

`'strict-dynamic'` exists because a list of hostnames is hard to keep honest. With it, trust given
to a script by a nonce or a hash "shall be propagated to all the scripts loaded by that root
script", and "any allowlist or source expressions such as `'self'` or `'unsafe-inline'` will be
ignored".

`default-src` "sets a fallback policy for all resources whose directives are not explicitly listed",
and not everything takes part. `frame-ancestors`, which names who may embed you in a `<frame>`,
`<iframe>`, `<object>` or `<embed>`, **does not fall back**. MDN: "A policy that declares
`default-src 'none'` still allows the resource to be embedded by anyone." The CSP Level 3
specification has it supersede `X-Frame-Options`, and the CSP directive is the one enforced when a
response carries both. It cannot be set from a `<meta>` element.

Get a policy onto an existing site with `Content-Security-Policy-Report-Only`, which monitors
violations "without enforcing the security policies". One catch: "The CSP `report-to` directive must
be specified for reports to be sent: if not, the operation won't have any effect."

### Strict-Transport-Security

A 301 from `http://` to `https://` is a response, and a response exists only because a request
already crossed the network. That first request is the gap, and no redirect closes it, because the
redirect travels back over the connection an attacker already controls.

HSTS moves the decision into the browser. The header "informs browsers that the host should only be
accessed using HTTPS, and that any future attempts to access it using HTTP should automatically be
upgraded to HTTPS", and that upgrade happens before a connection is opened, so there is no plaintext
request left to intercept.

`max-age` is required and counts from receipt: RFC 6797 defines it as "the number of seconds, after
the reception of the STS header field, during which the UA regards the host (from whom the message
was received) as a Known HSTS Host". `includeSubDomains` extends that to "any subdomains of the
host's domain name". The very first visit is still unprotected, since the browser "uses an insecure
channel in the initial attempt to interact with the specified server".

`preload` answers that one visit, and it is not part of the standard: RFC 6797 defines `max-age` and
`includeSubDomains`, while `preload` opts you into a list browser vendors maintain and ship inside
the binary. hstspreload.org sets the bar at a valid certificate, HTTP redirecting to HTTPS on the
same host, every subdomain over HTTPS including `www`, and a base-domain header with `max-age` of at
least `31536000`, `includeSubDomains` and `preload`. Chromium maintains it; other browsers "also
have HSTS preload lists based on the Chrome list".

The honest cost is that this is hard to reverse. Turning HSTS off means serving `max-age=0`, which
"only takes effect once the browser makes a secure request and receives the response header", and
"By design, you cannot disable HSTS over insecure HTTP." Preloading is worse: removal is possible,
but "it takes months for a change to reach users with a Chrome update and we cannot make guarantees
about other browsers".

### X-Content-Type-Options

MIME sniffing is the browser deciding it knows the type better than you do. It reads the leading
bytes, so a file served as `text/plain` that starts with `<!doctype html>` gets treated as a page,
which turns any endpoint serving user uploads into a way to host HTML on your own origin. `nosniff`
is the opt-out: it "allows you to avoid MIME type sniffing by specifying that the MIME types are
deliberately configured".

It then does two different things, and which one you get depends on what the request was for. For a
subresource it blocks: "For requests with a destination of `"script"` or `"style"`, the browser
blocks the response if the MIME type doesn't match an expected type (a JavaScript MIME type for
scripts, or `text/css` for stylesheets)." A `<script src>` pointing at something served as
`text/plain` does not fail to run, it fails to load.

For everything else it believes you. "For other response types, including navigations to a new HTML
document, the browser uses the supplied `Content-Type` as-is instead of examining the content to
infer the type." Open the upload link directly and you get a page of text, because `text/plain` is
what you said. The markup inside stays characters.

So it is an instruction to take your word for it, not a filter on content, and the word has to be
right. Serve uploads as `application/octet-stream` with `Content-Disposition: attachment` and there
is nothing left to reinterpret.

### Referrer-Policy

The browser attaches `Referer` to requests it makes on the page's behalf, and the scope is wider
than navigation: the specification covers "Requests made from a document, and for navigations away
from that document". A pixel, a font, a `fetch` to an analytics endpoint each carry it, so a URL you
never linked to anybody still lands in somebody else's access log.

Send no header and modern browsers apply `strict-origin-when-cross-origin`, "the default policy if
no policy is specified, or if the provided value is invalid". It trims by destination: "Send the
origin, path, and query string when performing a same-origin request. For cross-origin requests send
the origin (only) when the protocol security level stays same (HTTPS→HTTPS). Don't send the
`Referer` header to less secure destinations (HTTPS→HTTP)." Your own logs keep the full URL; a third
party gets `https://app.example.com/` and nothing after it. `unsafe-url` removes all of that,
sending "the origin, path, and query string when performing any request, regardless of security".

The header governs one thing, the request the browser makes. A secret in a URL is still a secret in
a URL: it sits in browser history, in the access log of every proxy on the path, and in whatever a
user pastes into a chat window. A policy narrows the leak. It does not make a URL a safe place for a
password reset token, which belongs in a POST body or a short-lived single-use code.

### Subresource integrity

The one on this page that is not a header. It is an HTML attribute, and it belongs here because it
finishes the sentence CSP starts: CSP says where script may come from, SRI pins what those bytes
have to be. An allowlisted CDN that gets compromised satisfies the policy perfectly.

`integrity` holds "a whitespace-separated list of cryptographic hashes of the content of the linked
resource", each "prefixed with an identifier for the hash algorithm used, followed by a dash, and
ending with the actual base64-encoded hash value". The prefixes allowed are `sha256`, `sha384` and
`sha512`, and it applies to `<script>` and to `<link>` whose `rel` is `stylesheet`, `preload` or
`modulepreload`. On a match "the browser will load the resource, otherwise it will refuse to load
the resource, and return a network error". Tampered bytes never execute.

`crossorigin` is not decoration on a cross-origin load. The check needs a CORS-enabled fetch, and
"by default, a resource loaded from a document's HTML is loaded in `no-cors` mode". The reason is a
side channel: without the rule, "subresource integrity could enable an attacker to derive
information about the content of a subresource, even when it's requested in `no-cors` mode", by
trying hashes and watching which loads succeed.

Two limits. The request still goes out, so the CDN still learns who fetched what and from where;
this is integrity, not privacy. And it pins one exact file, so every version bump is a new hash.

### The ones that are gone

`X-XSS-Protection` "was a feature of Internet Explorer, Chrome and Safari that stopped pages from
loading when they detected reflected cross-site scripting (XSS) attacks". As of this page's verified
date MDN marks it non-standard and deprecated, and warns that "in some cases, `X-XSS-Protection` can
create XSS vulnerabilities in otherwise safe websites", because a filter that strips what it takes
for the injection can be steered into stripping something else. MDN's advice is this page in one
line: "It is recommended that you use `Content-Security-Policy` instead of XSS filtering."

`X-Frame-Options` is superseded rather than theatre. `DENY` and `SAMEORIGIN` still work; the value
people reach for when neither fits never did. `ALLOW-FROM` is obsolete, and "Modern browsers that
encounter response headers with this directive will ignore the header completely", so a policy
written that way is no policy at all.

## Worked example

Four headers on every response, with the CSP split across lines for reading:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-8IBTHwOdqNKAWeKl' 'strict-dynamic';
  frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

The nonce is the only moving part, and it moves on every request:

```js
const csp = (nonce) =>
  `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; frame-ancestors 'none'`;

app.use((req, res, next) => {
  // New for every response. A value that repeats is an allowlist entry an
  // attacker can read out of view-source and paste into their own tag.
  res.locals.nonce = randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', csp(res.locals.nonce));
  next();
});
```

The template echoes that value onto the tags it trusts, and pins the one it does not own:

```html
<script nonce="{{ nonce }}">
  startApp();
</script>
<script
  src="https://cdn.example.com/chart-4.4.1.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

Note what is absent. No `X-XSS-Protection`, because a CSP without `'unsafe-inline'` is the control
that header was a guessing version of. No `X-Frame-Options`, because `frame-ancestors` covers it and
wins where both are read. On a site not built for a policy, send that same CSP as
`Content-Security-Policy-Report-Only` with a `report-to` endpoint first, then move it across.

## Traps

**The nonce is in the header, the nonce is on the tag, and the script is blocked anyway.** The two
came from different responses. Either it was generated once at boot or baked into a build, so it
repeats and stops being unguessable, or a CDN cached the HTML while the header stayed dynamic. It
has to be unique per request and identical between header and markup within that one response.

**A subdomain that was never migrated is unreachable, and stays that way for a year.**
`includeSubDomains` applied the policy to every name under the domain and `max-age=31536000` told
browsers to remember it for one. Editing the config does not take that back: `max-age=0` lands only
once a browser makes a secure request and reads it, and cannot be sent over plain HTTP. Ramp it.

**Every stylesheet stopped loading the day `nosniff` went on.** The server sends `.css` as
`text/plain`, and until now the browser sniffed its way past that. With `nosniff`, a response whose
destination is `style` and whose type is not `text/css` is blocked, and the same rule takes out any
script without a JavaScript MIME type. The header stopped hiding a wrong `Content-Type`. Fix the
type.

**Attribution went to zero after somebody set `Referrer-Policy: no-referrer`.** Nothing is sent now,
to anybody, so a cross-origin analytics tool cannot tell where a visit came from, and the next move
is usually `unsafe-url`, which hands over the full URL of every page. The default,
`strict-origin-when-cross-origin`, is the middle: cross-origin gets the origin and no path or query.

**A routine dependency bump blanked the page, and the console reports a blocked resource.** The
`integrity` value still pins the previous file, and SRI cannot tell your new build from a tampered
one. Regenerate the hash in the commit that changes the version, and pin an exact version in the
URL: `chart-4/chart.js` resolves to different bytes the day the CDN publishes 4.4.1.

**A scan reports a missing `X-XSS-Protection` header, and adding it makes the site less safe.** The
header is non-standard and deprecated as of this page's verified date, and MDN documents that it can
create XSS vulnerabilities in sites that had none. The value that is not a liability is `0`, and the
control the scan is groping for is a CSP without `'unsafe-inline'`.
