---
title: An instant, not a date
predict: What does `new Date(0).getTime()` return?
---

A `Date` holds exactly one number: milliseconds since 1970-01-01T00:00:00Z. Not a calendar date,
not a timezone, not a wall clock. MDN calls it the timestamp, and everything else you can ask a
`Date` for is computed from it on demand.

That is the whole model, and most `Date` surprises are it leaking through.

```js run
const epoch = new Date(0);
console.log(epoch.getTime());

// The unary plus and getTime() are the same question.
console.log(+new Date(1_700_000_000_000));
```

```js assert
new Date(0).getTime() === 0
+new Date(1_700_000_000_000) === 1_700_000_000_000
```
