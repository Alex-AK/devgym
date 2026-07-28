import { describe, expect, it } from 'vitest';

import { gradeShortText } from './text-grader';
import type { ShortTextGraderConfig } from './types';

const findConfig: ShortTextGraderConfig = {
  accept: ['find', 'array.prototype.find', '.find', 'find()', 'arr.find'],
  nearMisses: {
    filter: 'filter() returns *all* matches in a new array — we want a single element.',
    findindex: 'findIndex() returns the position, not the element.',
  },
  hints: ['hint one', 'hint two'],
};

const patternConfig: ShortTextGraderConfig = {
  accept: [],
  acceptPatterns: ['searchParams\\s*\\.\\s*getAll\\(\\s*["\'`]tag["\'`]\\s*\\)'],
  nearMisses: { "url.searchParams.get('tag')": 'get() only returns the first value.' },
  hints: [],
};

const fuzzyConfig: ShortTextGraderConfig = {
  accept: ['abortcontroller'],
  hints: [],
};

describe('gradeShortText', () => {
  it('accepts an exact answer, ignoring case, quotes and punctuation', () => {
    expect(gradeShortText('find', findConfig).verdict).toBe('correct');
    expect(gradeShortText('  `Find`.  ', findConfig).verdict).toBe('correct');
    expect(gradeShortText('Array.prototype.find', findConfig).verdict).toBe('correct');
  });

  it('accepts a regex pattern match against the raw answer', () => {
    expect(gradeShortText("url.searchParams.getAll('tag')", patternConfig).verdict).toBe('correct');
    expect(gradeShortText('url.searchParams.getAll( "tag" )', patternConfig).verdict).toBe(
      'correct'
    );
    expect(
      gradeShortText("```js\nurl.searchParams.getAll('tag')\n```", patternConfig).verdict
    ).toBe('correct');
  });

  it('returns close with tailored feedback for a known near miss', () => {
    const result = gradeShortText('filter', findConfig);
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('all* matches');

    const patternMiss = gradeShortText("url.searchParams.get('tag')", patternConfig);
    expect(patternMiss.verdict).toBe('close');
    expect(patternMiss.feedback).toBe('get() only returns the first value.');
  });

  it('returns close for a configured close-substring', () => {
    const config: ShortTextGraderConfig = {
      accept: [],
      acceptPatterns: ['new\\s+URLSearchParams\\(\\s*params\\s*\\)\\s*\\.\\s*toString\\(\\s*\\)'],
      closeSubstrings: { urlsearchparams: 'Right API — check how you construct and serialize it.' },
      hints: [],
    };
    expect(gradeShortText('new URLSearchParams(params).toString()', config).verdict).toBe(
      'correct'
    );
    const close = gradeShortText('URLSearchParams(params)', config);
    expect(close.verdict).toBe('close');
    expect(close.feedback).toContain('Right API');
  });

  it('tolerates typos in long answers via fuzzy matching', () => {
    expect(gradeShortText('abortcontroler', fuzzyConfig).verdict).toBe('correct');
    expect(gradeShortText('abortcontrol', fuzzyConfig).verdict).toBe('close');
  });

  it('does not fuzzy-match short accept strings', () => {
    // "fine" is one edit from "find" but find is under the fuzzy length floor.
    expect(gradeShortText('fine', findConfig).verdict).toBe('incorrect');
  });

  it('rejects garbage and empty answers', () => {
    expect(gradeShortText('banana split', findConfig).verdict).toBe('incorrect');
    expect(gradeShortText('   ', findConfig).verdict).toBe('incorrect');
  });
});
