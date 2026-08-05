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

/** The status this person picked, until the room says what became of it. */
interface Pending {
  editId: string;
  value: string;
}

export function CardEditor({ socket }: CardEditorProps) {
  const [card, setCard] = useState<Card>(INITIAL_CARD);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const nextEditId = useRef(1);

  useEffect(() => {
    socket.onmessage = (data) => {
      const message = decodeServerMessage(data);

      if (message.type === 'snapshot') {
        setCard(message.card);
        setVersion(message.version);
        return;
      }

      // Both verdicts move the version, and the one on a refusal is the whole
      // point of it: an edit sent from the version that just lost loses again.
      setVersion(message.version);
      setCard((current) => ({ ...current, [message.field]: message.value }));

      // Somebody else's edit is not an answer to yours, so it changes the card
      // behind your choice and leaves the choice alone.
      setPending((current) => (current?.editId === message.editId ? null : current));

      if (message.type === 'rejected') setRefused(message.value);
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket]);

  function edit(field: CardField, value: string): void {
    const editId = `edit-${nextEditId.current}`;
    nextEditId.current += 1;
    setPending({ editId, value });
    setRefused(null);
    socket.send(encode({ type: 'edit', editId, baseVersion: version, field, value }));
  }

  // What you picked wins the box until the room has answered for it. The card
  // underneath keeps moving; this is only what is on screen.
  const status = pending?.value ?? card.status;

  return (
    <section className="card">
      <h2>{card.title}</h2>

      <label htmlFor="card-status">Status</label>
      <select
        id="card-status"
        value={status}
        onChange={(event) => edit('status', event.target.value)}
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {refused !== null && <p role="alert">Somebody set the status to {refused} first.</p>}

      <p>Assigned to {card.assignee}</p>
    </section>
  );
}
