import type { ContactDetails } from './rules';

export interface SaveCall {
  details: ContactDetails;
  settled: 'pending' | 'resolved' | 'rejected';
}

/** Every save the form has asked for, in order. The checkpoints read this. */
export const calls: SaveCall[] = [];

let gate: Promise<void> | null = null;
let openGate: (() => void) | null = null;
let failures = 0;

/**
 * Test controls. A real API has none of this; it is here so a checkpoint can
 * hold a save open, or make one fail, without the suite waiting on a clock.
 */
export const fixture = {
  reset(): void {
    calls.length = 0;
    gate = null;
    openGate = null;
    failures = 0;
  },
  /** Keep every save in flight until the returned function is called. */
  hold(): () => void {
    gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    return () => {
      openGate?.();
      gate = null;
      openGate = null;
    };
  },
  /** Make the next save reject, the way a dropped connection would. */
  failNext(): void {
    failures += 1;
  },
};

/** Write the details to the account service. Rejects when the write fails. */
export async function saveContactDetails(details: ContactDetails): Promise<void> {
  const call: SaveCall = { details, settled: 'pending' };
  calls.push(call);

  if (gate) await gate;

  if (failures > 0) {
    failures -= 1;
    call.settled = 'rejected';
    throw new Error('The connection dropped before the save finished.');
  }

  call.settled = 'resolved';
}
