---
title: Two string formats, two timezones
predict: Are `new Date('2026-03-15')` and `new Date('2026-03-15T00:00:00')` the same instant?
---

Only if you happen to be sitting in UTC. MDN states the rule exactly: **when the time zone offset
is absent, date-only forms are interpreted as a UTC time and date-time forms are interpreted as a
local time.** MDN also says why, which is worth knowing so you stop expecting it to make sense: a
historical spec error, inconsistent with ISO 8601, kept because the web depends on it.

So adding a time to a string changes which timezone it is read in. This is the single most expensive
thing on this page, and it reaches production from laptops set to UTC, where the two agree.

```js run
console.log(new Date('2026-03-15').toISOString());
console.log(new Date('2026-03-15T00:00:00').toISOString());
console.log('offset in minutes:', new Date('2026-03-15T00:00:00').getTimezoneOffset());
```

```js assert
new Date('2026-03-15').getTime() === Date.UTC(2026, 2, 15)
new Date('2026-03-15T00:00:00').getTime() - Date.UTC(2026, 2, 15) === new Date('2026-03-15T00:00:00').getTimezoneOffset() * 60_000
```
