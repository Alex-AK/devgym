---
title: Resolving against a base
predict: What is `new URL('/v2/users', 'https://api.shop.dev/v1/orders').href`?
---

The two-argument constructor resolves the first argument against the base using the same rules a
browser uses for a link. A leading `/` means "from the origin root", so it discards the base path
entirely.

That is the detail that bites API clients: a base carrying a `/v1` prefix loses it the moment the
path starts with a slash. Without the leading slash it resolves against the base's directory, and an
absolute first argument ignores the base altogether, which is what makes this safe for joining a
path you did not write.

```js run
const base = 'https://api.shop.dev/v1/orders';

console.log('absolute path', new URL('/v2/users', base).href);
console.log('relative path', new URL('v2/users', base).href);
console.log('absolute url ', new URL('https://other.dev/x', base).href);

// The base's own last segment is not a directory, so it is dropped.
console.log('from a dir   ', new URL('v2/users', 'https://api.shop.dev/v1/').href);
```

```js assert
new URL('/v2/users', 'https://api.shop.dev/v1/orders').href === 'https://api.shop.dev/v2/users'
new URL('v2/users', 'https://api.shop.dev/v1/orders').href === 'https://api.shop.dev/v1/v2/users'
new URL('https://other.dev/x', 'https://api.shop.dev/v1/orders').href === 'https://other.dev/x'
new URL('v2/users', 'https://api.shop.dev/v1/').href === 'https://api.shop.dev/v1/v2/users'
```
