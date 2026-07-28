import type { SessionResponse } from '@devgym/shared';

/**
 * The next problem to work on inside a session: the first pending item after
 * the current one, wrapping to the first pending item overall. Returns null
 * when nothing is left, which is the signal to show the summary.
 */
export function nextInSession(
  session: SessionResponse,
  currentSlug: string,
  direction: 'next' | 'prev' = 'next'
): string | null {
  const pending = session.items.filter((item) => item.status === 'pending');
  if (pending.length === 0) return null;

  const index = session.items.findIndex((item) => item.slug === currentSlug);
  if (index === -1) return pending[0]?.slug ?? null;

  const ordered =
    direction === 'next'
      ? [...session.items.slice(index + 1), ...session.items.slice(0, index)]
      : [...session.items.slice(0, index)]
          .reverse()
          .concat([...session.items.slice(index + 1)].reverse());

  return ordered.find((item) => item.status === 'pending')?.slug ?? pending[0]?.slug ?? null;
}

export function sessionPosition(session: SessionResponse, slug: string): number | null {
  const item = session.items.find((entry) => entry.slug === slug);
  return item ? item.position : null;
}

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
