---
title: Four ways to build one
predict: What does `new URLSearchParams({ q: 'shoes', size: '42' }).toString()` return?
---

The constructor takes a plain object, an array of pairs, a query string, or another
`URLSearchParams`. No loop, and no template literal.

`toString` joins with `&` and deliberately omits the leading `?`, so you write `` `${url}?${params}` ``
when you need one. Note what the object form cannot do: an object has one value per key, so
repeating a key needs the array-of-pairs form.

```js run
console.log('object ', new URLSearchParams({ q: 'shoes', size: '42' }).toString());
console.log('pairs  ', new URLSearchParams([['tag', 'sale'], ['tag', 'new']]).toString());
console.log('string ', new URLSearchParams('?tag=sale&page=2').toString());
console.log('copy   ', new URLSearchParams(new URLSearchParams('page=2')).toString());

// No leading question mark, which is why the ? is yours to add.
console.log('joined', `https://shop.dev/search?${new URLSearchParams({ q: 'shoes' })}`);
```

```js assert
new URLSearchParams({ q: 'shoes', size: '42' }).toString() === 'q=shoes&size=42'
new URLSearchParams([['tag', 'sale'], ['tag', 'new']]).toString() === 'tag=sale&tag=new'
new URLSearchParams('?tag=sale&page=2').toString() === 'tag=sale&page=2'
new URLSearchParams({ q: 'shoes' }).toString().startsWith('?') === false
`https://shop.dev/search?${new URLSearchParams({ q: 'shoes' })}` === 'https://shop.dev/search?q=shoes'
```
