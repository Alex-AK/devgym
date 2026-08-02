---
title: toISOString is always UTC
predict: Run somewhere three hours behind UTC, what does `new Date(Date.UTC(2026, 2, 15, 23, 0)).toISOString()` start with?
---

`toISOString()` renders the timestamp in UTC, always, with a `Z` on the end. It does not care where
the machine is, which makes it the one formatting method that is safe to compare, log and store.

The trap is on the other side: `slice(0, 10)` of an ISO string gives you the UTC date, and that is
not always the date the user is having.

```js run
const instant = new Date(Date.UTC(2026, 2, 15, 23, 0));
console.log(instant.toISOString());
console.log('date part:', instant.toISOString().slice(0, 10));
```

```js assert
new Date(Date.UTC(2026, 2, 15, 23, 0)).toISOString() === '2026-03-15T23:00:00.000Z'
new Date(Date.UTC(2026, 2, 15, 23, 0)).toISOString().endsWith('Z')
```
