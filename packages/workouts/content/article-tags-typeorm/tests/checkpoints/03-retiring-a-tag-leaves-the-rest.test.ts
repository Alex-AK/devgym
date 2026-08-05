import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { retireTag } from '../../src/server/catalogue';
import { createWorkspace, type Workspace } from '../../src/server/db';
import { articleRows, tagNames, tagsByArticle } from '../support/rows';

let workspace: Workspace;

beforeEach(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterEach(async () => {
  await workspace?.close();
});

describe('retiring a tag leaves the rest of them', () => {
  it('takes the tag off the articles that carried it', async () => {
    await retireTag(workspace, 'beta');

    const tags = await tagsByArticle(workspace);
    expect(tags[1]).not.toContain('beta');
    expect(tags[2]).not.toContain('beta');
  });

  it('keeps every other tag those articles had', async () => {
    await retireTag(workspace, 'beta');

    const tags = await tagsByArticle(workspace);
    expect(tags[1], 'article 1 carried beta, api and billing').toEqual(['api', 'billing']);
    expect(tags[2], 'article 2 carried beta and nothing else').toEqual([]);
  });

  it('leaves the articles that never carried it alone', async () => {
    const before = await tagsByArticle(workspace);
    await retireTag(workspace, 'beta');
    const after = await tagsByArticle(workspace);

    for (const id of [3, 4, 5]) {
      expect(after[id], `article ${id}`).toEqual(before[id]);
    }
  });

  it('holds for a tag carried by two articles with different remainders', async () => {
    await retireTag(workspace, 'billing');

    const tags = await tagsByArticle(workspace);
    expect(tags[1]).toEqual(['beta', 'api']);
    expect(tags[4]).toEqual(['deprecated']);
  });

  it('takes the tag off the list and leaves the others on it', async () => {
    await retireTag(workspace, 'beta');

    expect(await tagNames(workspace)).toEqual(['api', 'billing', 'deprecated', 'search']);
  });

  it('changes no column on any article', async () => {
    const before = await articleRows(workspace);
    await retireTag(workspace, 'beta');

    expect(await articleRows(workspace)).toEqual(before);
  });

  it('does nothing for a name that is not a tag', async () => {
    const tagsBefore = await tagsByArticle(workspace);
    const namesBefore = await tagNames(workspace);

    await retireTag(workspace, 'no-such-tag');

    expect(await tagsByArticle(workspace)).toEqual(tagsBefore);
    expect(await tagNames(workspace)).toEqual(namesBefore);
  });
});
