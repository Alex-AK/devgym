import { useState } from 'react';

import { INITIAL_PROFILE, type Profile, type ProfileField, saveProfile } from './api';

const FIELDS: { field: ProfileField; label: string }[] = [
  { field: 'displayName', label: 'Display name' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'location', label: 'Location' },
];

/**
 * Your profile: three boxes to edit it in, and the version your team sees.
 *
 * Every save waits for the server before anything on screen moves, and the
 * panel is shut for the duration.
 *
 * TODO: make a change land straight away and survive a save that does not. See
 * brief.md.
 */
export function ProfileSettings() {
  const [published, setPublished] = useState<Profile>(INITIAL_PROFILE);
  const [drafts, setDrafts] = useState<Profile>(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);

  const save = async (field: ProfileField): Promise<void> => {
    setSaving(true);
    try {
      // Wait for the server, then show whatever it says it now has.
      const server = await saveProfile(field, drafts[field]);
      setPublished(server);
    } catch {
      // Nothing to do. The change does not happen.
    } finally {
      setSaving(false);
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
            disabled={saving}
            onChange={(event) =>
              setDrafts((current) => ({ ...current, [field]: event.target.value }))
            }
          />
          <button type="button" disabled={saving} onClick={() => void save(field)}>
            Save {label.toLowerCase()}
          </button>
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
