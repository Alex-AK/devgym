---
title: Do not flatten it to an object
predict: What does `Object.fromEntries(new URLSearchParams('tag=sale&tag=new'))` return?
---

`Object.fromEntries` on params is the last place the multimap gets forgotten. It iterates every
pair, and a repeated key overwrites, so you keep the last value and lose the rest silently. This is
the bug that turns a two-tag filter into a one-tag filter with nothing to show for it.

Iterate the pairs when repeats matter, or reach for `getAll` on the keys that repeat. There is no
warning either way, which is why it is worth predicting once.

```js run
const params = new URLSearchParams('tag=sale&tag=new&page=2');

console.log('flattened', Object.fromEntries(params));
console.log('pairs    ', [...params]);
console.log('getAll   ', params.getAll('tag'));

// The count that gives it away, if you were counting.
console.log('keys', [...params.keys()].join(','));
```

```js assert
JSON.stringify(Object.fromEntries(new URLSearchParams('tag=sale&tag=new'))) === '{"tag":"new"}'
JSON.stringify([...new URLSearchParams('tag=sale&tag=new')]) === '[["tag","sale"],["tag","new"]]'
[...new URLSearchParams('tag=sale&tag=new&page=2').keys()].join(',') === 'tag,tag,page'
JSON.stringify(new URLSearchParams('tag=sale&tag=new&page=2').getAll('tag')) === '["sale","new"]'
```
