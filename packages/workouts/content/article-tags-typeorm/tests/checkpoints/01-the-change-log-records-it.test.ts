import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setStatus } from '../../src/server/catalogue';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { articleRow, articleRows, changeRows, tagsByArticle } from '../support/rows';

let workspace: Workspace;

beforeEach(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterEach(async () => {
  await workspace?.close();
});

describe('the change log records a status change', () => {
  it('moves the article', async () => {
    await setStatus(workspace, 3, 'published');

    expect((await articleRow(workspace, 3)).status).toBe('published');
  });

  it('leaves one row naming the column and both values', async () => {
    await setStatus(workspace, 3, 'published');

    expect(await changeRows(workspace)).toEqual([
      { articleId: 3, field: 'status', before: 'draft', after: 'published' },
    ]);
  });

  it('records the value the article had, not the one being written over it', async () => {
    await setStatus(workspace, 4, 'archived');
    await setStatus(workspace, 4, 'draft');

    const log = (await changeRows(workspace)).map((row) => `${row.before} -> ${row.after}`);
    expect(log).toEqual(['published -> archived', 'archived -> draft']);
  });

  it('writes nothing down when the status it is given is the one already there', async () => {
    await setStatus(workspace, 4, 'published');

    expect(await changeRows(workspace)).toEqual([]);
  });

  it('changes nothing else on the article', async () => {
    const before = await articleRow(workspace, 3);
    await setStatus(workspace, 3, 'published');
    const after = await articleRow(workspace, 3);

    expect({ ...after, status: before.status }).toEqual(before);
  });

  it('leaves the other articles and every tag alone', async () => {
    const articlesBefore = (await articleRows(workspace)).filter((row) => row.id !== 3);
    const tagsBefore = await tagsByArticle(workspace);

    await setStatus(workspace, 3, 'published');

    expect((await articleRows(workspace)).filter((row) => row.id !== 3)).toEqual(articlesBefore);
    expect(await tagsByArticle(workspace)).toEqual(tagsBefore);
  });
});
