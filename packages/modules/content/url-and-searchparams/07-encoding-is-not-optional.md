---
title: Encoding is not optional
predict: What does `new URLSearchParams({ q: 'a&b' }).toString()` return?
---

`&`, `=` and `?` have structural meaning in a query string, so a value containing one has to be
escaped or it changes the shape of the URL. Concatenating `'?q=' + 'a&b'` does not produce a `q` of
`a&b`; it produces two params.

`URLSearchParams` encodes by construction and you cannot forget. Building the string by hand needs
`encodeURIComponent`, not `encodeURI`: the latter is for a whole URL and deliberately spares the
characters that would hurt you here.

```js run
console.log('params      ', new URLSearchParams({ q: 'a&b' }).toString());
console.log('component   ', encodeURIComponent('a&b'));
console.log('whole url   ', encodeURI('a&b'));

// What the naive version actually produces.
const naive = new URLSearchParams('?q=' + 'a&b');
console.log('naive q     ', JSON.stringify(naive.get('q')));
console.log('naive keys  ', [...naive.keys()].join(','));
```

```js assert
new URLSearchParams({ q: 'a&b' }).toString() === 'q=a%26b'
encodeURIComponent('a&b') === 'a%26b'
encodeURI('a&b') === 'a&b'
new URLSearchParams('?q=' + 'a&b').get('q') === 'a'
[...new URLSearchParams('?q=' + 'a&b').keys()].join(',') === 'q,b'
new URLSearchParams(new URLSearchParams({ q: 'a&b' }).toString()).get('q') === 'a&b'
```
