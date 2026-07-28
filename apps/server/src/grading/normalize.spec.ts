import { describe, expect, it } from 'vitest';

import { normalizeAnswer, stripCodeFence, stripWrappingQuotes } from './normalize';

describe('stripWrappingQuotes', () => {
  it('removes matching wrapping quotes and backticks', () => {
    expect(stripWrappingQuotes('"sale"')).toBe('sale');
    expect(stripWrappingQuotes("'sale'")).toBe('sale');
    expect(stripWrappingQuotes('`sale`')).toBe('sale');
    expect(stripWrappingQuotes('“sale”')).toBe('sale');
  });

  it('unwraps repeatedly but leaves unbalanced quotes alone', () => {
    expect(stripWrappingQuotes('`"sale"`')).toBe('sale');
    expect(stripWrappingQuotes('"sale')).toBe('"sale');
    expect(stripWrappingQuotes("it's fine")).toBe("it's fine");
  });
});

describe('stripCodeFence', () => {
  it('unwraps a fenced block, keeping the code', () => {
    expect(stripCodeFence("```js\nurl.searchParams.getAll('tag')\n```")).toBe(
      "url.searchParams.getAll('tag')"
    );
    expect(stripCodeFence('```\nSELECT 1\n```')).toBe('SELECT 1');
  });

  it('leaves unfenced text untouched', () => {
    expect(stripCodeFence('  SELECT 1  ')).toBe('SELECT 1');
  });
});

describe('normalizeAnswer', () => {
  it('folds case and collapses internal whitespace', () => {
    expect(normalizeAnswer('  Promise.ALLSETTLED   returns\n an  array ')).toBe(
      'promise.allsettled returns an array'
    );
  });

  it('strips wrapping quotes and trailing punctuation', () => {
    expect(normalizeAnswer('"Sale".')).toBe('sale');
    expect(normalizeAnswer('`find`;')).toBe('find');
    expect(normalizeAnswer('Find!')).toBe('find');
  });

  it('keeps internal quotes', () => {
    expect(normalizeAnswer("URL.searchParams.get('tag')")).toBe("url.searchparams.get('tag')");
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeAnswer('   \n  ')).toBe('');
  });
});
