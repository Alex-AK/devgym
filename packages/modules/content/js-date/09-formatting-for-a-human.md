---
title: Formatting for a human
predict: Which timezone does `toLocaleDateString()` use when you do not tell it one?
---

The host machine's, and the host machine's locale with it. That is the right default for a browser
and the wrong one for a server, where "the host machine" is a container in a region nobody chose.

Name both. `Intl.DateTimeFormat` takes a locale and a `timeZone`, and once you have said both, the
output is the same everywhere, which is the only way this is testable.

```js run
const shown = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date('2026-03-15T02:00:00Z'));

// The instant is the 15th in UTC and still the 14th in New York.
console.log(shown);
```

```js assert
new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date('2026-03-15T02:00:00Z')) === '2026-03-14'
```
