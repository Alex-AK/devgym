import { describe, expect, it } from 'vitest';

import { problemSeeds } from '../seed/problems.seed';
import { listManifests } from '../workouts/workout-content';
import {
  allPages,
  isShortener,
  LINK_SHORTENERS,
  listPages,
  listSections,
  parsePage,
  REQUIRED_HEADINGS,
} from './handbook-content';

/**
 * The content safety net, and the reason a page can be written quickly. It
 * enforces the citation policy from docs/content.md mechanically: something
 * to check the claims against, a link that still resolves to whoever is being
 * credited, and reps that actually exist.
 */

const pages = allPages();
const sections = listSections();

const practisable = new Set([
  ...problemSeeds.map((problem) => problem.slug),
  ...listManifests().map((workout) => workout.slug),
]);

/** A page with everything the validator wants, so a test can take one thing away. */
function page(overrides: { frontmatter?: string; body?: string } = {}): string {
  const frontmatter =
    overrides.frontmatter ??
    [
      'title: A page',
      'question: How does this work?',
      'verified: 2026-08-01',
      'practise:',
      '  - http-fetch-not-ok',
      'sources:',
      '  - author: MDN',
      '    title: Fetch',
      '    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    ].join('\n');

  const body =
    overrides.body ?? ['## The model', 'x', '## Worked example', 'x', '## Traps', 'x'].join('\n\n');

  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe('handbook sections', () => {
  it('has at least one section', () => {
    expect(sections.length).toBeGreaterThan(0);
  });

  it('gives every section a title, a summary and a place in the order', () => {
    for (const section of sections) {
      expect(section.title.trim(), section.slug).not.toBe('');
      expect(section.summary.trim(), section.slug).not.toBe('');
      expect(Number.isFinite(section.order), section.slug).toBe(true);
    }
  });

  it('orders sections without ties', () => {
    const orders = sections.map((section) => section.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe('handbook pages', () => {
  it('parses every page', () => {
    // The loader validates as it reads, so getting here at all is the assertion.
    expect(pages.length).toBeGreaterThanOrEqual(0);
  });

  it.runIf(pages.length > 0)('cites at least one source per page', () => {
    for (const entry of pages) {
      expect(entry.sources.length, `${entry.section}/${entry.slug}`).toBeGreaterThan(0);
    }
  });

  it.runIf(pages.length > 0)('cites nothing through a link shortener', () => {
    for (const entry of pages) {
      for (const source of entry.sources) {
        const host = new URL(source.url).hostname;
        expect(isShortener(host), `${entry.section}/${entry.slug} cites ${host}`).toBe(false);
      }
    }
  });

  it.runIf(pages.length > 0)('points every practise slug at a real problem or workout', () => {
    for (const entry of pages) {
      for (const slug of entry.practise) {
        expect(practisable.has(slug), `${entry.section}/${entry.slug} practise: ${slug}`).toBe(
          true
        );
      }
    }
  });

  it.runIf(pages.length > 0)('gives every page all five parts of the shape', () => {
    for (const entry of pages) {
      const where = `${entry.section}/${entry.slug}`;
      expect(entry.question.trim(), where).not.toBe('');
      expect(entry.practise.length, where).toBeGreaterThan(0);
      for (const heading of REQUIRED_HEADINGS) {
        expect(entry.body.includes(heading), `${where} is missing "${heading}"`).toBe(true);
      }
    }
  });

  it.runIf(pages.length > 0)('dates every page against a real check', () => {
    for (const entry of pages) {
      expect(entry.verified, `${entry.section}/${entry.slug}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('orders pages within a section without ties', () => {
    for (const section of sections) {
      const orders = listPages(section.slug).map((entry) => entry.order);
      expect(new Set(orders).size, section.slug).toBe(orders.length);
    }
  });
});

describe('the page validator', () => {
  it('accepts a well-formed page', () => {
    expect(() => parsePage(page(), 'test', 'ok')).not.toThrow();
  });

  it('refuses a page that cites nothing', () => {
    const frontmatter = [
      'title: A page',
      'question: How does this work?',
      'verified: 2026-08-01',
      'practise:',
      '  - http-fetch-not-ok',
    ].join('\n');
    expect(() => parsePage(page({ frontmatter }), 'test', 'bad')).toThrow(/cites no sources/);
  });

  it.each(LINK_SHORTENERS)('refuses a source behind %s', (domain) => {
    const frontmatter = [
      'title: A page',
      'question: How does this work?',
      'verified: 2026-08-01',
      'practise:',
      '  - http-fetch-not-ok',
      'sources:',
      '  - author: Someone',
      '    title: A post',
      `    url: https://${domain}/abc123`,
    ].join('\n');
    expect(() => parsePage(page({ frontmatter }), 'test', 'bad')).toThrow(/shortener/);
  });

  it('refuses a source that is not a followable url', () => {
    const frontmatter = [
      'title: A page',
      'question: How does this work?',
      'verified: 2026-08-01',
      'practise:',
      '  - http-fetch-not-ok',
      'sources:',
      '  - author: A vault note',
      '    title: sql-performance.md',
      '    url: file:///notes/sql-performance.md',
    ].join('\n');
    expect(() => parsePage(page({ frontmatter }), 'test', 'bad')).toThrow(/not http\(s\)/);
  });

  it('refuses a page with nothing to practise', () => {
    const frontmatter = [
      'title: A page',
      'question: How does this work?',
      'verified: 2026-08-01',
      'sources:',
      '  - author: MDN',
      '    title: Fetch',
      '    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    ].join('\n');
    expect(() => parsePage(page({ frontmatter }), 'test', 'bad')).toThrow(/nothing to practise/);
  });

  it.each(REQUIRED_HEADINGS)('refuses a page missing %s', (heading) => {
    const body = REQUIRED_HEADINGS.filter((one) => one !== heading)
      .map((one) => `${one}\n\nx`)
      .join('\n\n');
    expect(() => parsePage(page({ body }), 'test', 'bad')).toThrow(/is missing its/);
  });

  it('refuses a page whose verified date is not a date', () => {
    const frontmatter = [
      'title: A page',
      'question: How does this work?',
      'verified: recently',
      'practise:',
      '  - http-fetch-not-ok',
      'sources:',
      '  - author: MDN',
      '    title: Fetch',
      '    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    ].join('\n');
    expect(() => parsePage(page({ frontmatter }), 'test', 'bad')).toThrow(/YYYY-MM-DD/);
  });
});
