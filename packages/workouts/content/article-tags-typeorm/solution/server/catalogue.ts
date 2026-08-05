import { In } from 'typeorm';

import type { Workspace } from './db';

/**
 * The four writes the docs catalogue makes.
 *
 * All four go through `save`, which reads the row, merges what it was handed and
 * writes the difference. That read is what the change log is built on, and it is
 * also what makes the merge rules matter: an undefined property is one `save`
 * was not asked about, and a relation array is the whole set rather than an
 * addition to it.
 */

/** Move an article to a new status. */
export async function setStatus(
  workspace: Workspace,
  articleId: number,
  status: string
): Promise<void> {
  // `update` fires a bare UPDATE. It reads nothing first, so the subscriber it
  // wakes has no previous row and no list of changed columns, and the change log
  // gets nothing. `save` reads the row and hands the subscriber both.
  await workspace.articles.save({ id: articleId, status });
}

/** Put a tag on an article. Tagging it twice leaves one. */
export async function addTag(
  workspace: Workspace,
  articleId: number,
  tagName: string
): Promise<void> {
  const tag = await workspace.tags.findOneBy({ name: tagName });
  if (!tag) return;

  // The array handed to `save` is the article's whole tag set, so it has to
  // start from the tags already on it. Handing over `[tag]` alone deletes the
  // rest of the join rows rather than adding one.
  const article = await workspace.articles.findOne({
    where: { id: articleId },
    relations: { tags: true },
  });
  if (!article) return;
  if (article.tags.some((existing) => existing.id === tag.id)) return;

  article.tags.push(tag);
  await workspace.articles.save(article);
}

/** Take a tag out of use: off every article that carries it, then off the list. */
export async function retireTag(workspace: Workspace, tagName: string): Promise<void> {
  // Two reads, and the second is the point. A nested `where` on a relation
  // filters the relation it loads as well as the rows it matches, so the
  // articles a `where: { tags: { name } }` gives back carry that one tag and
  // none of their others. Saving those back sets that as the whole set.
  const carrying = await workspace.articles.find({
    select: { id: true },
    where: { tags: { name: tagName } },
  });

  if (carrying.length > 0) {
    const articles = await workspace.articles.find({
      where: { id: In(carrying.map((article) => article.id)) },
      relations: { tags: true },
    });

    for (const article of articles) {
      article.tags = article.tags.filter((tag) => tag.name !== tagName);
      await workspace.articles.save(article);
    }
  }

  await workspace.tags.delete({ name: tagName });
}

/** Archive an article. Archived articles are never reviewed again. */
export async function archive(workspace: Workspace, articleId: number): Promise<void> {
  // `null`, not `undefined`. `save` merges what it is handed onto the row it
  // read, and an undefined property is one it was not asked about, so the review
  // date survives being archived.
  await workspace.articles.save({ id: articleId, status: 'archived', reviewDueAt: null });
}
