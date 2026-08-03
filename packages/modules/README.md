# @hone/modules

A module is content, not code. One directory is one module, and adding one touches no application
source:

```
content/<slug>/module.json     title, summary, order, minutes, practise, sources, verified
content/<slug>/01-<step>.md    steps, ordered by the filename prefix
content/<slug>/02-<step>.md
```

The server reads this directory at runtime, so a new module shows up on the next request.

## What a module is for

One sitting with one API: 15 to 25 minutes, ordered steps, and at every step you commit to an answer
before the answer appears. The other three content types all assume you already know the thing you
are practising. A module is for the APIs you use constantly and understand shallowly, where the
problem is not being stuck but holding a wrong model that has never cost enough to notice.

**A model is a page. An API is a module.** A step that cannot pose a question with a definite answer
is a handbook page and belongs there.

## A step

Markdown with `title` and `predict` in frontmatter, then prose, then two tagged fences:

````md
---
title: Two string formats, two timezones
predict: Are `new Date('2026-03-15')` and `new Date('2026-03-15T00:00:00')` the same instant?
---

Prose, a paragraph or two. This is read after answering the predict question.

```js run
console.log(new Date('2026-03-15').toISOString());
```

```js assert
new Date('2026-03-15').getTime() === Date.UTC(2026, 2, 15);
```
````

- The `run` fence is prefilled into the editor and the reader can change it, which is most of the
  value: the step is a place to try the next question that occurs to you.
- The `assert` fence is **one expression per line**, each of which must evaluate to `true` after the
  snippet. They run through the same code runner that grades `js-code` problems, so the IIFE rule
  carries over: wrap multi-step setup in `(() => { ... })()` on a single line.
- `predict` is a question with a definite answer. If it has no definite answer, that is a page.

## Assertions have to hold everywhere

The runner has no fake clock and no fixed timezone, so an assertion that depends on the machine's
zone will pass for its author and fail for the next reader. Write assertions that hold in any zone:
compare against `Date.UTC(...)`, state the relationship through `getTimezoneOffset()`, or name the
zone explicitly with `Intl.DateTimeFormat`. The `js-date` module is the worked example, and its
assertions were checked in five zones before it shipped.

## Non-goals

No progress tracking, for the same reason handbook pages get none: the problems are the progress
tracking, and a module's `practise` list is how it reaches your queue afterwards. No branching, so a
module that needs a decision tree is two modules. No enrolment, no percentage complete.

## The safety net

`modules.spec.ts` runs every step's assertions against its own snippet and refuses a module whose
step has no predict question, whose `practise` points at a slug that does not exist, or which cites
nothing. Prose follows [WRITING.md](../../WRITING.md); the authoring rules are in
[docs/content.md](../../docs/content.md).
