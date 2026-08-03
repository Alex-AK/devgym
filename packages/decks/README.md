# @devgym/decks

A deck is content, not code. One directory is one deck, and adding one touches no application source:

```
content/<slug>/deck.json     title, summary, order, minutes, page, practise, sources, verified, cards
```

The server reads this directory at runtime, so a new deck shows up on the next request. The reader
sees "Cards"; the code, the package and the API say "deck".

## What a deck is for

Drilling a contrast set on purpose: `INNER` against `LEFT` against `FULL`, 301 against 302 against
307, `null` against `undefined`. Two-sided cards, a few seconds each, a run rather than a rep in a
queue.

**A deck is where cards are written and checked, not somewhere the reader goes.** The app shuffles
every card in the library into one run and never offers a deck to choose. So the deck's job here is
the `page` it cites: every card in this file has to be checkable against that one page, which is why
the set has to hang together even though nobody will ever meet it as a set.

The daily queue refuses this material, and that refusal is right: a definitional rep there displaces
a rep about doing the work. It stops holding the moment you have opted in to drill the distinction,
because then the definition is exactly the point. So a deck sits outside the round robin and is never
dealt to a morning session.

## The manifest

```jsonc
{
  "slug": "the-join-family",
  "title": "The join family",
  "summary": "Which join keeps the unmatched rows, and what happens to them next.",
  "order": 1,
  "minutes": 5,
  "page": "sql/what-a-join-does",
  "practise": ["sql-anti-join", "sql-not-exists"],
  "sources": [{ "author": "PostgreSQL", "title": "Table Expressions", "url": "https://..." }],
  "verified": "2026-08-02",
  "cards": [
    {
      "id": "inner-against-left",
      "front": "What is in one result and not the other?",
      "back": "The left rows that matched nothing.",
    },
  ],
}
```

- `slug` matches the directory name. `order` places the deck and is unique across decks.
- `page` is a `section/slug` handbook reference and is **required**. A deck cites the page rather
  than teaching the material again, which is also what makes a card checkable.
- `practise` is one or more problem or workout slugs, resolved the way a page's list is. It is how a
  deck reaches your queue afterwards.
- `sources` and `verified` mean what they mean everywhere else, and the citation policy applies
  unchanged.
- `cards` is 4 to 12 of them. Fewer is not a sitting; more is two decks.

## A card

`id` is kebab-case and unique within the deck. `front` and `back` are markdown, **single line**, and
capped at 160 and 400 characters. The cap is the format: a card that needs a paragraph is a handbook
page, and the page is already cited.

A front is a question with a definite answer. A back answers it in the first sentence and spends the
rest on the one number or the one query that makes it stick.

## Cards are self-graded

You flip, you say whether you had it, and nothing is written down. Reusing the `short-text` matcher
was considered and declined: free recall of a phrase is exactly where a matcher is wrong often
enough to matter, and being marked wrong on an answer you knew is the fastest way to stop opening a
deck.

## Non-goals

No progress tracking, for the same reason modules and handbook pages get none: the reps a deck cites
are the progress tracking. Nothing is persisted, so there is no table, no schedule of its own and no
effect on the review ladder. No enrolment, no percentage complete, no streaks on decks.

## The safety net

`decks.spec.ts` refuses a deck whose `page` or `practise` slug points at nothing, whose cards are too
few or too many, which repeats a card id, or which puts a newline in a card. What it cannot check is
whether a card is **true**: a module gets that free because its assertions run, and a card has
nothing to run. That is why `page` and `sources` are required, and why every claim on a card has to
be checkable against the page it cites.

Prose follows [WRITING.md](../../WRITING.md). The authoring rules live in
[docs/content.md](../../docs/content.md).
