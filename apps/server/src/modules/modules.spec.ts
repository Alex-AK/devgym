import { describe, expect, it } from 'vitest';

import { runCode } from '../grading';
import { problemSeeds } from '../seed/problems.seed';
import { listManifests } from '../workouts/workout-content';
import { listModules, parseStep } from './modules-content';

/**
 * The safety net, and the reason a module can be written quickly. Every step's
 * assertions run against that step's own snippet, so a module that teaches
 * something untrue fails the build rather than the reader.
 */

const modules = listModules();

const practisable = new Set([
  ...problemSeeds.map((problem) => problem.slug),
  ...listManifests().map((workout) => workout.slug),
]);

/** A step with everything the parser wants, so a test can take one thing away. */
function step(overrides: { frontmatter?: string; body?: string } = {}): string {
  const frontmatter =
    overrides.frontmatter ?? ['title: A step', 'predict: What comes back?'].join('\n');
  const body =
    overrides.body ??
    [
      'Prose.',
      '',
      '```js run',
      'const answer = 42;',
      '```',
      '',
      '```js assert',
      'answer === 42',
      '```',
    ].join('\n');
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe('modules', () => {
  it('has at least one', () => {
    expect(modules.length).toBeGreaterThan(0);
  });

  it('orders modules without ties', () => {
    const orders = modules.map((entry) => entry.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('gives every module a summary, a budget and a citation', () => {
    for (const entry of modules) {
      expect(entry.summary.trim(), entry.slug).not.toBe('');
      expect(entry.minutes, entry.slug).toBeGreaterThan(0);
      expect(entry.sources.length, entry.slug).toBeGreaterThan(0);
      expect(entry.verified, entry.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('points every practise slug at a real problem or workout', () => {
    for (const entry of modules) {
      for (const slug of entry.practise) {
        expect(practisable.has(slug), `${entry.slug} practise: ${slug}`).toBe(true);
      }
    }
  });

  it('gives every step a title, a predict question and distinct id', () => {
    for (const entry of modules) {
      const ids = new Set<string>();
      for (const one of entry.steps) {
        expect(one.title.trim(), `${entry.slug}/${one.id}`).not.toBe('');
        expect(one.predict.trim(), `${entry.slug}/${one.id}`).not.toBe('');
        expect(one.code.trim(), `${entry.slug}/${one.id}`).not.toBe('');
        expect(ids.has(one.id), `${entry.slug} repeats step id ${one.id}`).toBe(false);
        ids.add(one.id);
      }
    }
  });

  it('leaves no fence behind in the prose', () => {
    for (const entry of modules) {
      for (const one of entry.steps) {
        expect(one.body.includes('```js run'), `${entry.slug}/${one.id}`).toBe(false);
        expect(one.body.includes('```js assert'), `${entry.slug}/${one.id}`).toBe(false);
      }
    }
  });
});

/**
 * The proof. Everything above checks shape; this runs the content. A module is
 * only worth having if the thing it demonstrates actually happens.
 */
describe.each(modules.map((entry) => [entry.slug, entry] as const))('%s', (_slug, entry) => {
  it.each(entry.steps.map((one) => [one.id, one] as const))(
    'every assertion in %s holds against its own snippet',
    async (_id, one) => {
      const result = await runCode(
        one.code,
        one.assertions.map((expression) => ({ name: expression, expression, expected: true }))
      );

      expect(result.error, `${entry.slug}/${one.id} could not run: ${result.error ?? ''}`).toBe(
        undefined
      );
      const failed = result.outcomes
        .filter((outcome) => !outcome.passed)
        .map((outcome) => `${outcome.name} — ${outcome.detail ?? 'false'}`)
        .join('\n');
      expect(failed, `${entry.slug}/${one.id}`).toBe('');
    }
  );
});

describe('the step parser', () => {
  it('accepts a well-formed step', () => {
    expect(() => parseStep(step(), 'test', '01-ok.md')).not.toThrow();
  });

  it('refuses a step with no predict question', () => {
    expect(() => parseStep(step({ frontmatter: 'title: A step' }), 'test', '01-bad.md')).toThrow(
      /predict/
    );
  });

  it('refuses a step with no run fence', () => {
    const body = ['Prose.', '', '```js assert', 'true', '```'].join('\n');
    expect(() => parseStep(step({ body }), 'test', '01-bad.md')).toThrow(/js run/);
  });

  it('refuses a step with no assert fence', () => {
    const body = ['Prose.', '', '```js run', 'const a = 1;', '```'].join('\n');
    expect(() => parseStep(step({ body }), 'test', '01-bad.md')).toThrow(/js assert/);
  });

  it('reads one assertion per line', () => {
    const body = [
      'Prose.',
      '',
      '```js run',
      'const a = 1;',
      '```',
      '',
      '```js assert',
      'a === 1',
      '',
      'a < 2',
      '```',
    ].join('\n');
    expect(parseStep(step({ body }), 'test', '01-ok.md').assertions).toEqual(['a === 1', 'a < 2']);
  });

  it('drops the ordering prefix from the id', () => {
    expect(parseStep(step(), 'test', '07-two-string-formats.md').id).toBe('two-string-formats');
  });
});
