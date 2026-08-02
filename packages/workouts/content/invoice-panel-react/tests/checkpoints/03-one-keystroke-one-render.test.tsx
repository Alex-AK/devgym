import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { InvoicePanel } from '../../src/client/InvoicePanel';

interface Commit {
  /** What was in the filter box when this version of the panel was committed. */
  query: string;
  /** The lines that were on screen with it. */
  rows: string[];
}

let commits: Commit[] = [];

/**
 * Profiler's onRender runs once per commit, after the DOM has been updated, so
 * every version of the panel the user could have seen turns up here. The
 * checkpoint is not about speed: it is about how many of these there are, and
 * whether any of them disagreed with itself.
 */
const onRender: ProfilerOnRenderCallback = () => {
  const filter = screen.queryByLabelText<HTMLInputElement>('Filter lines');
  const rows = screen
    .queryAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryAllByRole('cell')[0]?.textContent ?? '');

  commits.push({ query: filter?.value ?? '', rows });
};

function setup() {
  const user = userEvent.setup({ delay: null });
  render(
    <Profiler id="invoice" onRender={onRender}>
      <InvoicePanel />
    </Profiler>
  );
  const filter = screen.getByLabelText('Filter lines');
  // Everything before the first keystroke is the mount.
  commits = [];
  return { user, filter };
}

beforeEach(() => {
  commits = [];
});

describe('one keystroke, one render', () => {
  it('renders once per character typed', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'desi');

    expect(
      commits.length,
      `four keystrokes rendered the panel ${commits.length} times`
    ).toBeLessThanOrEqual(4);
  });

  it('never puts a row on screen that does not match the box', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'desi');

    for (const commit of commits) {
      const stale = commit.rows.filter(
        (row) => !row.toLowerCase().includes(commit.query.toLowerCase())
      );
      expect(
        stale,
        `with "${commit.query}" in the box the panel showed ${stale.length} lines that do not match`
      ).toEqual([]);
    }
  });

  it('renders once when a line is removed', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Remove Design system audit' }));

    expect(
      commits.length,
      `removing one line rendered the panel ${commits.length} times`
    ).toBeLessThanOrEqual(1);
  });
});
