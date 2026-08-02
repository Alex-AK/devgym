---
title: Comparing two dates
predict: What does `new Date(0) === new Date(0)` give?
---

`false`, because those are two objects and `===` compares references. The relational operators are
different: `<`, `>` and `-` coerce to a number first, so they compare the timestamps and do what you
wanted.

Which leaves `==` and `===` as the two that quietly do the wrong thing. Compare `+a === +b`, or
`a.getTime() === b.getTime()`, and subtract to get a duration in milliseconds.

```js run
console.log(new Date(0) === new Date(0));
console.log(+new Date(0) === +new Date(0));
console.log('a day in ms:', new Date(Date.UTC(2026, 0, 2)) - new Date(Date.UTC(2026, 0, 1)));
```

```js assert
(new Date(0) === new Date(0)) === false
+new Date(0) === +new Date(0)
new Date(Date.UTC(2026, 0, 2)) - new Date(Date.UTC(2026, 0, 1)) === 86_400_000
```
