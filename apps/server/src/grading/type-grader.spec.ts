import { describe, expect, it } from 'vitest';

import { gradeTypes } from './type-grader';
import type { TypeGraderConfig } from './types';

const config: TypeGraderConfig = {
  setup: 'interface Frozen {\n  readonly id: string;\n  readonly tags: string[];\n}',
  starter: 'type Mutable<T> = T;',
  tests: [
    {
      name: 'drops readonly from every property',
      type: 'Mutable<Frozen>',
      equals: '{ id: string; tags: string[] }',
    },
    {
      name: 'leaves an optional property optional',
      type: 'Mutable<{ readonly a?: number }>',
      equals: '{ a?: number }',
    },
    {
      name: 'the result can actually be assigned to',
      compiles: "const draft: Mutable<Frozen> = { id: 'a', tags: [] };\ndraft.id = 'b';",
    },
  ],
  hints: [],
};

const REFERENCE = 'type Mutable<T> = {\n  -readonly [K in keyof T]: T[K];\n};';

describe('gradeTypes', () => {
  it('is correct when every check passes', () => {
    const result = gradeTypes(REFERENCE, config);
    expect(result.verdict).toBe('correct');
    expect(result.feedback).toBe('All 3 checks passed.');
    expect(result.tests?.every((test) => test.passed)).toBe(true);
  });

  it('accepts a fenced code block', () => {
    expect(gradeTypes('```ts\n' + REFERENCE + '\n```', config).verdict).toBe('correct');
  });

  it('rejects an empty submission', () => {
    expect(gradeTypes('   ', config).verdict).toBe('incorrect');
  });

  /**
   * The two ways to write a type that looks right. Both are assignable in
   * either direction against the answer and neither is the answer, and both
   * have to read as amber rather than as a red banner.
   */
  it('calls a dropped modifier a near miss, and grades it close', () => {
    const result = gradeTypes('type Mutable<T> = { [K in keyof T]: T[K] };', config);
    expect(result.verdict).toBe('close');
    expect(result.tests?.[0]).toMatchObject({ passed: false, near: true });
    expect(result.tests?.[0]?.detail).toContain('assignable in both directions');
    expect(result.tests?.[2]?.near).toBeUndefined();
  });

  it('calls a widening to any a near miss too', () => {
    const result = gradeTypes('type Mutable<T> = any;', config);
    expect(result.verdict).toBe('close');
    expect(result.tests?.[0]).toMatchObject({ passed: false, near: true });
    expect(result.tests?.[0]?.detail).toContain('got `any`');
  });

  it('is incorrect when the type is not close to the one asked for', () => {
    const result = gradeTypes('type Mutable<T> = string;', config);
    expect(result.verdict).toBe('incorrect');
    expect(result.tests?.some((test) => test.near)).toBe(false);
  });

  it('reports a submission that does not compile, and runs no checks', () => {
    const result = gradeTypes('type Mutable<T> = {', config);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('did not type-check');
    expect(result.feedback).toContain('Line 1');
    expect(result.tests).toEqual([]);
  });

  it('names the missing declaration when the answer uses a different name', () => {
    const result = gradeTypes('type Mutible<T> = { -readonly [K in keyof T]: T[K] };', config);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('the name in the starter');
  });

  it('turns an unresolvable import into a sentence rather than a TS code', () => {
    const result = gradeTypes("import { x } from 'node:fs';\ntype Mutable<T> = T;", config);
    expect(result.feedback).toContain('Imports are not available here');
  });

  it('fails a rejects check when the checker accepted the snippet', () => {
    const rejects: TypeGraderConfig = {
      tests: [{ name: 'refuses a number', rejects: 'const bad: Answer = 1;' }],
      hints: [],
    };
    expect(gradeTypes('type Answer = string;', rejects).verdict).toBe('correct');
    const loose = gradeTypes('type Answer = unknown;', rejects);
    expect(loose.verdict).toBe('incorrect');
    expect(loose.tests?.[0]?.detail).toContain('should have refused it');
  });

  it('holds a rejects check to the error code it declared', () => {
    const rejects: TypeGraderConfig = {
      tests: [
        { name: 'refuses a number', rejects: 'const bad: Answer = 1;', errorCode: 2322 },
        { name: 'refuses an extra argument', rejects: 'const bad: Answer = 1;', errorCode: 2554 },
      ],
      hints: [],
    };
    const result = gradeTypes('type Answer = string;', rejects);
    expect(result.tests?.[0]?.passed).toBe(true);
    expect(result.tests?.[1]?.passed).toBe(false);
    expect(result.tests?.[1]?.detail).toContain('expected TS2554');
  });

  /**
   * The measurement behind reusing the parsed lib files across compilations.
   * The first grade in a process pays for parsing 57 of them; every one after
   * it is a few milliseconds, which is what keeps a rep a rep.
   */
  it('grades fast enough to stay a rep', () => {
    gradeTypes(REFERENCE, config);
    const started = performance.now();
    for (let index = 0; index < 10; index += 1) gradeTypes(REFERENCE, config);
    expect((performance.now() - started) / 10).toBeLessThan(150);
  });
});
