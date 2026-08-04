import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runQuery } from '../../src/server/api';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { BOARD_SCREEN, type ScreenAuthor, threadsOf } from '../support/documents';

let workspace: Workspace;

beforeAll(() => {
  workspace = createWorkspace();
});

afterAll(() => {
  workspace?.close();
});

async function authorsOnScreen(): Promise<ScreenAuthor[]> {
  const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN, { first: 6 }));
  return threads
    .flatMap((thread) => thread.posts)
    .map((post) => post.author)
    .filter((author): author is ScreenAuthor => author !== null);
}

describe('a second request sees the database as it is', () => {
  it('does no less work the second time round', async () => {
    workspace.queries.length = 0;
    await runQuery(workspace, BOARD_SCREEN, { first: 6 });
    const first = workspace.queries.length;

    workspace.queries.length = 0;
    await runQuery(workspace, BOARD_SCREEN, { first: 6 });
    const second = workspace.queries.length;

    expect(
      second,
      `the first request ran ${first} statements and the second ran ${second}, so something is being kept between them`
    ).toBe(first);
  });

  it('shows a name that changed since the last request', async () => {
    const before = await authorsOnScreen();
    const target = before[0];
    expect(target, 'no author on the board to rename').toBeDefined();

    workspace.sqlite
      .prepare('UPDATE authors SET name = ? WHERE id = ?')
      .run('Renamed Between Requests', Number(target.id));

    const after = await authorsOnScreen();
    const renamed = after.find((author) => author.id === target.id);

    expect(
      renamed?.name,
      `the board still calls author ${target.id} "${renamed?.name ?? 'nothing'}" after the rename`
    ).toBe('Renamed Between Requests');
  });

  it('shows an account that was deleted since the last request as gone', async () => {
    const before = await authorsOnScreen();
    const target = before[before.length - 1];
    expect(target, 'no author on the board to delete').toBeDefined();

    workspace.sqlite.prepare('DELETE FROM authors WHERE id = ?').run(Number(target.id));

    const after = await authorsOnScreen();

    expect(
      after.map((author) => author.id),
      `author ${target.id} is still on the board after the row was deleted`
    ).not.toContain(target.id);
  });
});
