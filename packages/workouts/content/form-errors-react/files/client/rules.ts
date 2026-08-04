export interface ContactDetails {
  fullName: string;
  email: string;
  phone: string;
}

export type FieldName = keyof ContactDetails;

export type FieldErrors = Partial<Record<FieldName, string>>;

/** The message shown against each field, and the one read out with it. */
export const MESSAGES: Record<FieldName, string> = {
  fullName: 'Enter your full name.',
  email: 'Enter an email address, including the @.',
  phone: 'Enter a phone number with at least 7 digits.',
};

export const SAVED = 'Contact details saved.';

export const SAVE_FAILED = 'Could not save your details. Try again.';

/**
 * The rules and the wording, written already. Neither is part of the exercise,
 * and the checkpoints read both from here rather than from the markup.
 *
 * Keys come back in the order the fields appear in the form.
 */
export function validate(values: ContactDetails): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) errors.fullName = MESSAGES.fullName;
  if (!values.email.includes('@')) errors.email = MESSAGES.email;
  if (values.phone.replace(/\D/g, '').length < 7) errors.phone = MESSAGES.phone;

  return errors;
}

/** The line at the top of the form after a submit that went nowhere. */
export function summarise(count: number): string {
  return count === 1 ? '1 field needs attention.' : `${count} fields need attention.`;
}
