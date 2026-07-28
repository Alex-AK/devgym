const UNITS: Array<[label: string, seconds: number]> = [
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
];

/** "just now" / "3 minutes ago" / "2 days ago", falling back to a date. */
export function relativeTime(isoOrSqlDate: string): string {
  const timestamp = Date.parse(normalizeTimestamp(isoOrSqlDate));
  if (Number.isNaN(timestamp)) return isoOrSqlDate;

  const seconds = Math.max(0, (Date.now() - timestamp) / 1000);
  if (seconds < 45) return 'just now';

  for (const [label, size] of UNITS) {
    if (seconds >= size) {
      const value = Math.floor(seconds / size);
      if (label === 'day' && value > 6) {
        return new Date(timestamp).toLocaleDateString();
      }
      return `${value} ${label}${value === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

/** SQLite CURRENT_TIMESTAMP has no timezone marker; treat it as UTC. */
function normalizeTimestamp(value: string): string {
  if (value.includes('T') || value.endsWith('Z')) return value;
  return `${value.replace(' ', 'T')}Z`;
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
