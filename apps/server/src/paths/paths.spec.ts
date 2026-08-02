import { describe, expect, it } from 'vitest';

import { allPages } from '../handbook/handbook-content';
import { listModules } from '../modules/modules-content';
import { problemSeeds } from '../seed/problems.seed';
import { listManifests } from '../workouts/workout-content';
import { listPaths, parsePath } from './paths-content';

/**
 * The safety net for the essentials path. It adds no content, so the only way
 * it can break is by pointing at content that moved: a page renamed, a problem
 * slug edited, a workout directory gone. Everything here is that check, plus
 * the format's one structural rule, which is read then prove then build.
 */

const paths = listPaths();

const pageRefs = new Set(allPages().map((page) => `${page.section}/${page.slug}`));
const problemSlugs = new Set(problemSeeds.map((problem) => problem.slug));
const workoutSlugs = new Set(listManifests().map((workout) => workout.slug));
const moduleSlugs = new Set(listModules().map((entry) => entry.slug));

/** A session with everything the validator wants, so a test can take one thing away. */
function session(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    slug: 'ok',
    title: 'An hour',
    question: 'What actually happens here?',
    summary: 'One slice of the work.',
    order: 1,
    minutes: 60,
    steps: [
      { kind: 'page', ref: 'moving-data/request-response' },
      { kind: 'problem', ref: 'http-fetch-not-ok' },
    ],
    ...overrides,
  });
}

describe('the essentials path', () => {
  it('parses every session', () => {
    // The loader validates as it reads, so getting here at all is the assertion.
    expect(paths.length).toBeGreaterThan(0);
  });

  it('orders sessions without ties', () => {
    const orders = paths.map((path) => path.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('gives every session a question, a summary and a budget', () => {
    for (const path of paths) {
      expect(path.question.trim(), path.slug).not.toBe('');
      expect(path.summary.trim(), path.slug).not.toBe('');
      expect(path.minutes, path.slug).toBeGreaterThan(0);
    }
  });

  it('points every step at something that exists', () => {
    const known: Record<string, Set<string>> = {
      page: pageRefs,
      problem: problemSlugs,
      workout: workoutSlugs,
      module: moduleSlugs,
    };
    for (const path of paths) {
      for (const step of path.steps) {
        const refs = known[step.kind];
        expect(refs?.has(step.ref), `${path.slug} ${step.kind}: ${step.ref}`).toBe(true);
      }
    }
  });

  it('reads, then proves, then builds', () => {
    const phase = { page: 0, module: 0, problem: 1, workout: 2 } as Record<string, number>;
    for (const path of paths) {
      const order = path.steps.map((step) => phase[step.kind] ?? -1);
      expect(
        [...order].sort((a, b) => a - b),
        path.slug
      ).toEqual(order);
    }
  });

  it('gives every session something to read and something to prove', () => {
    for (const path of paths) {
      expect(
        path.steps.some((step) => step.kind === 'page'),
        path.slug
      ).toBe(true);
      expect(
        path.steps.some((step) => step.kind === 'problem'),
        path.slug
      ).toBe(true);
    }
  });

  it('stays a subset rather than an index', () => {
    // The rule that will get broken first: if every page ends up on some
    // session, the path has stopped being a recommendation. Fails loudly at
    // three quarters so it is a conversation rather than a surprise.
    const cited = new Set(
      paths.flatMap((path) =>
        path.steps.filter((step) => step.kind === 'page').map((step) => step.ref)
      )
    );
    expect(cited.size).toBeLessThan(pageRefs.size * 0.75);
  });
});

describe('the session validator', () => {
  it('accepts a well-formed session', () => {
    expect(() => parsePath(session(), 'ok')).not.toThrow();
  });

  it('refuses a session whose slug does not match its directory', () => {
    expect(() => parsePath(session(), 'elsewhere')).toThrow(/declares slug/);
  });

  it('refuses a session with no question', () => {
    expect(() => parsePath(session({ question: '  ' }), 'ok')).toThrow(/no question/);
  });

  it('refuses a session with no minutes', () => {
    expect(() => parsePath(session({ minutes: 0 }), 'ok')).toThrow(/positive minutes/);
  });

  it('refuses a session with nothing to read', () => {
    const steps = [{ kind: 'problem', ref: 'http-fetch-not-ok' }];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/no page to read/);
  });

  it('refuses a session with nothing to prove', () => {
    const steps = [{ kind: 'page', ref: 'moving-data/request-response' }];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/nothing to prove/);
  });

  it('refuses a rep that comes before the page explaining it', () => {
    const steps = [
      { kind: 'problem', ref: 'http-fetch-not-ok' },
      { kind: 'page', ref: 'moving-data/request-response' },
    ];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/read, prove, then build/);
  });

  it('accepts a module as a read step, now that modules exist', () => {
    const steps = [
      { kind: 'module', ref: 'js-date' },
      { kind: 'page', ref: 'moving-data/request-response' },
      { kind: 'problem', ref: 'http-fetch-not-ok' },
    ];
    expect(() => parsePath(session({ steps }), 'ok')).not.toThrow();
  });

  it('refuses a module step that arrives after the reps it should precede', () => {
    const steps = [
      { kind: 'page', ref: 'moving-data/request-response' },
      { kind: 'problem', ref: 'http-fetch-not-ok' },
      { kind: 'module', ref: 'js-date' },
    ];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/read, prove, then build/);
  });

  it('refuses a kind nobody has heard of', () => {
    const steps = [{ kind: 'video', ref: 'anything' }];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/unknown kind/);
  });

  it('refuses a page ref that is not section/slug', () => {
    const steps = [
      { kind: 'page', ref: 'request-response' },
      { kind: 'problem', ref: 'http-fetch-not-ok' },
    ];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/not section\/slug/);
  });

  it('refuses a problem ref carrying a section', () => {
    const steps = [
      { kind: 'page', ref: 'moving-data/request-response' },
      { kind: 'problem', ref: 'http/http-fetch-not-ok' },
    ];
    expect(() => parsePath(session({ steps }), 'ok')).toThrow(/bare slug/);
  });

  it('refuses a session that is not JSON', () => {
    expect(() => parsePath('{ nope', 'ok')).toThrow(/not valid JSON/);
  });
});
