import { createHash } from 'node:crypto';

/**
 * A digest of a request body, stable across key order: the same payment written
 * two ways fingerprints the same, so a client that reorders its JSON is not
 * accused of changing the payment.
 */
export function fingerprint(body: unknown): string {
  return createHash('sha256').update(stable(body)).digest('hex');
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;

  return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stable(nested)}`)
    .join(',')}}`;
}
