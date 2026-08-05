import { useEffect, useRef, useState } from 'react';

import {
  type Card,
  type CardField,
  decodeServerMessage,
  encode,
  INITIAL_CARD,
  STATUSES,
} from '../protocol';
import type { ClientSocket } from '../wire';

export interface CardEditorProps {
  /** One end of a connection to the room. Opened and closed by the page. */
  socket: ClientSocket;
}

/**
 * One card, open in front of one person, with the room's copy behind it.
 *
 * It paints whatever the room last said and sends an edit when you change the
 * status, which looks right until the connection has any latency on it. Then the
 * box springs back to the old status while your edit is in the air, and an edit
 * the room refused leaves the person who made it with no idea it went nowhere.
 *
 * TODO: show your own change, and settle it against the room. See brief.md.
 */
export function CardEditor({ socket }: CardEditorProps) {
  const [card, setCard] = useState<Card>(INITIAL_CARD);
  const [version, setVersion] = useState(0);
  const nextEditId = useRef(1);

  useEffect(() => {
    socket.onmessage = (data) => {
      const message = decodeServerMessage(data);

      if (message.type === 'snapshot') {
        setCard(message.card);
        setVersion(message.version);
        return;
      }

      if (message.type === 'applied') {
        setCard((current) => ({ ...current, [message.field]: message.value }));
        setVersion(message.version);
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket]);

  function edit(field: CardField, value: string): void {
    const editId = `edit-${nextEditId.current}`;
    nextEditId.current += 1;
    socket.send(encode({ type: 'edit', editId, baseVersion: version, field, value }));
  }

  return (
    <section className="card">
      <h2>{card.title}</h2>

      <label htmlFor="card-status">Status</label>
      <select
        id="card-status"
        value={card.status}
        onChange={(event) => edit('status', event.target.value)}
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <p>Assigned to {card.assignee}</p>
    </section>
  );
}
