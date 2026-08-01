import { describe, expect, it } from 'vitest';

import { tokenize } from '../../src/lib/tokenizer';

describe('the text becomes a token stream', () => {
  it('gives every structural character its own token', () => {
    expect(tokenize('{}[]:,')).toEqual([
      { type: 'punctuation', value: '{' },
      { type: 'punctuation', value: '}' },
      { type: 'punctuation', value: '[' },
      { type: 'punctuation', value: ']' },
      { type: 'punctuation', value: ':' },
      { type: 'punctuation', value: ',' },
    ]);
  });

  it('reads a string as its text, without the quotes', () => {
    expect(tokenize('"hello"')).toEqual([{ type: 'string', value: 'hello' }]);
    expect(tokenize('""')).toEqual([{ type: 'string', value: '' }]);
  });

  it('reads a number as a number, not as the text it was written as', () => {
    expect(tokenize('42')).toEqual([{ type: 'number', value: 42 }]);
    expect(tokenize('-3.5')).toEqual([{ type: 'number', value: -3.5 }]);
    expect(tokenize('0')).toEqual([{ type: 'number', value: 0 }]);
  });

  it('reads true, false and null', () => {
    expect(tokenize('true')).toEqual([{ type: 'boolean', value: true }]);
    expect(tokenize('false')).toEqual([{ type: 'boolean', value: false }]);
    expect(tokenize('null')).toEqual([{ type: 'null', value: null }]);
  });

  it('skips the whitespace between tokens', () => {
    expect(tokenize('  \n\t\r[ 1 ,\n 2 ]  ')).toEqual([
      { type: 'punctuation', value: '[' },
      { type: 'number', value: 1 },
      { type: 'punctuation', value: ',' },
      { type: 'number', value: 2 },
      { type: 'punctuation', value: ']' },
    ]);
  });

  it('keeps the whitespace that is inside a string', () => {
    expect(tokenize('"  two  words  "')).toEqual([{ type: 'string', value: '  two  words  ' }]);
  });

  it('has nothing to report for an empty document', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   \n  ')).toEqual([]);
  });

  it('tokenises a whole document in order', () => {
    expect(tokenize('{"name": "ada", "born": 1815, "alive": false, "died": null}')).toEqual([
      { type: 'punctuation', value: '{' },
      { type: 'string', value: 'name' },
      { type: 'punctuation', value: ':' },
      { type: 'string', value: 'ada' },
      { type: 'punctuation', value: ',' },
      { type: 'string', value: 'born' },
      { type: 'punctuation', value: ':' },
      { type: 'number', value: 1815 },
      { type: 'punctuation', value: ',' },
      { type: 'string', value: 'alive' },
      { type: 'punctuation', value: ':' },
      { type: 'boolean', value: false },
      { type: 'punctuation', value: ',' },
      { type: 'string', value: 'died' },
      { type: 'punctuation', value: ':' },
      { type: 'null', value: null },
      { type: 'punctuation', value: '}' },
    ]);
  });
});
