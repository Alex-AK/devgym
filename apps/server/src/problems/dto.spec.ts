import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { QueueScopeQueryDto, toQueueScope } from './dto';

/**
 * The wire boundary, which is the one place the URL's spelling and the queue's
 * shape have to agree. Express hands a repeated param over as an array and a
 * single one as a bare string, and the app has been emitting single ones for as
 * long as it has existed: every `practise` link, every dashboard tile and every
 * example in the docs. So both shapes are tested here rather than trusted.
 */
function parse(query: Record<string, unknown>): {
  errors: string[];
  scope: ReturnType<typeof toQueueScope>;
} {
  const dto = plainToInstance(QueueScopeQueryDto, query);
  const errors = validateSync(dto).map((error) => error.property);
  return { errors, scope: toQueueScope(dto) };
}

describe('queue scope over the wire', () => {
  it('reads a repeated param as a list', () => {
    const { errors, scope } = parse({ category: ['sql', 'react'], difficulty: ['easy', 'hard'] });

    expect(errors).toEqual([]);
    expect(scope).toEqual({ category: ['sql', 'react'], difficulty: ['easy', 'hard'] });
  });

  it('still reads a single param, which is what every existing link emits', () => {
    const { errors, scope } = parse({ category: 'sql' });

    expect(errors).toEqual([]);
    expect(scope).toEqual({ category: ['sql'] });
  });

  it('passes the axes that stay single through untouched', () => {
    expect(parse({ mode: 'review', tag: 'reading' }).scope).toEqual({
      mode: 'review',
      tag: 'reading',
    });
  });

  /** `mode=all` is the absence of a mode, and has to stay the absence of one. */
  it('drops a mode of all and an empty scope', () => {
    expect(parse({ mode: 'all' }).scope).toEqual({});
    expect(parse({}).scope).toEqual({});
  });

  it('refuses a value that is not a category, however it arrives', () => {
    expect(parse({ category: 'sqlite' }).errors).toEqual(['category']);
    expect(parse({ category: ['sql', 'sqlite'] }).errors).toEqual(['category']);
    expect(parse({ difficulty: ['impossible'] }).errors).toEqual(['difficulty']);
  });
});
