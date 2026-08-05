import type { Workspace } from './db';

/**
 * The four writes the docs catalogue makes. Everything the editor and the
 * tidy-up scripts do goes through these.
 */

/** Move an article to a new status. */
export async function setStatus(
  workspace: Workspace,
  articleId: number,
  status: string
): Promise<void> {
  await workspace.articles.update(articleId, { status });
}

/** Put a tag on an article. Tagging it twice leaves one. */
export async function addTag(
  workspace: Workspace,
  articleId: number,
  tagName: string
): Promise<void> {
  const tag = await workspace.tags.findOneBy({ name: tagName });
  if (!tag) return;

  await workspace.articles.save({ id: articleId, tags: [tag] });
}

/** Take a tag out of use: off every article that carries it, then off the list. */
export async function retireTag(workspace: Workspace, tagName: string): Promise<void> {
  const carrying = await workspace.articles.find({
    relations: { tags: true },
    where: { tags: { name: tagName } },
  });

  for (const article of carrying) {
    article.tags = article.tags.filter((tag) => tag.name !== tagName);
    await workspace.articles.save(article);
  }

  await workspace.tags.delete({ name: tagName });
}

/** Archive an article. Archived articles are never reviewed again. */
export async function archive(workspace: Workspace, articleId: number): Promise<void> {
  await workspace.articles.save({ id: articleId, status: 'archived', reviewDueAt: undefined });
}
