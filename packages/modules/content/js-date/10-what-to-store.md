---
title: What to store
predict: A birthday and a meeting time: which of the two is an instant?
---

The meeting. It happens at one moment for everybody, so store the instant: an ISO string with a `Z`,
or epoch milliseconds, and render it in the viewer's zone.

A birthday is not an instant. It is a date on a calendar, the same date wherever you are, and putting
it in a `Date` is how it becomes the day before for half your users. Store `'1996-04-23'` as text.

The third case is the one that catches people: a recurring local event, like a 09:00 standup. That is
a local time plus a timezone name, not an instant, because the correct UTC instant changes when the
zone's offset does.

```js run
const meeting = new Date(Date.UTC(2026, 2, 15, 12));
const stored = meeting.toISOString();
console.log(stored);

// Round trips exactly, which is the property you are storing it for.
console.log(new Date(stored).getTime() === meeting.getTime());
```

```js assert
new Date(new Date(Date.UTC(2026, 2, 15, 12)).toISOString()).getTime() === Date.UTC(2026, 2, 15, 12)
```
