---
title: A multimap, not a map
predict: With `?tag=sale&tag=new`, what does `searchParams.get('tag')` return?
---

A key can appear any number of times, and the order it appeared in is kept. `get` returns the
**first** value as a string, never an array and never a merge. `getAll` returns every value.

The two disagree on absence as well, and the difference is worth knowing before you write the
null check: `get` gives you `null`, `getAll` gives you an empty array you can map over directly.

```js run
const url = new URL('https://shop.dev/search?tag=sale&tag=new&page=2');

console.log('get   ', url.searchParams.get('tag'));
console.log('getAll', url.searchParams.getAll('tag'));

// Absent keys, where the two part company.
console.log('missing get   ', url.searchParams.get('colour'));
console.log('missing getAll', url.searchParams.getAll('colour'));
```

```js assert
new URL('https://shop.dev/s?tag=sale&tag=new').searchParams.get('tag') === 'sale'
JSON.stringify(new URL('https://shop.dev/s?tag=sale&tag=new').searchParams.getAll('tag')) === '["sale","new"]'
new URLSearchParams('tag=sale').get('colour') === null
JSON.stringify(new URLSearchParams('tag=sale').getAll('colour')) === '[]'
```
