import { describe, expect, it } from 'vitest';

import { parse } from '../../src/lib/parser';

/**
 * JSON.parse is the oracle. Anything it accepts, this parser has to accept, and
 * with the same answer.
 */
function agreesWithJson(input: string): void {
  expect(parse(input), `parsing ${input}`).toEqual(JSON.parse(input));
}

describe('a flat document parses to the right value', () => {
  it('parses a document that is one scalar', () => {
    for (const input of ['42', '-7.25', '0', '"hello"', '""', 'true', 'false', 'null']) {
      agreesWithJson(input);
    }
  });

  it('parses an empty object and an empty array', () => {
    expect(parse('{}')).toEqual({});
    expect(parse('[]')).toEqual([]);
    expect(Array.isArray(parse('[]'))).toBe(true);
  });

  it('parses a flat object', () => {
    agreesWithJson('{"name": "ada", "born": 1815, "alive": false, "died": null}');
  });

  it('parses a flat array', () => {
    agreesWithJson('[1, "two", true, null, -3.5]');
    expect(Array.isArray(parse('[1, 2, 3]'))).toBe(true);
  });

  it('keeps every key, including one whose value is null', () => {
    expect(Object.keys(parse('{"a": 1, "b": null, "c": 3}') as object)).toEqual(['a', 'b', 'c']);
  });

  it('does not care how the document is laid out', () => {
    agreesWithJson('  {  "a"  :  1  ,  "b"  :  2  }  ');
    agreesWithJson('  [  1  ,  2  ]  ');
    agreesWithJson('{\n  "a": 1,\n  "b": 2\n}\n');
  });

  it('parses a single-member object and a single-element array', () => {
    agreesWithJson('{"only": true}');
    agreesWithJson('[false]');
  });
});
