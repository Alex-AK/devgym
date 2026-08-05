import { describe, expect, it } from 'vitest';

import { INITIAL_CARD, type SnapshotMessage } from '../../src/protocol';
import { CardRoom } from '../../src/server/room';
import { join } from '../support/clients';

describe('everyone connected sees the card, and everyone sees every edit', () => {
  it('tells a client what the card says the moment it connects', () => {
    const room = new CardRoom();

    const ana = join(room, 'ana');

    expect(ana.received[0], 'nothing arrived on the connection at all').toBeDefined();
    expect(ana.received[0]).toEqual({ type: 'snapshot', version: 0, card: INITIAL_CARD });
  });

  it('sends the card as it stands now, not as it started', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    ana.edit('a1', 0, 'title', 'Invoice PDF is blank for Northwind');

    const raj = join(room, 'raj');

    const snapshot = raj.received[0] as SnapshotMessage | undefined;
    expect(snapshot?.card.title, 'the newcomer was handed a title nobody has had for a while').toBe(
      'Invoice PDF is blank for Northwind'
    );
    expect(snapshot?.version, 'a snapshot has to carry the version its card is at').toBe(1);
  });

  it('sends an applied edit to everyone, the sender included', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    const raj = join(room, 'raj');

    ana.edit('a1', 0, 'status', 'Blocked');

    expect(raj.applied('a1'), 'the other client never heard about the edit').toMatchObject({
      field: 'status',
      value: 'Blocked',
      version: 1,
    });
    expect(
      ana.applied('a1'),
      'the sender is waiting to hear whether its own edit stuck, and for the version to build the next one on'
    ).toMatchObject({ field: 'status', value: 'Blocked', version: 1 });
    expect(ana.card()).toEqual(raj.card());
  });

  it('stops writing to a client that has gone', () => {
    const room = new CardRoom();
    const ana = join(room, 'ana');
    const raj = join(room, 'raj');

    raj.close();
    ana.edit('a1', 0, 'assignee', 'Ana');

    expect(raj.wire.discarded, 'the room is still writing to a client that has gone').toBe(0);
    expect(ana.applied('a1'), 'the client that is still here stopped getting edits').toBeDefined();
  });
});
