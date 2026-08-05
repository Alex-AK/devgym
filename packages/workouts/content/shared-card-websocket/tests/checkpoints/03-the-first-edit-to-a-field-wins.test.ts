import { describe, expect, it } from 'vitest';

import { CardRoom } from '../../src/server/room';
import { join } from '../support/clients';

/** Two people pick a status in the same moment. Ana's reaches the room first. */
function bothPickAStatus() {
  const room = new CardRoom();
  const ana = join(room, 'ana');
  const raj = join(room, 'raj');

  ana.edit('a1', 0, 'status', 'Blocked');
  raj.edit('r1', 0, 'status', 'Done');

  return { room, ana, raj };
}

describe('the first edit to reach a field wins, and the other one is told', () => {
  it('keeps the edit that got there first', () => {
    const { ana, raj } = bothPickAStatus();

    expect(ana.card().status, 'the edit made against a status that had already moved won').toBe(
      'Blocked'
    );
    expect(raj.card(), 'the two of them are looking at different cards').toEqual(ana.card());
  });

  it('tells the sender what beat it, and tells nobody else', () => {
    const { ana, raj } = bothPickAStatus();

    expect(raj.rejected('r1'), 'the loser was never told').toMatchObject({
      field: 'status',
      value: 'Blocked',
      version: 1,
    });
    expect(
      ana.rejected('r1'),
      'a refusal is between the room and the client that sent the edit'
    ).toBeUndefined();
  });

  it('does not pass on an edit it refused, or count it', () => {
    const { ana, raj } = bothPickAStatus();

    expect(ana.applied('r1'), 'a refused edit reached the other client as an applied one').toBe(
      undefined
    );
    expect(raj.applied('r1')).toBeUndefined();

    // One edit applied, so the room is at version 1 and the next one is 2.
    ana.edit('a2', 1, 'assignee', 'Ana');
    expect(ana.applied('a2')?.version, 'a refused edit moved the version anyway').toBe(2);
  });

  it('lets the loser win by trying again from where the room is', () => {
    const { ana, raj } = bothPickAStatus();
    const refusal = raj.rejected('r1');
    expect(refusal, 'no refusal to try again from').toBeDefined();

    raj.edit('r2', refusal?.version ?? 0, 'status', 'Done');

    expect(raj.applied('r2'), 'the second attempt was refused as well').toBeDefined();
    expect(ana.card().status).toBe('Done');
    expect(raj.card()).toEqual(ana.card());
  });
});
