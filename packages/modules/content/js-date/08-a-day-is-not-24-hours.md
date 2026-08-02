---
title: A day is not always 24 hours
predict: In London on 29 March 2026, how much local time passes between 00:30 UTC and 01:30 UTC?
---

Two hours of clock, one hour of time. The UK moves to summer time that morning, so the local clock
jumps from 00:59 to 02:00 and one of those hours does not exist.

Nothing about the timestamp changes: UTC has no daylight saving, so millisecond arithmetic stays
exact and `setUTCDate` always lands on the next UTC day. It is the *local* calendar that has 23-hour
and 25-hour days in it, which is why "add a day" and "add 86,400,000" are different operations.

```js run
const inLondon = (iso) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

console.log('00:30 UTC is', inLondon('2026-03-29T00:30:00Z'), 'in London');
console.log('01:30 UTC is', inLondon('2026-03-29T01:30:00Z'), 'in London');
```

```js assert
new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date('2026-03-29T00:30:00Z')) === '00:30'
new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date('2026-03-29T01:30:00Z')) === '02:30'
new Date('2026-03-29T00:30:00Z').getTime() + 86_400_000 === new Date('2026-03-30T00:30:00Z').getTime()
(() => { const d = new Date(Date.UTC(2026, 2, 29, 1, 0)); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString(); })() === '2026-03-30T01:00:00.000Z'
```
