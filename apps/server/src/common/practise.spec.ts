import type { Difficulty, HandbookPractiseLink } from '@hone/shared';
import { describe, expect, it } from 'vitest';

import { sortByWayIn } from './practise';

/**
 * The order a page's practise list is read in. Authors write the list by
 * subject rather than by difficulty, so the way in has to be found rather than
 * authored: see the on-ramp section of docs/roadmap.md.
 */

function link(
  slug: string,
  difficulty: Difficulty,
  kind: HandbookPractiseLink['kind'] = 'problem'
): HandbookPractiseLink {
  return { kind, slug, title: slug, difficulty };
}

const slugs = (links: HandbookPractiseLink[]): string[] => links.map((entry) => entry.slug);

describe('the practise list order', () => {
  it('puts the easiest problem first, whatever the authored order', () => {
    const sorted = sortByWayIn([link('c', 'hard'), link('a', 'easy'), link('b', 'medium')]);

    expect(slugs(sorted)).toEqual(['a', 'b', 'c']);
  });

  it('sinks workouts below every problem, including harder ones', () => {
    const sorted = sortByWayIn([
      link('easy-workout', 'easy', 'workout'),
      link('hard-problem', 'hard'),
    ]);

    expect(slugs(sorted)).toEqual(['hard-problem', 'easy-workout']);
  });

  it('keeps the authored order inside a difficulty, so a deliberate progression survives', () => {
    const sorted = sortByWayIn([
      link('second', 'easy'),
      link('hard-one', 'hard'),
      link('first', 'easy'),
    ]);

    expect(slugs(sorted)).toEqual(['second', 'first', 'hard-one']);
  });

  it('leaves an empty list alone', () => {
    expect(sortByWayIn([])).toEqual([]);
  });
});
