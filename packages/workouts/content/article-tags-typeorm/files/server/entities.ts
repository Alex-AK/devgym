import { EntitySchema } from 'typeorm';

export interface Author {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  status: string;
  /** When the article is next due a read-through. Null once it is archived. */
  reviewDueAt: string | null;
  author: Author;
  tags: Tag[];
}

/** One row per column that changed, written by the subscriber in `db.ts`. */
export interface ArticleChange {
  id: number;
  articleId: number;
  field: string;
  before: string;
  after: string;
}

/**
 * Schemas rather than decorated classes, so the entities are plain data and the
 * column names match the property names.
 */
export const AuthorSchema = new EntitySchema<Author>({
  name: 'Author',
  tableName: 'authors',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
  },
});

export const TagSchema = new EntitySchema<Tag>({
  name: 'Tag',
  tableName: 'tags',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, unique: true },
  },
});

export const ArticleSchema = new EntitySchema<Article>({
  name: 'Article',
  tableName: 'articles',
  columns: {
    id: { type: Number, primary: true, generated: true },
    slug: { type: String },
    title: { type: String },
    status: { type: String },
    reviewDueAt: { type: String, nullable: true },
  },
  relations: {
    author: { type: 'many-to-one', target: 'Author', joinColumn: true, nullable: false },
    tags: { type: 'many-to-many', target: 'Tag', joinTable: { name: 'article_tags' } },
  },
});

export const ArticleChangeSchema = new EntitySchema<ArticleChange>({
  name: 'ArticleChange',
  tableName: 'article_changes',
  columns: {
    id: { type: Number, primary: true, generated: true },
    articleId: { type: Number },
    field: { type: String },
    before: { type: String },
    after: { type: String },
  },
});
