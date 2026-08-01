# Search the product catalogue

There is a products table and a search box that does nothing yet. Wire it up.

## The task

Implement `searchProducts` in `src/server/products.ts`. It takes `{ q, page, limit }` and returns
`{ items, total, page, limit }`.

- **Match on name or SKU.** "LMP" should find the desk lamp even though its name says nothing about
  LMP.
- **Ignore case, match anywhere.** Searching "idget" finds "Blue Widget".
- **A blank search is not a search.** No term, an empty string or only spaces all mean "the whole
  catalogue".
- **What the user typed is text.** `%` and `_` mean something to `LIKE`, and the person in the search
  box does not know that. Searching "50%" returns the one product with "50%" in its name, not
  everything containing "50".
- **`total` is the number of matches**, not the number of rows on this page.
- **Order by name, ascending.** Twelve products are called "Refill pack", so name alone is not enough
  to put the rows in a settled order.

## Notes

Parameterised queries are not the answer to the fourth point. The parameter is safe from injection
and still read as a pattern, which is a different problem with a different fix.

Every statement is logged to `workspace.queries`, and the last checkpoint reads the `ORDER BY` out of
it to check the tie-break, since a database is allowed to return ties in a consistent order right up
until the day it doesn't.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Two queries per search is one more than you need. Look up how a window function gets you the page
  and the total together, and decide whether you would actually ship it.
- `%term%` cannot use a plain B-tree index. Find out what a trigram index changes, and what it costs.
- Rank the results so an exact SKU match comes above a partial name match, instead of alphabetically.
