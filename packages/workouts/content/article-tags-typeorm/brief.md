# Retiring one tag took the rest with it

The docs catalogue was tidied on Tuesday. The `beta` tag was retired across the site, and every
article that carried it came back with no tags at all: not only `beta`, everything it had.

Three more complaints arrived the same afternoon:

- Putting a tag on an article empties the tags it already had.
- Archived articles keep turning up in the Monday review reminder. Archiving is meant to take an
  article out of the review rota for good.
- The change log has not gained a row since the catalogue shipped, so the compliance export has
  nothing in it.

## The task

`src/server/catalogue.ts` is yours. `src/server/db.ts` and `src/server/entities.ts` build the
catalogue and are not editable.

What has to be true when you are done:

- **Retiring a tag takes that tag and no other.** Every other tag on those articles stays, articles
  that never carried it are untouched, and the tag itself comes off the list.
- **Adding a tag keeps the tags the article already had**, and adding the same one twice leaves one.
- **Archiving an article clears its review date** and leaves the rest of the row alone.
- **Every column a write moves leaves a row in `article_changes`**, naming the column, the value it
  held and the value it holds now.
- The four functions keep the names and signatures they have, and the checkpoints call all four with
  `await`. Everything else in the file is yours to move.
- No new dependency.

## Notes

The entities are `EntitySchema` definitions rather than decorated classes, so the columns are named
exactly like the properties.

```ts
Article { id, slug, title, status, reviewDueAt: string | null, author: Author, tags: Tag[] }
Tag     { id, name }
Author  { id, name }
```

`tags` is many-to-many, over a join table called `article_tags`.

`workspace.articles`, `workspace.tags`, `workspace.authors` and `workspace.changes` are TypeORM
repositories, so `createQueryBuilder` is there if you want it. `workspace.dataSource.query` runs raw
SQL. `workspace.queries` holds every statement the catalogue has run, with the number of rows that
came back on each.

`db.ts` registers a subscriber on the article entity, and it is the only thing that writes
`article_changes`. It records one row per column that moved, with the value before and the value
after. A column cleared is written down as an empty string rather than as the word null.

The catalogue starts as five articles, five tags and two authors, with an empty change log:

| id  | slug                | status    | reviewDueAt | author | tags                |
| --- | ------------------- | --------- | ----------- | ------ | ------------------- |
| 1   | `webhooks-overview` | published | 2026-03-01  | Ana    | beta, api, billing  |
| 2   | `rate-limits`       | published | 2026-06-14  | Bo     | beta                |
| 3   | `search-syntax`     | draft     | none        | Ana    | api, search         |
| 4   | `legacy-tokens`     | published | 2026-01-20  | Bo     | deprecated, billing |
| 5   | `changelog`         | published | 2026-05-11  | Ana    | none                |

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- `retireTag` walks the articles one at a time. `createQueryBuilder().relation('tags').of(id)` writes
  a join row without loading the article at all. Work out what that buys you and what it costs.
- `setStatus` on an id that is no article: `update` reports `affected: 0` and says nothing. Find out
  what `save` does with the same id, and decide which of the two an endpoint should be built on.
- Nothing records a tag going on or coming off an article, because tags are not a column on it. Work
  out where that row would have to be written from, and whether the subscriber can see enough to
  write it.
