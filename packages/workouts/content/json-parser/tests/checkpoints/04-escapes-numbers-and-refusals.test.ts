import { describe, expect, it } from 'vitest';

import { parse } from '../../src/lib/parser';

function agreesWithJson(input: string): void {
  expect(parse(input), `parsing ${input}`).toEqual(JSON.parse(input));
}

describe('escapes, number edge cases, and refusing what is not JSON', () => {
  it('resolves the one-letter escapes to single characters', () => {
    expect(parse('"a\\nb"')).toBe('a\nb');
    expect(parse('"a\\tb"')).toBe('a\tb');
    expect(parse('"a \\"quoted\\" word"')).toBe('a "quoted" word');
    expect(parse('"back\\\\slash"')).toBe('back\\slash');
    expect(parse('"a\\/b"')).toBe('a/b');
    expect(parse('"\\b\\f\\r"')).toBe('\b\f\r');
    expect((parse('"a\\nb"') as string).length).toBe(3);
  });

  it('turns four hex digits into one character', () => {
    expect(parse('"\\u00e9"')).toBe('\u00e9');
    expect(parse('"\\u2603"')).toBe('\u2603');
    expect(parse('"\\u0041\\u0042"')).toBe('AB');
    // A surrogate pair is two escapes that make one visible character.
    expect(parse('"\\ud83d\\ude00"')).toBe('\ud83d\ude00');
    expect((parse('"\\u2603"') as string).length).toBe(1);
  });

  it('resolves escapes in keys, not only in values', () => {
    agreesWithJson('{"a\\nb": "c\\td", "quote\\"key": 1}');
  });

  it('parses exponents, signs and fractions', () => {
    for (const input of ['1e3', '1E3', '1e+3', '1e-3', '-2.5e2', '0.5', '-0.125', '-42', '0']) {
      agreesWithJson(input);
    }
  });

  it('parses numbers inside a document', () => {
    agreesWithJson('{"big": 1e21, "small": 1.5e-7, "neg": -0.25, "zero": 0}');
  });

  const refusals: [string, string][] = [
    ['a trailing comma in an object', '{"a": 1,}'],
    ['a trailing comma in an array', '[1,]'],
    ['single quotes', "{'a': 1}"],
    ['an unquoted key', '{a: 1}'],
    ['a leading zero', '01'],
    ['a leading zero inside a document', '{"a": 01}'],
    ['an object that stops early', '{"a":'],
    ['an array that stops early', '[1, 2'],
    ['a string that never closes', '"unterminated'],
    ['an empty document', ''],
    ['whitespace only', '   '],
    ['anything after the value', '{} junk'],
    ['a second value after the first', '[1] [2]'],
    ['a missing colon', '{"a" 1}'],
    ['a bare word', 'nope'],
  ];

  it.each(refusals)('throws on %s', (_what, input) => {
    expect(() => parse(input)).toThrow();
  });

  it('accepts every document JSON.parse accepts, escapes and all', () => {
    const document = JSON.stringify({
      lines: 'one\ntwo\tthree',
      quoted: 'she said "hi"',
      path: 'C:\\\\temp',
      snowman: '\u2603',
      numbers: [0, -1, 2.5, 1e21, 1e-7],
    });

    expect(parse(document)).toEqual(JSON.parse(document));
  });
});
