import { inArray } from 'drizzle-orm';
import {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

import {
  type AuthorRow,
  authors,
  type Db,
  type PostRow,
  posts,
  type TeamRow,
  teams,
  type ThreadRow,
  threads,
  type Workspace,
} from './db';

/**
 * Collects every key asked for during one tick and answers all of them with a
 * single query. A resolver cannot know what the rest of the document wants, so
 * the batch is assembled by the keys turning up rather than by anyone planning
 * a join: the client picked the shape, and this is what fits any of them.
 *
 * `load` gets the keys in the order they arrived and returns a map. A key with
 * no row is missing from that map, which is how a deleted account stays a null
 * rather than becoming the wrong person's name.
 */
function batched<K, V>(load: (keys: K[]) => Map<K, V>): (key: K) => Promise<V | undefined> {
  let pending: { key: K; settle: (value: V | undefined) => void }[] = [];

  return (key) =>
    new Promise((settle) => {
      if (pending.length === 0) {
        queueMicrotask(() => {
          const batch = pending;
          pending = [];
          const found = load(batch.map((entry) => entry.key));
          for (const entry of batch) entry.settle(found.get(entry.key));
        });
      }
      pending.push({ key, settle });
    });
}

function postsByThread(db: Db) {
  return batched<number, PostRow[]>((threadIds) => {
    const rows = db
      .select()
      .from(posts)
      .where(inArray(posts.threadId, threadIds))
      .orderBy(posts.id)
      .all();
    const grouped = new Map<number, PostRow[]>(threadIds.map((id) => [id, []]));
    for (const row of rows) grouped.get(row.threadId)?.push(row);
    return grouped;
  });
}

function authorById(db: Db) {
  return batched<number, AuthorRow>((ids) => {
    const rows = db.select().from(authors).where(inArray(authors.id, ids)).all();
    return new Map(rows.map((row) => [row.id, row]));
  });
}

function teamById(db: Db) {
  return batched<number, TeamRow>((ids) => {
    const rows = db.select().from(teams).where(inArray(teams.id, ids)).all();
    return new Map(rows.map((row) => [row.id, row]));
  });
}

/**
 * The third argument every resolver below is given. `runQuery` builds one of
 * these per request and throws it away when the request is done.
 *
 * The loaders live here rather than at module scope for a reason that is not
 * about speed: a loader remembers what it fetched, so one shared between
 * requests hands the first caller's rows to the second. That is a wrong answer,
 * not a slow one.
 */
export interface RequestContext {
  workspace: Workspace;
  loaders: {
    author: (id: number) => Promise<AuthorRow | undefined>;
    postsFor: (threadId: number) => Promise<PostRow[] | undefined>;
    team: (id: number) => Promise<TeamRow | undefined>;
  };
}

export function createContext(workspace: Workspace): RequestContext {
  return {
    workspace,
    loaders: {
      author: authorById(workspace.db),
      postsFor: postsByThread(workspace.db),
      team: teamById(workspace.db),
    },
  };
}

const TeamType = new GraphQLObjectType<TeamRow, RequestContext>({
  name: 'Team',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const AuthorType = new GraphQLObjectType<AuthorRow, RequestContext>({
  name: 'Author',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    team: {
      type: TeamType,
      resolve: async (author, _args, { loaders }) => (await loaders.team(author.teamId)) ?? null,
    },
  }),
});

const PostType = new GraphQLObjectType<PostRow, RequestContext>({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    body: { type: new GraphQLNonNull(GraphQLString) },
    /** Null where the account has been deleted. The reply stays on the board. */
    author: {
      type: AuthorType,
      resolve: async (post, _args, { loaders }) => (await loaders.author(post.authorId)) ?? null,
    },
  }),
});

const ThreadType = new GraphQLObjectType<ThreadRow, RequestContext>({
  name: 'Thread',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: async (thread, _args, { loaders }) => (await loaders.postsFor(thread.id)) ?? [],
    },
  }),
});

const QueryType = new GraphQLObjectType<unknown, RequestContext>({
  name: 'Query',
  fields: () => ({
    threads: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ThreadType))),
      args: { first: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: (_root, args: { first: number }, { workspace }) =>
        workspace.db.select().from(threads).orderBy(threads.id).limit(args.first).all(),
    },
  }),
});

export const schema = new GraphQLSchema({ query: QueryType });
