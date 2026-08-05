import { describe, expect, it } from 'vitest';

import { CardRoom } from '../../src/server/room';
import { join } from '../support/clients';

describe('two edits to different fields both stick', () => {
  it('keeps both when they were made against the same version', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    const raj = join(room, 'raj');

    // Both composed their edit while the card was at version 0. Ana's reaches
    // the room first; Raj's was already on its way when it did.
    ana.edit('a1', 0, 'title', 'Invoice PDF is blank for Northwind');
    raj.edit('r1', 0, 'status', 'Blocked');

    expect(
      raj.rejected('r1'),
      'nobody had touched the status, so there was no conflict to find'
    ).toBeUndefined();
    expect(ana.card()).toMatchObject({
      title: 'Invoice PDF is blank for Northwind',
      status: 'Blocked',
    });
    expect(raj.card(), 'the two of them are looking at different cards').toEqual(ana.card());
  });

  it('keeps all three when three people edit three fields at once', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    const raj = join(room, 'raj');
    const mia = join(room, 'mia');

    raj.edit('r1', 0, 'status', 'Blocked');
    mia.edit('m1', 0, 'assignee', 'Mia');
    ana.edit('a1', 0, 'title', 'Invoice PDF is blank for Northwind');

    expect([raj.rejected('r1'), mia.rejected('m1'), ana.rejected('a1')]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(ana.card()).toEqual({
      title: 'Invoice PDF is blank for Northwind',
      status: 'Blocked',
      assignee: 'Mia',
    });
    expect(raj.card()).toEqual(ana.card());
    expect(mia.card()).toEqual(ana.card());
  });

  it('takes an edit made at a version newer than the field it touches', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    const raj = join(room, 'raj');

    ana.edit('a1', 0, 'title', 'Invoice PDF is blank for Northwind');
    raj.edit('r1', 0, 'status', 'Blocked');

    // Ana has seen both, so nothing she is holding is stale: the title last
    // changed at version 1 and she is making this one at version 2.
    ana.edit('a2', 2, 'title', 'Invoice PDF is blank for two customers');

    expect(
      ana.rejected('a2'),
      'the field had not moved since she last saw it, so there was nothing to refuse'
    ).toBeUndefined();
    expect(ana.card().title).toBe('Invoice PDF is blank for two customers');
    expect(raj.card()).toEqual(ana.card());
  });
});
