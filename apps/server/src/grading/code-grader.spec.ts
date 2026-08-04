import { describe, expect, it } from 'vitest';

import { gradeCode } from './code-grader';
import { CODE_TIMEOUT_MS, deepEqual, display, runCode } from './code-runner';
import type { CodeGraderConfig } from './types';

const config: CodeGraderConfig = {
  tests: [
    { name: 'sums a list', expression: 'total([1, 2, 3])', expected: 6 },
    { name: 'handles an empty list', expression: 'total([])', expected: 0 },
  ],
  hints: [],
};

describe('deepEqual', () => {
  it('compares primitives, including NaN', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
  });

  it('compares arrays and nested objects structurally', () => {
    expect(deepEqual([1, [2, { a: 3 }]], [1, [2, { a: 3 }]])).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });

  it('compares Maps, Sets and Dates', () => {
    expect(deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    expect(deepEqual(new Date(5), new Date(5))).toBe(true);
  });
});

describe('display', () => {
  it('renders values a developer can read', () => {
    expect(display(undefined)).toBe('undefined');
    expect(display([1, 'a'])).toBe('[1,"a"]');
    expect(display(new Set([1]))).toBe('Set(1) [1]');
  });
});

describe('runCode', () => {
  it('reports each assertion separately', async () => {
    const result = await runCode('function total(xs) { return xs.length; }', config.tests);
    expect(result.outcomes.map((o) => o.passed)).toEqual([false, true]);
    expect(result.outcomes[0]?.detail).toContain('expected 6, got 3');
  });

  it('captures console output and attaches it to a failure', async () => {
    const result = await runCode(
      'function total(xs) { console.log("called with", xs.length); return 0; }',
      [config.tests[0] as never]
    );
    expect(result.logs[0]).toBe('called with 3');
    expect(result.outcomes[0]?.detail).toContain('logged: called with 3');
  });

  it('surfaces a syntax error instead of crashing', async () => {
    const result = await runCode('function total( {', config.tests);
    expect(result.error).toMatch(/SyntaxError/);
    expect(result.outcomes).toEqual([]);
  });

  it('reports a throw inside one test without failing the rest', async () => {
    const result = await runCode(
      'function total(xs) { if (xs.length === 0) throw new Error("boom"); return 6; }',
      config.tests
    );
    expect(result.outcomes[0]?.passed).toBe(true);
    expect(result.outcomes[1]?.detail).toContain('threw Error: boom');
  });

  it('supports async solutions and awaited expressions', async () => {
    const result = await runCode('const wait = async (x) => x * 2;', [
      { name: 'awaits', expression: 'await wait(21)', expected: 42 },
    ]);
    expect(result.outcomes[0]?.passed).toBe(true);
  });

  it('matches an expected throw', async () => {
    const result = await runCode('function boom() { throw new RangeError("too big"); }', [
      { name: 'throws for a bad input', expression: 'boom()', throws: 'too big' },
    ]);
    expect(result.outcomes[0]?.passed).toBe(true);
  });

  it('fails a throws-test when nothing is thrown', async () => {
    const result = await runCode('function boom() { return 1; }', [
      { name: 'throws', expression: 'boom()', throws: 'nope' },
    ]);
    expect(result.outcomes[0]?.passed).toBe(false);
    expect(result.outcomes[0]?.detail).toContain('but it returned 1');
  });

  it('uses expectedCode for values JSON cannot express', async () => {
    const result = await runCode('const get = () => undefined;', [
      { name: 'returns undefined', expression: 'get()', expectedCode: 'undefined' },
    ]);
    expect(result.outcomes[0]?.passed).toBe(true);
  });

  it('stops an infinite loop rather than hanging', async () => {
    const result = await runCode('while (true) {}', config.tests);
    expect(result.error).toBeDefined();
  }, 10_000);

  /**
   * The two budgets are separate for this: a rep about timers spends wall-clock
   * time it asked for, and that is not the thing the script timeout is guarding.
   */
  it('lets an awaited test sleep past the budget a script gets', async () => {
    const result = await runCode('const wait = (ms) => new Promise((r) => setTimeout(r, ms));', [
      {
        name: 'sleeps longer than a script may run for',
        expression: `wait(${CODE_TIMEOUT_MS + 200}).then(() => 'slept')`,
        expected: 'slept',
      },
    ]);
    expect(result.outcomes[0]?.detail).toBeUndefined();
    expect(result.outcomes[0]?.passed).toBe(true);
  }, 20_000);

  it('still stops an await that never settles', async () => {
    const result = await runCode('const stuck = new Promise(() => {});', [
      { name: 'never settles', expression: 'stuck', expected: 1 },
    ]);
    expect(result.outcomes[0]?.detail).toContain('Timed out');
  }, 20_000);

  it('does not expose require, process or the filesystem', async () => {
    const result = await runCode('const probe = () => [typeof require, typeof process];', [
      {
        name: 'host globals are absent',
        expression: 'probe()',
        expected: ['undefined', 'undefined'],
      },
    ]);
    expect(result.outcomes[0]?.passed).toBe(true);
  });

  it('runs setup code before the submission', async () => {
    const result = await runCode(
      'const doubled = fixture.map((n) => n * 2);',
      [{ name: 'sees the fixture', expression: 'doubled', expected: [2, 4] }],
      'const fixture = [1, 2];'
    );
    expect(result.outcomes[0]?.passed).toBe(true);
  });
});

describe('gradeCode', () => {
  it('is correct when every test passes', async () => {
    const result = await gradeCode(
      'function total(xs) { return xs.reduce((a, b) => a + b, 0); }',
      config
    );
    expect(result.verdict).toBe('correct');
    expect(result.feedback).toBe('All 2 tests passed.');
    expect(result.tests?.every((t) => t.passed)).toBe(true);
  });

  it('is close when at least half pass, and names the first failure', async () => {
    const result = await gradeCode('function total() { return 6; }', config);
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('1 of 2 tests passed');
    expect(result.feedback).toContain('handles an empty list');
  });

  it('is incorrect when most tests fail', async () => {
    const result = await gradeCode('function total() { return 99; }', config);
    expect(result.verdict).toBe('incorrect');
  });

  it('accepts a fenced code block', async () => {
    const result = await gradeCode(
      '```js\nfunction total(xs) { return xs.reduce((a, b) => a + b, 0); }\n```',
      config
    );
    expect(result.verdict).toBe('correct');
  });

  it('rejects an empty submission', async () => {
    expect((await gradeCode('   ', config)).verdict).toBe('incorrect');
  });
});
