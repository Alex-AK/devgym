import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CardEditor } from '../../src/client/CardEditor';
import {
  type Card,
  type ClientMessage,
  decodeClientMessage,
  encode,
  INITIAL_CARD,
  type ServerMessage,
} from '../../src/protocol';
import { openWire } from '../../src/wire';

/**
 * The room's end of the connection, played by the checkpoint. Nothing answers on
 * its own: every message the editor gets is one this file sent.
 */
function setup() {
  const user = userEvent.setup({ delay: null });
  const wire = openWire('ana');
  const sent: ClientMessage[] = [];

  wire.server.onmessage = (data) => {
    sent.push(decodeClientMessage(data));
  };

  render(<CardEditor socket={wire.client} />);

  const fromRoom = (message: ServerMessage): void => {
    act(() => {
      wire.server.send(encode(message));
    });
  };

  const opened = (version: number, card: Card = INITIAL_CARD): void => {
    fromRoom({ type: 'snapshot', version, card });
  };

  return { user, sent, fromRoom, opened };
}

function statusBox(): HTMLSelectElement {
  return screen.getByLabelText('Status') as HTMLSelectElement;
}

function lastEdit(sent: ClientMessage[]): ClientMessage {
  const edit = sent.at(-1);
  if (!edit) throw new Error('the editor sent nothing to the room');
  return edit;
}

describe('the editor shows your change, and says when it did not stick', () => {
  it('paints the card the room sent', () => {
    const { opened } = setup();

    opened(3, { title: 'Invoice PDF is blank for Northwind', status: 'Blocked', assignee: 'Ana' });

    expect(screen.getByRole('heading').textContent).toContain('Northwind');
    expect(statusBox().value).toBe('Blocked');
  });

  it('shows the status you picked before the room has answered', async () => {
    const { user, sent, opened } = setup();
    opened(1);

    await user.selectOptions(statusBox(), 'Done');

    expect(statusBox().value, 'the box went back to what the room last said').toBe('Done');
    expect(lastEdit(sent), 'the edit has to carry the version it was made against').toMatchObject({
      type: 'edit',
      field: 'status',
      value: 'Done',
      baseVersion: 1,
    });
  });

  it('leaves your choice alone until the room settles your edit', async () => {
    const { user, sent, fromRoom, opened } = setup();
    opened(1);
    await user.selectOptions(statusBox(), 'Done');
    const mine = lastEdit(sent);

    // Somebody else's edit, applied while yours is still in the air. It is not
    // the answer to yours, and yours has not lost yet.
    fromRoom({ type: 'applied', editId: 'r1', version: 2, field: 'status', value: 'Blocked' });
    expect(statusBox().value, 'somebody else took the box off you mid-edit').toBe('Done');

    fromRoom({
      type: 'applied',
      editId: mine.editId,
      version: 3,
      field: 'status',
      value: 'Done',
    });
    expect(statusBox().value).toBe('Done');
    expect(
      screen.queryByRole('alert'),
      'the edit was applied, so there is nothing wrong'
    ).toBeNull();
  });

  it('takes the value that won when your edit is refused, and says so', async () => {
    const { user, sent, fromRoom, opened } = setup();
    opened(1);
    await user.selectOptions(statusBox(), 'Done');
    const mine = lastEdit(sent);

    fromRoom({
      type: 'rejected',
      editId: mine.editId,
      version: 2,
      field: 'status',
      value: 'Blocked',
    });

    expect(statusBox().value, 'the box is still showing a status the room refused').toBe('Blocked');
    const alert = screen.queryByRole('alert');
    expect(
      alert,
      'a value that changes back on its own looks like the app eating your work'
    ).not.toBeNull();
    expect(alert?.textContent, 'the alert has to name what beat you').toContain('Blocked');
  });

  it('bases the next edit on the version the refusal carried', async () => {
    const { user, sent, fromRoom, opened } = setup();
    opened(1);
    await user.selectOptions(statusBox(), 'Done');

    fromRoom({
      type: 'rejected',
      editId: lastEdit(sent).editId,
      version: 2,
      field: 'status',
      value: 'Blocked',
    });
    await user.selectOptions(statusBox(), 'Done');

    expect(
      lastEdit(sent),
      'the second attempt loses for the same reason as the first'
    ).toMatchObject({ field: 'status', value: 'Done', baseVersion: 2 });
    expect(screen.queryByRole('alert'), 'the alert outlived the problem').toBeNull();
  });

  it('lands an edit from somebody else when you have nothing in flight', () => {
    const { fromRoom, opened } = setup();
    opened(1);

    fromRoom({ type: 'applied', editId: 'r1', version: 2, field: 'title', value: 'Blank invoice' });

    expect(screen.getByRole('heading').textContent).toContain('Blank invoice');
  });
});
