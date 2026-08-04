import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { saveContactDetails } from './api';
import {
  type ContactDetails,
  type FieldErrors,
  type FieldName,
  SAVE_FAILED,
  SAVED,
  summarise,
  validate,
} from './rules';

const EMPTY: ContactDetails = { fullName: '', email: '', phone: '' };

export interface ContactDetailsFormProps {
  onSaved?: (details: ContactDetails) => void;
}

export function ContactDetailsForm({ onSaved }: ContactDetailsFormProps) {
  const [values, setValues] = useState<ContactDetails>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const change = (field: FieldName) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValues((current) => ({ ...current, [field]: next }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The second press of a double press, a retry on a slow connection, a
    // second tab. Only the first of them is a save the user asked for.
    if (saving) return;

    const found = validate(values);
    const count = Object.keys(found).length;

    if (count > 0) {
      // flushSync so the field carries aria-invalid and its description before
      // focus lands on it, rather than a tick later once nobody is listening.
      flushSync(() => {
        setErrors(found);
        setNotice(summarise(count));
      });

      const first = (Object.keys(found) as FieldName[])[0];
      const field = first ? formRef.current?.elements.namedItem(first) : null;
      (field as HTMLElement | null)?.focus();
      return;
    }

    setErrors(found);
    setNotice('');
    setSaving(true);
    try {
      await saveContactDetails(values);
      setNotice(SAVED);
      onSaved?.(values);
    } catch {
      setNotice(SAVE_FAILED);
    }
    // Not only on the way out through the success branch: a save that failed
    // has to give the form back, or one dropped connection ends the session.
    setSaving(false);
  }

  return (
    <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
      <h2>Contact details</h2>

      {/*
        Mounted from the first render and empty until there is something to say.
        A region that arrives already carrying its text has not changed, so
        there is nothing for assistive technology to announce.
      */}
      <p className="form-notice" role="status">
        {notice}
      </p>

      <div className="field">
        <label htmlFor="full-name">Full name</label>
        <input
          id="full-name"
          name="fullName"
          required
          autoComplete="name"
          // Cleared rather than left behind, or the field goes on claiming to
          // be wrong after it has been fixed.
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'full-name-error' : undefined}
          value={values.fullName}
          onChange={change('fullName')}
        />
        {errors.fullName && (
          <p className="field-error" id="full-name-error">
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          value={values.email}
          onChange={change('email')}
        />
        {errors.email && (
          <p className="field-error" id="email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          value={values.phone}
          onChange={change('phone')}
        />
        {errors.phone && (
          <p className="field-error" id="phone-error">
            {errors.phone}
          </p>
        )}
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving' : 'Save changes'}
      </button>
    </form>
  );
}
