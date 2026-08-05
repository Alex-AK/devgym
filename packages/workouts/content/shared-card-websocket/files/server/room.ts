import { type Card, decodeClientMessage, encode, INITIAL_CARD } from '../protocol';
import type { Connection } from '../wire';

/**
 * The room behind one card. Everybody with the card open is connected to it, and
 * every edit any of them makes arrives here.
 *
 * It writes down what it is told and passes it on, which is the whole job when
 * one person has the card open. With two, a client that has just connected has
 * no idea what the card says, and two edits made in the same moment both come
 * back as though they had won.
 *
 * TODO: apply the rule in brief.md, and let a connection go when it closes.
 */
export class CardRoom {
  private card: Card = { ...INITIAL_CARD };
  private version = 0;
  private readonly clients = new Set<Connection>();

  connect(connection: Connection): void {
    this.clients.add(connection);
    connection.onmessage = (data) => this.receive(data);
  }

  private receive(data: string): void {
    const message = decodeClientMessage(data);
    if (message.type !== 'edit') return;

    this.card = { ...this.card, [message.field]: message.value };
    this.version += 1;

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
