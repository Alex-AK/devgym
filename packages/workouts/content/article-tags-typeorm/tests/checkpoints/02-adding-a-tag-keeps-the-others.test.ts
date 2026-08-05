import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { addTag } from '../../src/server/catalogue';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { articleRows, tagsByArticle } from '../support/rows';

let workspace: Workspace;

beforeEach(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterEach(async () => {
  await workspace?.close();
});

describe('adding a tag keeps the ones already there', () => {
  it('adds to the article rather than replacing what it had', async () => {
    await addTag(workspace, 1, 'search');

    expect((await tagsByArticle(workspace))[1]).toEqual(['beta', 'api', 'billing', 'search']);
  });

  it('tags an article that had none', async () => {
    await addTag(workspace, 5, 'api');

    expect((await tagsByArticle(workspace))[5]).toEqual(['api']);
  });

  it('leaves one tag when the same one is added twice', async () => {
    await addTag(workspace, 1, 'search');
    await addTag(workspace, 1, 'search');

    expect((await tagsByArticle(workspace))[1]).toEqual(['beta', 'api', 'billing', 'search']);
  });

  it('deletes nothing on the way', async () => {
    workspace.queries.length = 0;
    await addTag(workspace, 1, 'search');

    const deletes = workspace.queries.filter((query) => /\bDELETE\b/i.test(query.sql));
    expect(
      deletes.map((query) => query.sql),
      'adding a tag deleted rows'
    ).toEqual([]);
  });

  it('leaves every other article tagged as it was', async () => {
    const before = await tagsByArticle(workspace);
    await addTag(workspace, 1, 'search');
    const after = await tagsByArticle(workspace);

    for (const id of [2, 3, 4, 5]) {
      expect(after[id], `article ${id}`).toEqual(before[id]);
    }
  });

  it('changes no column on any article', async () => {
    const before = await articleRows(workspace);
    await addTag(workspace, 1, 'search');

    expect(await articleRows(workspace)).toEqual(before);
  });

  it('does nothing for a name that is not a tag', async () => {
    const before = await tagsByArticle(workspace);
    await addTag(workspace, 1, 'no-such-tag');

    expect(await tagsByArticle(workspace)).toEqual(before);
  });
});
