import { type Card, type CardField, decodeClientMessage, encode, INITIAL_CARD } from '../protocol';
import type { Connection } from '../wire';

/**
 * The room behind one card, and the only thing that decides whose edit the card
 * is.
 */
export class CardRoom {
  private card: Card = { ...INITIAL_CARD };
  private version = 0;
  /** The version at which each field last changed. Zero means nobody has. */
  private readonly changedAt: Record<CardField, number> = { title: 0, status: 0, assignee: 0 };
  private readonly clients = new Set<Connection>();

  connect(connection: Connection): void {
    this.clients.add(connection);
    connection.onmessage = (data) => this.receive(connection, data);
    // Nothing else removes it, and the room goes on writing to a client that
    // has gone for as long as it holds one.
    connection.onclose = () => this.clients.delete(connection);

    // A client with no idea what the card says has nothing to base an edit on,
    // and the version it needs is the one now rather than the one it started at.
    connection.send(encode({ type: 'snapshot', version: this.version, card: { ...this.card } }));
  }

  private receive(from: Connection, data: string): void {
    const message = decodeClientMessage(data);
    if (message.type !== 'edit') return;

    // Per field, not per card. Against the room's own version this refuses an
    // edit to the title because somebody moved the status, which is a conflict
    // nobody had and the reason two people cannot both work on one card.
    if (message.baseVersion < this.changedAt[message.field]) {
      from.send(
        encode({
          type: 'rejected',
          editId: message.editId,
          version: this.version,
          field: message.field,
          value: this.card[message.field],
        })
      );
      return;
    }

    this.card = { ...this.card, [message.field]: message.value };
    this.version += 1;
    this.changedAt[message.field] = this.version;

    // The sender included: it is waiting to hear whether its own edit stuck, and
    // the version on this message is what its next edit is based on.
    this.broadcast(
      encode({
        type: 'applied',
        editId: message.editId,
        version: this.version,
        field: message.field,
        value: message.value,
      })
    );
  }

  private broadcast(data: string): void {
    for (const client of this.clients) client.send(data);
  }
}
