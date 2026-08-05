import 'reflect-metadata';

import {
  DataSource,
  type EntitySubscriberInterface,
  EventSubscriber,
  type Repository,
  type UpdateEvent,
} from 'typeorm';

import {
  type Article,
  type ArticleChange,
  ArticleChangeSchema,
  ArticleSchema,
  type Author,
  AuthorSchema,
  type Tag,
  TagSchema,
} from './entities';

/**
 * The change log, kept by the data source rather than by any one caller.
 *
 * It records the column that moved, what it held and what it holds now, which is
 * what the compliance export reads. It is registered on the data source below
 * and is not editable.
 */
@EventSubscriber()
export class ArticleChangeLog implements EntitySubscriberInterface<Article> {
  listenTo(): string {
    return 'Article';
  }

  async afterUpdate(event: UpdateEvent<Article>): Promise<void> {
    const before = event.databaseEntity;
    // Nothing to compare against means nothing worth writing down: a log row
    // saying a column changed from nothing to nothing is worse than no row.
    if (!before) return;

    for (const column of event.updatedColumns) {
      await event.manager.getRepository<ArticleChange>('ArticleChange').insert({
        articleId: before.id,
        field: column.propertyName,
        before: text(before[column.propertyName as keyof Article]),
        after: text(
          (event.entity as Partial<Article> | undefined)?.[column.propertyName as keyof Article]
        ),
      });
    }
  }
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export interface LoggedQuery {
  sql: string;
  /** How many rows came back across the wire, not how many entities you got. */
  rowCount: number;
}

export interface Workspace {
  dataSource: DataSource;
  articles: Repository<Article>;
  tags: Repository<Tag>;
  authors: Repository<Author>;
  changes: Repository<ArticleChange>;
  /** Every statement the catalogue ran. The checkpoints read this. */
  queries: LoggedQuery[];
  close: () => Promise<void>;
}

/**
 * A fresh catalogue, seeded the same way every time: five articles, five tags,
 * two authors, and an empty change log.
 *
 * The sqlite drivers keep a single query runner, so wrapping its `query` once is
 * enough to see every statement anything here runs, row counts included.
 */
export async function createWorkspace(): Promise<Workspace> {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    synchronize: true,
    entities: [AuthorSchema, TagSchema, ArticleSchema, ArticleChangeSchema],
    subscribers: [ArticleChangeLog],
  });
  await dataSource.initialize();

  const authors = dataSource.getRepository<Author>('Author');
  const tags = dataSource.getRepository<Tag>('Tag');
  const articles = dataSource.getRepository<Article>('Article');
  const changes = dataSource.getRepository<ArticleChange>('ArticleChange');

  const ana = await authors.save({ name: 'Ana' });
  const bo = await authors.save({ name: 'Bo' });

  const beta = await tags.save({ name: 'beta' });
  const api = await tags.save({ name: 'api' });
  const billing = await tags.save({ name: 'billing' });
  const deprecated = await tags.save({ name: 'deprecated' });
  const search = await tags.save({ name: 'search' });

  await articles.save({
    slug: 'webhooks-overview',
    title: 'Webhooks overview',
    status: 'published',
    reviewDueAt: '2026-03-01',
    author: ana,
    tags: [beta, api, billing],
  });
  await articles.save({
    slug: 'rate-limits',
    title: 'Rate limits',
    status: 'published',
    reviewDueAt: '2026-06-14',
    author: bo,
    tags: [beta],
  });
  await articles.save({
    slug: 'search-syntax',
    title: 'Search syntax',
    status: 'draft',
    reviewDueAt: null,
    author: ana,
    tags: [api, search],
  });
  await articles.save({
    slug: 'legacy-tokens',
    title: 'Legacy tokens',
    status: 'published',
    reviewDueAt: '2026-01-20',
    author: bo,
    tags: [deprecated, billing],
  });
  // Nothing has ever been tagged on this one, and it still belongs in the
  // catalogue.
  await articles.save({
    slug: 'changelog',
    title: 'Changelog',
    status: 'published',
    reviewDueAt: '2026-05-11',
    author: ana,
    tags: [],
  });

  await changes.clear();

  const queries: LoggedQuery[] = [];
  const runner = dataSource.driver.createQueryRunner('master');
  const original = runner.query.bind(runner);
  runner.query = async (...args: Parameters<typeof original>) => {
    const result: unknown = await original(...args);
    const rows = Array.isArray(result)
      ? result
      : ((result as { records?: unknown[] })?.records ?? []);
    queries.push({ sql: String(args[0]), rowCount: rows.length });
    return result as never;
  };

  return {
    dataSource,
    articles,
    tags,
    authors,
    changes,
    queries,
    close: () => dataSource.destroy(),
  };
}
