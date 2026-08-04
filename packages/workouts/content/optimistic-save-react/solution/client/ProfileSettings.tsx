import { useRef, useState } from 'react';

import { INITIAL_PROFILE, type Profile, type ProfileField, saveProfile } from './api';

const FIELDS: { field: ProfileField; label: string }[] = [
  { field: 'displayName', label: 'Display name' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'location', label: 'Location' },
];

type PerField<T> = Partial<Record<ProfileField, T>>;

function without<T>(map: PerField<T>, field: ProfileField): PerField<T> {
  const next = { ...map };
  delete next[field];
  return next;
}

/**
 * Your profile: three boxes to edit it in, and the version your team sees.
 *
 * Three pieces of state, and the split is the whole answer. `confirmed` is what
 * the server has told us it holds. `inFlight` is the value we are betting on
 * for a field whose save has not come back, one field at a time. `drafts` is
 * what is in the boxes, and the save flow never writes to it, because the
 * person typing owns that and we do not.
 */
export function ProfileSettings() {
  const [confirmed, setConfirmed] = useState<Profile>(INITIAL_PROFILE);
  const [inFlight, setInFlight] = useState<PerField<string>>({});
  const [failed, setFailed] = useState<PerField<true>>({});
  const [drafts, setDrafts] = useState<Profile>(INITIAL_PROFILE);

  /**
   * The newest save issued for each field. Every answer carries the ticket it
   * was issued with, and an answer whose ticket is no longer the newest is not
   * news: a later save of the same field has already spoken for it.
   */
  const latest = useRef<Record<ProfileField, number>>({
    displayName: 0,
    jobTitle: 0,
    location: 0,
  });
  const issued = useRef(0);

  const published = { ...confirmed, ...inFlight };

  const save = async (field: ProfileField): Promise<void> => {
    const value = drafts[field];
    issued.current += 1;
    const ticket = issued.current;
    latest.current[field] = ticket;

    setInFlight((current) => ({ ...current, [field]: value }));
    setFailed((current) => without(current, field));

    try {
      const server = await saveProfile(field, value);
      if (latest.current[field] !== ticket) return;
      // One field out of the answer, not the whole thing: the rest of it is the
      // server's opinion of fields we may still be saving.
      setConfirmed((current) => ({ ...current, [field]: server[field] }));
      setInFlight((current) => without(current, field));
    } catch {
      if (latest.current[field] !== ticket) return;
      // Drop the bet for this field and nothing else. What is underneath is the
      // last value the server confirmed, and the boxes are untouched.
      setInFlight((current) => without(current, field));
      setFailed((current) => ({ ...current, [field]: true }));
    }
  };

  return (
    <section>
      <h2>Your profile</h2>

      {FIELDS.map(({ field, label }) => (
        <div key={field}>
          <label htmlFor={`profile-${field}`}>{label}</label>
          <input
            id={`profile-${field}`}
            type="text"
            value={drafts[field]}
            onChange={(event) =>
              setDrafts((current) => ({ ...current, [field]: event.target.value }))
            }
          />
          <button type="button" onClick={() => void save(field)}>
            Save {label.toLowerCase()}
          </button>
          {failed[field] && (
            <p role="alert">{label} did not save. What you typed is still in the box.</p>
          )}
        </div>
      ))}

      <h3>How your team sees you</h3>
      <dl>
        {FIELDS.map(({ field, label }) => (
          <div key={field}>
            <dt>{label}</dt>
            <dd aria-label={`Published ${label.toLowerCase()}`}>{published[field]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
