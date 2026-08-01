import { describe, expect, it } from 'vitest';

import { parse } from '../../src/lib/parser';

const DOCUMENT = `{
  "team": "platform",
  "members": [
    { "name": "ada", "tags": ["oncall", "reviewer"], "manager": null },
    { "name": "grace", "tags": [], "manager": { "name": "ada", "tags": ["oncall"] } }
  ],
  "counts": { "open": { "bugs": 3, "features": 0 }, "closed": { "bugs": 11 } }
}`;

/** Wrap `"leaf"` in `depth` alternating arrays and objects. */
function nest(depth: number): string {
  let document = '"leaf"';
  for (let level = 0; level < depth; level += 1) {
    document = level % 2 === 0 ? `[${document}]` : `{"in": ${document}}`;
  }
  return document;
}

describe('nesting goes as deep as the document does', () => {
  it('agrees with JSON.parse on objects inside arrays inside objects', () => {
    expect(parse(DOCUMENT)).toEqual(JSON.parse(DOCUMENT));
  });

  it('puts the right value at the right path', () => {
    const parsed = parse(DOCUMENT) as {
      members: { name: string; tags: string[]; manager: { name: string } | null }[];
      counts: { open: { bugs: number; features: number } };
    };

    expect(parsed.members[1]?.name).toBe('grace');
    expect(parsed.members[0]?.tags[1]).toBe('reviewer');
    expect(parsed.members[1]?.tags).toEqual([]);
    expect(parsed.members[1]?.manager?.name).toBe('ada');
    expect(parsed.members[0]?.manager).toBeNull();
    expect(parsed.counts.open.features).toBe(0);
  });

  it('handles empty containers inside full ones', () => {
    const input = '{"a": [], "b": {}, "c": [[], [{}], {"d": []}]}';
    expect(parse(input)).toEqual(JSON.parse(input));
  });

  it('goes a hundred levels down without losing the leaf', () => {
    const input = nest(100);
    expect(parse(input)).toEqual(JSON.parse(input));
  });

  it('keeps siblings at the same level apart', () => {
    const input = '[{"a": [1, [2, [3]]]}, {"a": [4]}, [[["deep"]]]]';
    expect(parse(input)).toEqual(JSON.parse(input));
  });
});
