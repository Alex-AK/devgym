import type { Workspace } from '../../src/server/db';

/**
 * What the three tables hold, read straight out of sqlite with none of the
 * catalogue's code and none of TypeORM's entity hydration in the way. A write is
 * judged on the rows it left behind.
 */

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  status: string;
  reviewDueAt: string | null;
  authorId: number;
}

export interface ChangeRow {
  articleId: number;
  field: string;
  before: string;
  after: string;
}

export async function articleRows(workspace: Workspace): Promise<ArticleRow[]> {
  return (await workspace.dataSource.query(
    'SELECT id, slug, title, status, reviewDueAt, authorId FROM articles ORDER BY id'
  )) as ArticleRow[];
}

export async function articleRow(workspace: Workspace, id: number): Promise<ArticleRow> {
  const row = (await articleRows(workspace)).find((article) => article.id === id);
  if (!row) throw new Error(`no article ${id}`);
  return row;
}

/** Every article's tags by name, in tag id order, including the ones with none. */
export async function tagsByArticle(workspace: Workspace): Promise<Record<number, string[]>> {
  const joined = (await workspace.dataSource.query(`
    SELECT link."articlesId" AS articleId, tags.name AS name
    FROM article_tags link
    JOIN tags ON tags.id = link."tagsId"
    ORDER BY link."articlesId", tags.id
  `)) as { articleId: number; name: string }[];

  const byArticle: Record<number, string[]> = {};
  for (const article of await articleRows(workspace)) byArticle[article.id] = [];
  for (const row of joined) (byArticle[row.articleId] ??= []).push(row.name);
  return byArticle;
}

export async function tagNames(workspace: Workspace): Promise<string[]> {
  const rows = (await workspace.dataSource.query('SELECT name FROM tags ORDER BY id')) as {
    name: string;
  }[];
  return rows.map((row) => row.name);
}

/** The change log, without the row ids, oldest first. */
export async function changeRows(workspace: Workspace): Promise<ChangeRow[]> {
  return (await workspace.dataSource.query(
    'SELECT "articleId", "field", "before", "after" FROM article_changes ORDER BY id'
  )) as ChangeRow[];
}
