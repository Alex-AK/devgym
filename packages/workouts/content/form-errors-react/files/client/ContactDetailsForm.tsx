import { type ChangeEvent, type FormEvent, useState } from 'react';

import { saveContactDetails } from './api';
import {
  type ContactDetails,
  type FieldErrors,
  SAVE_FAILED,
  SAVED,
  summarise,
  validate,
} from './rules';

const EMPTY: ContactDetails = { fullName: '', email: '', phone: '' };

export interface ContactDetailsFormProps {
  onSaved?: (details: ContactDetails) => void;
}

/**
 * The contact details form on the account page.
 *
 * It validates on submit, puts a count at the top and a message under every
 * field that failed, and saves when all three pass. All of which you can see.
 *
 * TODO: see brief.md.
 */
export function ContactDetailsForm({ onSaved }: ContactDetailsFormProps) {
  const [values, setValues] = useState<ContactDetails>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const change = (field: keyof ContactDetails) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValues((current) => ({ ...current, [field]: next }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);

    const count = Object.keys(found).length;
    if (count > 0) {
      setNotice(summarise(count));
      return;
    }

    setNotice('');
    setSaving(true);
    try {
      await saveContactDetails(values);
      setNotice(SAVED);
      onSaved?.(values);
    } catch {
      setNotice(SAVE_FAILED);
    }
    setSaving(false);
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <h2>Contact details</h2>

      {notice && <p className="form-notice">{notice}</p>}

      <div className="field">
        <label htmlFor="full-name">Full name</label>
        <input
          id="full-name"
          name="fullName"
          required
          autoComplete="name"
          value={values.fullName}
          onChange={change('fullName')}
        />
        {errors.fullName && <p className="field-error">{errors.fullName}</p>}
      </div>

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={change('email')}
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          value={values.phone}
          onChange={change('phone')}
        />
        {errors.phone && <p className="field-error">{errors.phone}</p>}
      </div>

      <button type="submit">{saving ? 'Saving' : 'Save changes'}</button>
    </form>
  );
}
