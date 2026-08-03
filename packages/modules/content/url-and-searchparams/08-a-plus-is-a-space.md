---
title: A plus is a space
predict: What does `new URLSearchParams('q=C++').get('q')` return?
---

Query strings decode as `application/x-www-form-urlencoded`, where a literal `+` means a space. A
holdover from HTML form submission, and it does not apply to the path portion of a URL. So a search
for `C++` concatenated straight into a URL survives the wire and arrives as two spaces.

A literal plus has to be `%2B`. Note the asymmetry going the other way: `URLSearchParams` writes a
space as `+`, `encodeURIComponent` writes it as `%20`, and both decode correctly. Mixing the two by
hand is where the confusion comes from.

```js run
console.log('naive     ', JSON.stringify(new URLSearchParams('q=C++').get('q')));
console.log('encoded   ', new URLSearchParams({ q: 'C++' }).toString());
console.log('round trip', JSON.stringify(new URLSearchParams('q=C%2B%2B').get('q')));

// Spaces, encoded two different ways, decoded the same.
console.log('space out params', new URLSearchParams({ q: 'a b' }).toString());
console.log('space out escape', encodeURIComponent('a b'));
console.log('space back      ', JSON.stringify(new URLSearchParams('q=a%20b').get('q')));
```

```js assert
new URLSearchParams('q=C++').get('q') === 'C  '
new URLSearchParams({ q: 'C++' }).toString() === 'q=C%2B%2B'
new URLSearchParams('q=C%2B%2B').get('q') === 'C++'
new URLSearchParams({ q: 'a b' }).toString() === 'q=a+b'
encodeURIComponent('a b') === 'a%20b'
new URLSearchParams('q=a%20b').get('q') === 'a b'
new URLSearchParams('q=a+b').get('q') === 'a b'
```
