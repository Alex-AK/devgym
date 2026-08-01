import { describe, expect, it } from 'vitest';

import { parseDocument, readObjectList, readOptionalNumber, readString } from './frontmatter';

const parse = (source: string) => parseDocument(source, 'test.md');

describe('parseDocument', () => {
  it('reads scalars, lists and lists of objects', () => {
    const { data, body } = parse(
      [
        '---',
        'title: Server-Sent Events',
        'order: 3',
        'practise:',
        '  - http-streaming-response',
        '  - live-dashboard-sse',
        'sources:',
        '  - author: MDN',
        '    title: Using server-sent events',
        '    url: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events',
        '---',
        '',
        '## The model',
        '',
        'One connection, held open.',
      ].join('\n')
    );

    expect(data.title).toBe('Server-Sent Events');
    expect(data.order).toBe('3');
    expect(data.practise).toEqual(['http-streaming-response', 'live-dashboard-sse']);
    expect(data.sources).toEqual([
      {
        author: 'MDN',
        title: 'Using server-sent events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events',
      },
    ]);
    expect(body).toBe('## The model\n\nOne connection, held open.');
  });

  it('keeps a url whole rather than reading its scheme as a key', () => {
    const { data } = parse(['---', 'urls:', '  - https://example.com/a:b', '---', ''].join('\n'));
    expect(data.urls).toEqual(['https://example.com/a:b']);
  });

  it('keeps a # inside a url, which is a fragment and not a comment', () => {
    const { data } = parse(
      ['---', 'sources:', '  - url: https://example.com/page#anchor', '---', ''].join('\n')
    );
    expect(data.sources).toEqual([{ url: 'https://example.com/page#anchor' }]);
  });

  it('strips matching quotes, so a value can hold a colon', () => {
    const { data } = parse(['---', "question: 'Why: really?'", '---', ''].join('\n'));
    expect(data.question).toBe('Why: really?');
  });

  it('reads several objects from one list', () => {
    const { data } = parse(
      ['---', 'sources:', '  - author: A', '    title: One', '  - author: B', '---', ''].join('\n')
    );
    expect(data.sources).toEqual([{ author: 'A', title: 'One' }, { author: 'B' }]);
  });

  it('leaves the body alone, fences and all', () => {
    const { body } = parse(
      ['---', 'title: x', '---', '', '```ts', 'const a = 1;', '```'].join('\n')
    );
    expect(body).toBe('```ts\nconst a = 1;\n```');
  });

  it.each([
    ['no frontmatter at all', '# Just markdown\n'],
    ['an unclosed block', '---\ntitle: x\n\n# body\n'],
    ['a line that is not key: value', '---\ntitle: x\nnonsense\n---\n'],
    ['a repeated key', '---\ntitle: x\ntitle: y\n---\n'],
    ['an empty key', '---\n: x\n---\n'],
    ['a key with nothing under it', '---\ntitle: x\npractise:\n---\n'],
    ['inline JSON', '---\npractise: [a, b]\n---\n'],
    ['a list mixing plain items and objects', '---\nl:\n  - plain\n  - author: A\n---\n'],
  ])('rejects %s', (_why, source) => {
    expect(() => parse(source)).toThrow(/test\.md/);
  });

  it('names the line the problem is on', () => {
    expect(() => parse('---\ntitle: x\nnonsense\n---\n')).toThrow(/test\.md:3/);
  });
});

describe('readers', () => {
  const data = { title: 'x', blank: '   ', list: ['a'], objects: [{ author: 'A' }] };

  it('requires a non-empty string', () => {
    expect(readString(data, 'title', 'p')).toBe('x');
    expect(() => readString(data, 'blank', 'p')).toThrow(/non-empty "blank"/);
    expect(() => readString(data, 'missing', 'p')).toThrow(/non-empty "missing"/);
  });

  it('reads an optional number, and refuses a non-number', () => {
    expect(readOptionalNumber(data, 'missing', 'p')).toBeNull();
    expect(readOptionalNumber({ order: '12' }, 'order', 'p')).toBe(12);
    expect(() => readOptionalNumber({ order: 'soon' }, 'order', 'p')).toThrow(/must be a number/);
  });

  it('refuses a list of the wrong shape', () => {
    expect(() => readObjectList(data, 'list', 'p')).toThrow(/must be a list of objects/);
  });
});
