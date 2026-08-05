import {
  type AppliedMessage,
  type Card,
  type CardField,
  decodeServerMessage,
  encode,
  INITIAL_CARD,
  type RejectedMessage,
  type ServerMessage,
} from '../../src/protocol';
import type { CardRoom } from '../../src/server/room';
import { openWire, type Wire } from '../../src/wire';

/**
 * One person with the card open, played by the checkpoint.
 *
 * `card()` is the only thing that matters: what this client would be showing,
 * built from nothing but the messages the room sent it. Two clients agreeing is
 * two `card()` calls coming out equal.
 */
export interface TestClient {
  id: string;
  wire: Wire;
  received: ServerMessage[];
  card(): Card;
  /** Compose an edit against `baseVersion` and let it reach the room now. */
  edit(editId: string, baseVersion: number, field: CardField, value: string): void;
  close(): void;
  applied(editId: string): AppliedMessage | undefined;
  rejected(editId: string): RejectedMessage | undefined;
}

export function join(room: CardRoom, id: string): TestClient {
  const wire = openWire(id);
  const received: ServerMessage[] = [];

  // Listening before connecting, because the room may answer straight away.
  wire.client.onmessage = (data) => {
    received.push(decodeServerMessage(data));
  };
  room.connect(wire.server);

  return {
    id,
    wire,
    received,
    card(): Card {
      let card: Card = { ...INITIAL_CARD };
      for (const message of received) {
        if (message.type === 'snapshot') card = { ...message.card };
        else if (message.type === 'applied') card = { ...card, [message.field]: message.value };
      }
      return card;
    },
    edit(editId, baseVersion, field, value): void {
      wire.client.send(encode({ type: 'edit', editId, baseVersion, field, value }));
    },
    close(): void {
      wire.client.close();
    },
    applied(editId): AppliedMessage | undefined {
      return received.find(
        (message): message is AppliedMessage =>
          message.type === 'applied' && message.editId === editId
      );
    },
    rejected(editId): RejectedMessage | undefined {
      return received.find(
        (message): message is RejectedMessage =>
          message.type === 'rejected' && message.editId === editId
      );
    },
  };
}
