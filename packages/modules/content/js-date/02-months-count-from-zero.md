---
title: Months count from zero, days do not
predict: `new Date(Date.UTC(2026, 11, 25))` is which date?
---

Months are 0 to 11. Days of the month are 1 to 31. Two adjacent arguments to the same call, two
different bases, and no error if you get it wrong: you just land in the wrong month.

`getMonth()` reads back the same way, which is why `month + 1` litters date-formatting code.

```js run
console.log(new Date(Date.UTC(2026, 11, 25)).toISOString().slice(0, 10));
console.log(new Date(Date.UTC(2026, 0, 15)).getUTCMonth());
```

```js assert
new Date(Date.UTC(2026, 0, 15)).getUTCMonth() === 0
new Date(Date.UTC(2026, 11, 25)).toISOString().slice(0, 10) === '2026-12-25'
new Date(Date.UTC(2026, 0, 1)).getUTCDate() === 1
```
