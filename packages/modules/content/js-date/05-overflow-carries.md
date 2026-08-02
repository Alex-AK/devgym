---
title: Out-of-range components carry
predict: What date is `new Date(Date.UTC(2026, 0, 32))`?
---

A component outside its range is not an error. MDN: it "carries over to" or "borrows from" the
higher segment, so day 32 of January is the 1st of February and day 0 of a month is the last day of
the one before.

That is genuinely useful for arithmetic, and it is exactly what makes month arithmetic wrong. 2026 is
not a leap year, so the 31st of January plus one month is the 31st of February, which carries.

```js run
console.log(new Date(Date.UTC(2026, 0, 32)).toISOString().slice(0, 10));

const endOfJanuary = new Date(Date.UTC(2026, 0, 31));
endOfJanuary.setUTCMonth(endOfJanuary.getUTCMonth() + 1);
console.log('a month after 31 January:', endOfJanuary.toISOString().slice(0, 10));
```

```js assert
new Date(Date.UTC(2026, 0, 32)).toISOString().slice(0, 10) === '2026-02-01'
(() => { const d = new Date(Date.UTC(2026, 0, 31)); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); })() === '2026-03-03'
```
