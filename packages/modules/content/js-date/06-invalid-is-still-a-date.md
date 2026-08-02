---
title: An unparseable date is still a Date
predict: Is `new Date('nonsense') > new Date(0)` true or false?
---

Neither, in the sense you mean. An unparseable string gives you a real `Date` object whose timestamp
is `NaN`, so it passes every `instanceof` check you might guard with, and every comparison against it
is false, including the negation of the one you tried.

Check it the only way that works: `Number.isNaN(date.getTime())`.

```js run
const bad = new Date('nonsense');
console.log(bad instanceof Date, bad.getTime());
console.log('greater:', bad > new Date(0), 'or less:', bad <= new Date(0));
```

```js assert
new Date('nope') instanceof Date
Number.isNaN(new Date('nope').getTime())
(new Date('nope') > new Date(0)) === false && (new Date('nope') <= new Date(0)) === false
```
