export interface Membership {
  memberId: number;
  name: string;
  current: boolean;
}

const MEMBERS: Record<number, { name: string; current: boolean }> = {
  101: { name: 'Ada Okafor', current: true },
  102: { name: 'Brendan Cole', current: true },
  103: { name: 'Chidi Nwosu', current: true },
  104: { name: 'Dagny Ruud', current: true },
  105: { name: 'Eun-ji Park', current: true },
  106: { name: 'Farah Haddad', current: true },
  107: { name: 'Gustav Lind', current: true },
  108: { name: 'Hana Sato', current: true },
  109: { name: 'Iain Murray', current: true },
  110: { name: 'Jonna Virta', current: true },
  111: { name: 'Kwame Boateng', current: true },
  112: { name: 'Lucia Ferrer', current: true },
  113: { name: 'Mira Kaplan', current: true },
  114: { name: 'Noor Rahimi', current: true },
  190: { name: 'Rhys Vance', current: false },
};

let duringNextCheck: (() => void) | null = null;

/**
 * Test-only. Runs `fn` part-way through the next membership check, which is
 * where a booking spends most of its time. It is how a checkpoint puts the
 * other channel's whole booking inside this one. You do not need to call it.
 */
export function runDuringNextCheck(fn: () => void): void {
  duringNextCheck = fn;
}

/**
 * Ask the members service whether this member is current. Stands in for the
 * call the real one makes over the network, and it is by some distance the
 * slowest thing a booking does.
 */
export function checkMembership(memberId: number): Membership {
  const record = MEMBERS[memberId];

  const hook = duringNextCheck;
  duringNextCheck = null;
  hook?.();

  return { memberId, name: record?.name ?? '', current: record?.current ?? false };
}
