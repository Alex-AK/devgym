# @hone/paths

The essentials path is content, not code. One session is a JSON manifest, and adding one touches no
application source:

```
content/<slug>/path.json
```

The server reads this directory at runtime, so a new session shows up on the next request. No build
step, no import graph, no restart.

## What a session is

An hour on one slice of the work, and the deliberate opposite of the daily queue. The queue answers
"what should I practise today" and stays interleaved and spaced, because that is what retention
wants. A session here is blocked and ordered, because that is what building a model the first time
wants. Both are correct, at different stages, for different jobs.

The shape of the hour:

| Part  | Budget | What it is                                                    |
| ----- | ------ | ------------------------------------------------------------- |
| Read  | 20 min | Two or three handbook pages, in order, building on each other |
| Prove | 15 min | Six to ten reps drawn from those pages, in a fixed order      |
| Build | 20 min | One workout, where a fitting one exists                       |
| Slack | 5 min  | An hour that needs all sixty minutes is an hour that overruns |

A session without a workout is fine and spends the time on more reps. A session that cannot fill
the read step from existing pages is not ready to be written.

## The manifest

```jsonc
{
  "slug": "calling-an-api",
  "title": "What actually happens when you call an API",
  "question": "What actually happens when you call an API?",
  "summary": "One request, one response, and the parts of each that decide what you get back.",
  "order": 1,
  "minutes": 60,
  "steps": [
    { "kind": "page", "ref": "moving-data/request-response", "note": "Start here." },
    { "kind": "problem", "ref": "http-fetch-not-ok" },
    { "kind": "workout", "ref": "conditional-requests-express" },
  ],
}
```

- `question` is the question the hour answers, and the test of whether the slice is coherent. A
  session you cannot name this way is two sessions or none.
- `ref` is `section/slug` for a page and a bare slug for anything else. Every one must resolve.
- `note` is optional and says why the step is here, not what it contains. Most steps need none.
- `kind` is `page`, `problem` or `workout`. `module` is reserved in the type and refused by the
  loader until modules exist.
- `order` places the session on the path and is unique across sessions.

## The rules, and the first one is the one that will get broken

- **The path is a subset, deliberately and permanently.** Most content is not on it and never will
  be. The test for including something: would leaving it out make the hour's slice incoherent? Not
  "is it good", which everything here is meant to be. If every page eventually appears on some
  session, the path has become an index and has stopped being a recommendation.
- **A session is one slice, not one section.** The most valuable ones cut across sections, because
  that is how the work does. "Why the page is slow" is a React page, a database page and an N+1 rep.
- **Order is fixed and meaningful.** Read, then prove, then build. The reps come after the pages
  that explain them, which is the opposite of the daily queue's job. The loader enforces it.
- **No new progress tracking.** The reps inside a session carry their own progress, and that is the
  honest measure of whether the hour landed. A session shows you where you left off; it does not
  score you.

## The safety net

`paths.spec.ts` refuses a session whose `ref` points at nothing, whose steps run out of order,
which has no page step or no problem step, or which collides with another session's `order`. That
is the same safety net that already checks a handbook page's `practise` slugs resolve.

Prose follows [WRITING.md](../../WRITING.md). The authoring rules live in
[docs/content.md](../../docs/content.md).
