---
title: A URL is parsed, not spliced
predict: For `new URL('https://shop.dev/search?tag=sale&page=2')`, what does `url.search` return?
---

`URL` takes a string apart into `origin`, `pathname`, `search` and `hash`, and each part is
available separately. `search` is still raw text, and it keeps the leading `?`.

The parsed half lives on `searchParams`, which is where the rest of this module goes. Everything
that follows exists because reaching for the raw string instead is what goes wrong.

```js run
const url = new URL('https://shop.dev/search?tag=sale&page=2');

console.log('search  ', url.search);
console.log('pathname', url.pathname);
console.log('origin  ', url.origin);

// The parsed view of the same thing.
console.log('page    ', url.searchParams.get('page'));
```

```js assert
new URL('https://shop.dev/search?tag=sale&page=2').search === '?tag=sale&page=2'
new URL('https://shop.dev/search?tag=sale&page=2').pathname === '/search'
new URL('https://shop.dev/search?tag=sale&page=2').origin === 'https://shop.dev'
new URL('https://shop.dev/search?tag=sale&page=2').searchParams.get('page') === '2'
```
