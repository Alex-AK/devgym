# Writing guide

How devgym is written. This applies to everything a user reads: problem prompts, hints,
explanations, grader feedback, workout briefs, checkpoint hints, handbook pages, UI strings, and
the repo docs. It's written for two audiences at once: human contributors, and the LLM sessions
that produce most of the content. Both drift toward the same failure, which is prose that sounds
like writing instead of sounding like help.

## Who you're writing for

Someone mid-exercise, with a timer running and their attention on the problem. Your sentence is
an interruption. Earn it: say the one thing they need, then get out of the way. A hint is read at
the moment of being stuck. Feedback is read at the moment of failure. An explanation is read in
the thirty seconds after solving, which is the whole teachable moment. None of these situations
has room for a paragraph that clears its throat.

## Voice

Plain, direct, and confident. Write the way a good colleague talks at a whiteboard: contractions,
second person, present tense, and the point first. If a sentence could open with its conclusion,
open with its conclusion.

State facts as facts. Hedging belongs only where uncertainty is real, and then it should be
specific ("SQLite before 3.35 lacks this") rather than reflexive ("this may vary").

## Accuracy

This project's about page admits the content is largely machine-written and largely unreviewed.
That makes accuracy a writing rule, not just a research rule:

- Claim only what you verified: against official docs, against a cited source, or by running the
  code. If you can't check it, cut it.
- Numbers are exact or absent. "About 40,000 rows" only when the seed really makes 40,000.
- Lead with the symptom, then name the concept. "The second page repeats a row" teaches; a
  paragraph that opens with "keyset pagination" gets skimmed. This is the same rule PRD-v2 sets
  for handbook traps, and it applies to hints and feedback too.

## Brevity, without terseness

Brevity means fewer ideas, not amputated sentences. Cut the information that doesn't change what
the reader does next; write what's left in complete sentences. A hint that names one thing beats
a hint that lists four. If a problem needs three caveats explained, the problem is trying to
teach three things, and that's a content bug, not a writing challenge.

One idea per sentence is a good default. So is deleting the last sentence you wrote and checking
whether anything was lost.

## Cut these

The tells that mark copy as filler, machine-made or otherwise:

- Warm-up openers: "It's important to note", "Keep in mind", "In this problem, we will". Start
  with the point instead.
- Cheerleading: "Great job", "Nice try", exclamation marks in feedback. The verdict is the
  feedback; enthusiasm from a grader reads as noise.
- Résumé adjectives: comprehensive, robust, seamless, powerful, crucial, essential, elegant.
  Also the verbs that come with them: delve, leverage, utilize, explore, dive into. Prefer is,
  has, use, read, run.
- "Simply" and "just". If it were simple, the reader wouldn't be reading a hint.
- Hedges on checkable facts: "typically", "in most cases", "should" when the actual behavior can
  be looked up or run. Look it up, then say what happens.
- Recaps. If the previous paragraph said it, the next one doesn't get to say it again.
- Three balanced items in every sentence. One triple can be load-bearing; a page of them sounds
  generated.

## Mechanics

- Sentence-case headings.
- Em dashes stay rare. Use a colon to introduce, commas or parentheses for asides, or a second
  sentence. The one em dash you keep should be doing real work. One structural exception: a
  `label — definition` pair at the start of a list item is a glossary pattern, not prose, and
  keeps its dash.
- Never strip em dashes with a bulk regex: it mangles paired-dash asides. Rewrite by hand and
  diff any sentence that contained a pair.
- Bold is for the rare load-bearing phrase. No emoji. Straight quotes.
- Prettier owns formatting; don't fight it by hand.

## Examples

Before and after, in this project's own content types.

A hint:

> Before: "It's important to remember that the dependency array plays a crucial role in
> determining when your effect re-runs, so you'll want to carefully consider which values you
> include in it."
>
> After: "The effect re-runs when a dependency changes. Something it reads isn't in the array."

Grader feedback:

> Before: "Good attempt! However, it's worth noting that `LIKE` patterns can potentially match
> unexpected rows because `%` acts as a wildcard character."
>
> After: "`%` is a wildcard in `LIKE`, so searching for 50% matches every name containing 50."

A brief:

> Before: "In this workout, we'll dive deep into the fascinating world of rate limiting,
> exploring various strategies and their trade-offs along the way."
>
> After: "Clients are hammering the export endpoint. Add a fixed-window limiter as middleware:
> 10 requests a minute per client, honest headers, and a window that actually turns over."

## The test

Two questions, applied to every sentence. Would you say it out loud to the person sitting next
to you mid-exercise? And if you deleted it, would the reader do anything differently? A sentence
that fails both gets cut, whoever wrote it.
