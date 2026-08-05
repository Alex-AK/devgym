export interface Chapter {
  startSeconds: number;
  title: string;
}

export interface Episode {
  id: string;
  show: string;
  title: string;
  durationSeconds: number;
  chapters: Chapter[];
}

/** One episode, as it comes back from the API. Nothing here changes while you listen. */
export const EPISODE: Episode = {
  id: 'ep-214',
  show: 'The Changeset',
  title: 'Shipping on a Friday',
  durationSeconds: 3500,
  chapters: [
    { startSeconds: 0, title: 'Cold open' },
    { startSeconds: 185, title: 'How Friday deploys got their name' },
    { startSeconds: 940, title: 'Feature flags in practice' },
    { startSeconds: 1880, title: 'Rolling back without a rollback' },
    { startSeconds: 2760, title: 'Listener questions' },
  ],
};

/** Seconds to `m:ss`, or `h:mm:ss` once there is an hour to show. */
export function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const paddedMinutes = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return `${hours > 0 ? `${hours}:` : ''}${paddedMinutes}:${String(seconds).padStart(2, '0')}`;
}

/** The chapter the playhead is inside: the last one that has started. */
export function chapterAt(chapters: Chapter[], positionSeconds: number): Chapter | null {
  let current: Chapter | null = null;
  for (const chapter of chapters) {
    if (chapter.startSeconds <= positionSeconds) current = chapter;
  }
  return current;
}
