import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DIFFICULTIES,
  type Difficulty,
  QUEUE_MODES,
  type QueueMode,
  type QueueScope,
  type Tag,
  TAG_LABELS,
  TAGS,
} from '@devgym/shared';

/**
 * The practice session scope lives in the URL, so it survives a refresh and
 * follows you from `/practice` through every problem in the session.
 */
export function scopeFromSearch(params: URLSearchParams): QueueScope {
  const category = params.get('category');
  const difficulty = params.get('difficulty');
  const mode = params.get('mode');
  const tag = params.get('tag');

  return {
    ...(isCategory(category) ? { category } : {}),
    ...(isDifficulty(difficulty) ? { difficulty } : {}),
    ...(isMode(mode) && mode !== 'all' ? { mode } : {}),
    ...(isTag(tag) ? { tag } : {}),
  };
}

export function isScoped(scope: QueueScope): boolean {
  return Boolean(scope.category || scope.difficulty || scope.mode || scope.tag);
}

export function describeScope(scope: QueueScope): string {
  const parts: string[] = [];
  if (scope.mode === 'review') parts.push('missed');
  if (scope.mode === 'due') parts.push('due for review');
  if (scope.tag) parts.push(TAG_LABELS[scope.tag]);
  if (scope.difficulty) parts.push(scope.difficulty);
  // A tag already names the run, so "all categories" would only add noise.
  if (scope.category) parts.push(CATEGORY_LABELS[scope.category]);
  else if (!scope.tag) parts.push('all categories');
  return parts.join(' · ');
}

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

function isDifficulty(value: string | null): value is Difficulty {
  return value !== null && (DIFFICULTIES as readonly string[]).includes(value);
}

function isMode(value: string | null): value is QueueMode {
  return value !== null && (QUEUE_MODES as readonly string[]).includes(value);
}

function isTag(value: string | null): value is Tag {
  return value !== null && (TAGS as readonly string[]).includes(value);
}
