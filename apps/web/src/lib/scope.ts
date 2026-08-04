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
} from '@hone/shared';

/**
 * The practice session scope lives in the URL, so it survives a refresh and
 * follows you from `/practice` through every problem in the session.
 *
 * A list axis is spelled as a repeated param, `?category=sql&category=react`,
 * rather than one comma-joined value: a category slug can then never collide
 * with the separator, and the single `?category=sql` that every `practise` link,
 * dashboard tile and doc still emits parses as a list of one for free.
 */
export function scopeFromSearch(params: URLSearchParams): QueueScope {
  const category = params.getAll('category').filter(isCategory);
  const difficulty = params.getAll('difficulty').filter(isDifficulty);
  const mode = params.get('mode');
  const tag = params.get('tag');

  return {
    ...(category.length > 0 ? { category } : {}),
    ...(difficulty.length > 0 ? { difficulty } : {}),
    ...(isMode(mode) && mode !== 'all' ? { mode } : {}),
    ...(isTag(tag) ? { tag } : {}),
  };
}

export function isScoped(scope: QueueScope): boolean {
  return Boolean(scope.category?.length || scope.difficulty?.length || scope.mode || scope.tag);
}

/**
 * What the run is, in one line. A list stops at its first value and counts the
 * rest, because the header this sits in has a sentence to finish: naming five
 * categories in it would bury the numbers it is there to carry.
 */
export function describeScope(scope: QueueScope): string {
  const parts: string[] = [];
  if (scope.mode === 'review') parts.push('missed');
  if (scope.mode === 'due') parts.push('due for review');
  if (scope.tag) parts.push(TAG_LABELS[scope.tag]);
  if (scope.difficulty?.length) parts.push(summarise(scope.difficulty, (entry) => entry));
  // A tag already names the run, so "all categories" would only add noise.
  if (scope.category?.length) {
    parts.push(summarise(scope.category, (entry) => CATEGORY_LABELS[entry]));
  } else if (!scope.tag) parts.push('all categories');
  return parts.join(' · ');
}

function summarise<T>(values: readonly T[], label: (value: T) => string): string {
  const [first, second] = values;
  if (first === undefined) return '';
  if (values.length === 1) return label(first);
  if (values.length === 2 && second !== undefined) return `${label(first)} and ${label(second)}`;
  return `${label(first)} and ${values.length - 1} others`;
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

function isMode(value: string | null): value is QueueMode {
  return value !== null && (QUEUE_MODES as readonly string[]).includes(value);
}

function isTag(value: string | null): value is Tag {
  return value !== null && (TAGS as readonly string[]).includes(value);
}
