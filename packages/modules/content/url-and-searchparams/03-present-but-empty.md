---
title: Present, but empty
predict: For `?debug`, what does `searchParams.get('debug')` return?
---

A valueless param parses as the key with an empty-string value. So `get` hands you `''`, which is
falsy, and `if (params.get('debug'))` reports the flag as off while it is plainly in the URL.

`has` answers the question you were actually asking, and returns a boolean.

```js run
const params = new URLSearchParams('?debug&page=2');

console.log('get       ', JSON.stringify(params.get('debug')));
console.log('truthiness', Boolean(params.get('debug')));
console.log('has       ', params.has('debug'));

// And for a key that really is absent.
console.log('has missing', params.has('verbose'));
```

```js assert
new URLSearchParams('?debug').get('debug') === ''
Boolean(new URLSearchParams('?debug').get('debug')) === false
new URLSearchParams('?debug').has('debug') === true
new URLSearchParams('?debug').has('verbose') === false
```
