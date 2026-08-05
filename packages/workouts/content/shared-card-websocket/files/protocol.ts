/**
 * What goes over the wire, in both directions.
 *
 * Read-only. The checkpoints send and read exactly these shapes, so a change
 * here changes what they are measuring rather than how you passed them.
 */

export interface Card {
  title: string;
  /** One of `STATUSES`. */
  status: string;
  assignee: string;
}

export type CardField = keyof Card;

/** What the status field is allowed to hold, and what the editor offers. */
export const STATUSES = ['Open', 'Blocked', 'Done'] as const;

/** The card before anybody has edited it. */
export const INITIAL_CARD: Card = {
  title: 'Invoice PDF is blank for one customer',
  status: 'Open',
  assignee: 'Unassigned',
};

/** Client to room. One field per edit. */
export interface EditMessage {
  type: 'edit';
  /** The client's own name for this edit. The verdict comes back carrying it. */
  editId: string;
  /** The room version this client had when it made the edit. */
  baseVersion: number;
  field: CardField;
  value: string;
}

export type ClientMessage = EditMessage;

/** Room to one client, on connect: the card as it stands. */
export interface SnapshotMessage {
  type: 'snapshot';
  version: number;
  card: Card;
}

/** Room to everyone: this edit is now the card. */
export interface AppliedMessage {
  type: 'applied';
  editId: string;
  /** The room version after the edit. */
  version: number;
  field: CardField;
  value: string;
}

/** Room to the sender alone: this edit lost, and here is what beat it. */
export interface RejectedMessage {
  type: 'rejected';
  editId: string;
  /** Where the room is now, which is what the next attempt bases itself on. */
  version: number;
  field: CardField;
  /** What the field holds instead. */
  value: string;
}

export type ServerMessage = SnapshotMessage | AppliedMessage | RejectedMessage;

export function encode(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

export function decodeClientMessage(raw: string): ClientMessage {
  return JSON.parse(raw) as ClientMessage;
}

export function decodeServerMessage(raw: string): ServerMessage {
  return JSON.parse(raw) as ServerMessage;
}
