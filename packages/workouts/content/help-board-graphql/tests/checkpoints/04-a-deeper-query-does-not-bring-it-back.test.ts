import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runQuery } from '../../src/server/api';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { BOARD_SCREEN_WITH_TEAMS, threadsOf } from '../support/documents';

let workspace: Workspace;

beforeAll(() => {
  workspace = createWorkspace();
});

afterAll(() => {
  workspace?.close();
});

async function statementsFor(first: number): Promise<number> {
  workspace.queries.length = 0;
  await runQuery(workspace, BOARD_SCREEN_WITH_TEAMS, { first });
  return workspace.queries.length;
}

describe('asking one level deeper does not bring it back', () => {
  it('costs the same for twelve threads as for three', async () => {
    const quiet = await statementsFor(3);
    const busy = await statementsFor(12);

    expect(
      busy,
      `3 threads took ${quiet} statements and 12 took ${busy} once the team badge was asked for`
    ).toBe(quiet);
  });

  it('adds one round trip for the extra level, not one per reply', async () => {
    const statements = await statementsFor(12);

    expect(statements, `${statements} statements for a four-level document`).toBeLessThanOrEqual(4);
  });

  it('puts each author in the team they are actually in', async () => {
    const threads = threadsOf(await runQuery(workspace, BOARD_SCREEN_WITH_TEAMS, { first: 12 }));
    const authors = threads
      .flatMap((thread) => thread.posts)
      .map((post) => post.author)
      .filter((author) => author !== null);

    expect(authors.length, 'no authors came back at all').toBeGreaterThan(0);

    const teamOf = workspace.sqlite.prepare(
      'SELECT t.id AS id, t.name AS name FROM authors a JOIN teams t ON t.id = a.team_id WHERE a.id = ?'
    );
    for (const author of authors) {
      const expected = teamOf.get(Number(author.id)) as { id: number; name: string };
      expect(author.team, `the team shown against ${author.name}`).toEqual({
        id: String(expected.id),
        name: expected.name,
      });
    }
  });
});
