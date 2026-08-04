import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runQuery } from '../../src/server/api';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { BOARD_SCREEN, threadsOf } from '../support/documents';

let workspace: Workspace;

beforeAll(() => {
  workspace = createWorkspace();
});

afterAll(() => {
  workspace?.close();
});

/** How many statements one request costs when it asks for this many threads. */
async function statementsFor(first: number): Promise<number> {
  workspace.queries.length = 0;
  await runQuery(workspace, BOARD_SCREEN, { first });
  return workspace.queries.length;
}

describe('one request costs the same whether the board is busy or quiet', () => {
  it('costs the same for twelve threads as for three', async () => {
    const quiet = await statementsFor(3);
    const busy = await statementsFor(12);

    expect(
      busy,
      `3 threads took ${quiet} statements and 12 took ${busy}, so the cost follows the data`
    ).toBe(quiet);
  });

  it('is a handful of statements, not one per reply', async () => {
    const statements = await statementsFor(12);

    expect(statements, `${statements} statements for one request`).toBeLessThanOrEqual(3);
  });

  it('never reads the authors table one row at a time', async () => {
    workspace.queries.length = 0;
    const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN, { first: 12 }));
    const replies = threads.flatMap((thread) => thread.posts).length;

    const authorReads = workspace.queries.filter((query) =>
      query.sql.toLowerCase().includes('from "authors"')
    );

    expect(
      authorReads.length,
      `${replies} replies on screen and ${authorReads.length} reads of the authors table`
    ).toBeLessThanOrEqual(1);
  });
});
