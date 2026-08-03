---
title: set replaces, append adds
predict: Starting from `tag=sale&tag=new`, what is the query string after `set('tag', 'clearance')`?
---

`set` treats the key as single-valued: it removes every existing occurrence and leaves exactly one,
placed where the first old one was. `append` treats it as multi-valued and adds another.

The rule in practice: `set` for `page` or `sort`, where one value is the only thing that makes
sense, `append` for filters that genuinely repeat.

```js run
const replaced = new URLSearchParams('tag=sale&tag=new');
replaced.set('tag', 'clearance');
console.log('set   ', replaced.toString());

const added = new URLSearchParams('tag=sale&tag=new');
added.append('tag', 'clearance');
console.log('append', added.toString());

// set keeps the position of the first occurrence rather than moving to the end.
const positioned = new URLSearchParams('tag=sale&page=2&tag=new');
positioned.set('tag', 'clearance');
console.log('position', positioned.toString());
```

```js assert
(() => { const p = new URLSearchParams('tag=sale&tag=new'); p.set('tag', 'clearance'); return p.toString(); })() === 'tag=clearance'
(() => { const p = new URLSearchParams('tag=sale&tag=new'); p.append('tag', 'clearance'); return p.toString(); })() === 'tag=sale&tag=new&tag=clearance'
(() => { const p = new URLSearchParams('tag=sale&page=2&tag=new'); p.set('tag', 'clearance'); return p.toString(); })() === 'tag=clearance&page=2'
```
