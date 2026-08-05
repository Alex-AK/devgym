import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { archive } from '../../src/server/catalogue';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { articleRow, articleRows, changeRows, tagsByArticle } from '../support/rows';

let workspace: Workspace;

beforeEach(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterEach(async () => {
  await workspace?.close();
});

describe('archiving an article clears its review date', () => {
  it('archives it', async () => {
    await archive(workspace, 1);

    expect((await articleRow(workspace, 1)).status).toBe('archived');
  });

  it('leaves no review date behind', async () => {
    await archive(workspace, 1);

    expect((await articleRow(workspace, 1)).reviewDueAt).toBeNull();
  });

  it('leaves the rest of the row and the tags alone', async () => {
    const before = await articleRow(workspace, 1);
    const tagsBefore = await tagsByArticle(workspace);

    await archive(workspace, 1);

    const after = await articleRow(workspace, 1);
    expect({ slug: after.slug, title: after.title, authorId: after.authorId }).toEqual({
      slug: before.slug,
      title: before.title,
      authorId: before.authorId,
    });
    expect(await tagsByArticle(workspace)).toEqual(tagsBefore);
  });

  it('records both columns in the change log', async () => {
    await archive(workspace, 1);

    const log = [...(await changeRows(workspace))].sort((a, b) => a.field.localeCompare(b.field));
    // A column cleared is written down as an empty string, not as the word null.
    expect(log).toEqual([
      { articleId: 1, field: 'reviewDueAt', before: '2026-03-01', after: '' },
      { articleId: 1, field: 'status', before: 'published', after: 'archived' },
    ]);
  });

  it('archives one that had no review date to begin with', async () => {
    await archive(workspace, 3);

    const after = await articleRow(workspace, 3);
    expect(after.status).toBe('archived');
    expect(after.reviewDueAt).toBeNull();
  });

  it('leaves every other article alone', async () => {
    const before = (await articleRows(workspace)).filter((row) => row.id !== 1);
    await archive(workspace, 1);

    expect((await articleRows(workspace)).filter((row) => row.id !== 1)).toEqual(before);
  });
});
