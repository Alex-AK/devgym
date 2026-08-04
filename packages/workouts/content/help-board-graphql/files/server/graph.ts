import { eq } from 'drizzle-orm';
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
  type PostRow,
  posts,
  type TeamRow,
  teams,
  type ThreadRow,
  threads,
  type Workspace,
} from './db';

/**
 * The third argument every resolver below is given. `runQuery` builds one of
 * these per request and throws it away when the request is done.
 */
export interface RequestContext {
  workspace: Workspace;
}

export function createContext(workspace: Workspace): RequestContext {
  return { workspace };
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
      resolve: (author, _args, { workspace }) =>
        workspace.db.select().from(teams).where(eq(teams.id, author.teamId)).get() ?? null,
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
      resolve: (post, _args, { workspace }) =>
        workspace.db.select().from(authors).where(eq(authors.id, post.authorId)).get() ?? null,
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
      resolve: (thread, _args, { workspace }) =>
        workspace.db
          .select()
          .from(posts)
          .where(eq(posts.threadId, thread.id))
          .orderBy(posts.id)
          .all(),
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
