---
title: The params write through to the URL
predict: After `url.searchParams.delete('tag')`, what is `url.href`?
---

`url.searchParams` is a live view, not a copy. Mutating it updates `url.search` and `url.href`
immediately, so there is nothing to reassign and no string to rebuild.

That is only true for params reached through a `URL`. A standalone `new URLSearchParams(str)` is
detached: changing it changes nothing else. `delete` removes every occurrence of the key, which is
what you want when clearing a multi-valued filter.

```js run
const url = new URL('https://shop.dev/s?tag=sale&tag=new&page=2');

url.searchParams.delete('tag');
console.log('after delete', url.href);

url.searchParams.set('page', '3');
console.log('after set   ', url.href);

// Detached: this one owns no URL.
const loose = new URLSearchParams('page=2');
loose.set('page', '9');
console.log('loose', loose.toString(), '| url still', url.search);
```

```js assert
(() => { const u = new URL('https://shop.dev/s?tag=sale&tag=new&page=2'); u.searchParams.delete('tag'); return u.href; })() === 'https://shop.dev/s?page=2'
(() => { const u = new URL('https://shop.dev/s?page=2'); u.searchParams.set('page', '3'); return u.href; })() === 'https://shop.dev/s?page=3'
(() => { const u = new URL('https://shop.dev/s?page=2'); u.searchParams.delete('page'); return u.href; })() === 'https://shop.dev/s'
```
