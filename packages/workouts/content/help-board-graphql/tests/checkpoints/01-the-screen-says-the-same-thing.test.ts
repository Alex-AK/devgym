import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runQuery } from '../../src/server/api';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { BOARD_SCREEN, type ScreenThread, threadsOf } from '../support/documents';

let workspace: Workspace;

beforeAll(() => {
  workspace = createWorkspace();
});

afterAll(() => {
  workspace?.close();
});

/** The same board, assembled by hand in SQL, so the two can be compared. */
function expectedBoard(first: number): ScreenThread[] {
  const rows = workspace.sqlite
    .prepare(
      `SELECT t.id AS thread_id, t.title AS title,
              p.id AS post_id, p.body AS body,
              a.id AS author_id, a.name AS author_name
         FROM (SELECT * FROM threads ORDER BY id LIMIT ?) t
         LEFT JOIN posts p ON p.thread_id = t.id
         LEFT JOIN authors a ON a.id = p.author_id
        ORDER BY t.id, p.id`
    )
    .all(first) as {
    thread_id: number;
    title: string;
    post_id: number | null;
    body: string | null;
    author_id: number | null;
    author_name: string | null;
  }[];

  const board = new Map<number, ScreenThread>();
  for (const row of rows) {
    let thread = board.get(row.thread_id);
    if (!thread) {
      thread = { id: String(row.thread_id), title: row.title, posts: [] };
      board.set(row.thread_id, thread);
    }
    if (row.post_id === null) continue;
    thread.posts.push({
      id: String(row.post_id),
      body: row.body as string,
      author:
        row.author_id === null
          ? null
          : { id: String(row.author_id), name: row.author_name as string },
    });
  }
  return [...board.values()];
}

describe('the screen says the same thing it always did', () => {
  it('answers with every thread, in order, and every reply on it', async () => {
    const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN, { first: 12 }));

    expect(threads).toEqual(expectedBoard(12));
  });

  it('keeps a thread nobody has replied to', async () => {
    const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN, { first: 12 }));
    const quiet = threads.filter((thread) => thread.posts.length === 0);

    expect(quiet.length, 'a thread with no replies dropped off the board').toBe(1);
  });

  it('leaves the author null where the account is gone', async () => {
    const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN, { first: 12 }));
    const replies = threads.flatMap((thread) => thread.posts);
    const orphaned = replies.filter((post) => post.author === null);

    expect(orphaned.length, 'the reply whose author no longer exists').toBe(1);
    for (const post of replies) {
      expect(post.author?.name ?? null).toBe(
        (
          workspace.sqlite
            .prepare(
              'SELECT a.name AS name FROM posts p LEFT JOIN authors a ON a.id = p.author_id WHERE p.id = ?'
            )
            .get(Number(post.id)) as { name: string | null }
        ).name
      );
    }
  });
});
