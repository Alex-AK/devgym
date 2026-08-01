# @devgym/handbook

The handbook is content, not code. A page is a markdown file with frontmatter, and adding one
touches no application source:

```
content/<section>/section.json   title, order, summary
content/<section>/<slug>.md      one page
```

The server reads this directory at runtime, so a new page shows up on the next request. No build
step, no import graph, no restart.

## What a page is

Not an article. It is what you would want open beside you while doing the workout, and it has a
fixed shape, defined in [PRD-v2.md](../../PRD-v2.md) phase 4:

1. **The question it answers**, phrased the way you would ask it at the moment you needed it. This
   is the `question` field.
2. **The model** — what is actually happening, not the API surface.
3. **A worked example** you can read in under a minute. Real code, ideally lifted out of a workout.
4. **The traps** — the two or three things that actually get got wrong, stated as symptoms first,
   because that is how you meet them.
5. **Where to practise it** — the `practise` field, resolved by the app into links.

A page that cannot fill the traps section honestly is a page nobody needed.

Parts 2 to 4 are `## The model`, `## Worked example` and `## Traps`, checked by exact heading text.
Write anything else you need around them.

## Frontmatter

```yaml
---
title: Server-Sent Events
question: How do I push updates to the browser without holding a WebSocket open?
order: 8
practise:
  - http-streaming-response
  - live-dashboard-sse
sources:
  - author: MDN
    title: Using server-sent events
    url: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
verified: 2026-08-01
---
```

- `practise` takes problem and workout slugs, mixed. Every one must resolve to something real.
- `sources` needs an author, a title and a canonical URL each. At least one, always.
- `verified` is the date the page's claims were last checked against those sources. It is shown on
  the page, which is the point: the content is largely machine-written, so say when it was checked.
- `order` places the page in its section. Pages without one sort last.

The parser takes a small YAML subset: strings, lists of strings, and lists of flat objects. Quote a
value that contains a colon followed by a space. Anything else is an error naming the file and line.

## The safety net

`pnpm verify` refuses a page that cites nothing, cites through a link shortener, points `practise`
at a slug that does not exist, or is missing part of the shape. That is the citation policy from
[PRD-v3-open-source.md](../../PRD-v3-open-source.md) enforced mechanically rather than by good
intentions.

Two rules it cannot check, and content review has to:

- **Name inspirations, do not reproduce them.** Pages are written fresh, in this project's words.
- **Paywalled sources are inspiration, never the load-bearing citation.** Credit the course that
  shaped the material, then make every claim checkable against an open reference. If no open
  reference exists for a claim, the claim does not ship.

Prose follows [WRITING.md](../../WRITING.md).
