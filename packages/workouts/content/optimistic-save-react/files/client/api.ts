export interface Profile {
  displayName: string;
  jobTitle: string;
  location: string;
}

export type ProfileField = keyof Profile;

/** What the server holds before anything has been saved. */
export const INITIAL_PROFILE: Profile = {
  displayName: 'A. Bhatt',
  jobTitle: 'Engineer',
  location: 'Leeds',
};

export type SaveStatus = 'in-flight' | 'accepted' | 'refused';

export interface SaveRequest {
  /** Request order, from 1. The server processes writes in this order. */
  readonly id: number;
  readonly field: ProfileField;
  readonly value: string;
  /** Where this one got to. */
  status: SaveStatus;
  /** Answer it: the server took the write. */
  succeed(): void;
  /** Answer it: the server turned the write down. */
  fail(): void;
}

/** Every save the panel has asked for, in the order it asked. */
export const saves: SaveRequest[] = [];

export const fixture = {
  reset(): void {
    saves.length = 0;
  },
};

/**
 * The profile as the server held it once it had processed request `upToId`.
 * Writes land in request order and only if they were accepted, so a reply that
 * comes back late describes an older profile than one that came back first.
 */
function profileAfter(upToId: number): Profile {
  const profile = { ...INITIAL_PROFILE };
  for (const save of saves) {
    if (save.id > upToId) break;
    if (save.status === 'accepted') profile[save.field] = save.value;
  }
  return profile;
}

/**
 * Save one field. The returned promise does not settle on its own: a checkpoint
 * calls `succeed()` or `fail()` on the matching entry in `saves`, in whatever
 * order it likes. That is how two answers arrive out of order without a clock.
 *
 * A real API has none of this. It has the same shape: one field in, the whole
 * profile back, and a rejection when the write did not happen.
 */
export function saveProfile(field: ProfileField, value: string): Promise<Profile> {
  let deliver: (() => void) | null = null;

  const request: SaveRequest = {
    id: saves.length + 1,
    field,
    value,
    status: 'in-flight',
    succeed(): void {
      if (request.status !== 'in-flight') return;
      request.status = 'accepted';
      deliver?.();
    },
    fail(): void {
      if (request.status !== 'in-flight') return;
      request.status = 'refused';
      deliver?.();
    },
  };

  const answer = new Promise<Profile>((resolve, reject) => {
    deliver = () => {
      if (request.status === 'accepted') resolve(profileAfter(request.id));
      else reject(new Error(`The server would not save ${field}.`));
    };
  });

  saves.push(request);
  return answer;
}
