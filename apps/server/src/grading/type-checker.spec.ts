import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkTypes } from './type-checker';

const EQUALS = { kind: 'identity' as const, type: 'Answer', equals: 'string' };

describe('checkTypes', () => {
  it('reads the type the submission produced', () => {
    const result = checkTypes('type Answer = string;', '', [EQUALS]);
    expect(result.error).toBeUndefined();
    expect(result.probes[0]?.reading).toMatchObject({ identical: true, actual: 'string' });
  });

  it('separates identity from assignability in both directions', () => {
    const result = checkTypes('type Answer = any;', '', [EQUALS]);
    expect(result.probes[0]?.reading).toMatchObject({
      identical: false,
      assignableTo: true,
      assignableFrom: true,
      actual: 'any',
    });
  });

  it('treats a dropped readonly as assignable both ways but not identical', () => {
    const result = checkTypes('type Answer = { readonly a: string };', '', [
      { kind: 'identity', type: 'Answer', equals: '{ a: string }' },
    ]);
    expect(result.probes[0]?.reading).toMatchObject({
      identical: false,
      assignableTo: true,
      assignableFrom: true,
    });
  });

  it('puts setup in scope without shifting the submission line numbers', () => {
    const result = checkTypes('type Answer = Given;', 'type Given = number;', [
      { kind: 'identity', type: 'Answer', equals: 'number' },
    ]);
    expect(result.probes[0]?.reading?.identical).toBe(true);

    const broken = checkTypes('type Ok = Given;\ntype Bad = Missing;', 'type Given = number;', []);
    expect(broken.error?.line).toBe(2);
  });

  it('reports a syntax error against the submission, not a probe', () => {
    const result = checkTypes('type Answer = {', '', [EQUALS]);
    expect(result.error?.line).toBe(1);
    expect(result.probes).toEqual([]);
  });

  it('scopes a statement probe to its own body, so narrowing works', () => {
    const submission = [
      'function assertString(value: unknown): asserts value is string {',
      "  if (typeof value !== 'string') throw new Error('no');",
      '}',
    ].join('\n');
    const result = checkTypes(submission, 'declare const raw: unknown;', [
      { kind: 'statements', code: 'const v = raw;\nassertString(v);\nconst s: string = v;' },
      { kind: 'statements', code: 'const v = raw;\nconst s: string = v;' },
    ]);
    expect(result.probes[0]?.diagnostics).toEqual([]);
    expect(result.probes[1]?.diagnostics[0]?.code).toBe(2322);
  });

  /* ------------------------------------------------------- the safety boundary */

  it('resolves no import, so the answer cannot reach a module', () => {
    const result = checkTypes("import { readFileSync } from 'node:fs';\ntype A = 1;", '', []);
    expect([2307, 2792]).toContain(result.error?.code);
  });

  it('resolves no relative import either', () => {
    const result = checkTypes("import x from './types';\ntype A = typeof x;", '', []);
    expect([2307, 2792]).toContain(result.error?.code);
  });

  it('cannot read a file that really exists through a reference directive', () => {
    const real = join(__dirname, 'types.ts');
    expect(readFileSync(real, 'utf8').length).toBeGreaterThan(0);
    const result = checkTypes(`/// <reference path="${real}" />\ntype A = 1;`, '', []);
    // TS6053 is "File not found", about a file this test just read. The host
    // never went to disk for it, which is the whole point.
    expect(result.error?.code).toBe(6053);
    expect(result.error?.message).toContain('not found');
  });

  it('offers the ES library and nothing else: no DOM, no Node', () => {
    expect(checkTypes('type A = Awaited<Promise<string>>;', '', []).error).toBeUndefined();
    expect(checkTypes("type A = Capitalize<'x'>;", '', []).error).toBeUndefined();
    expect(checkTypes('type A = typeof document;', '', []).error?.code).toBe(2584);
    expect(checkTypes('type A = typeof process;', '', []).error?.code).toBe(2591);
  });

  it('bounds a runaway type itself rather than hanging', () => {
    const letters =
      "'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'|'n'|'o'|'p'|'q'|'r'|'s'|'t'";
    const submission = [
      `type L = ${letters};`,
      'type Two = `${L}${L}`;',
      'type Three = `${Two}${L}`;',
      'type Four = `${Three}${L}`;',
      'type A = Four;',
    ].join('\n');
    const started = Date.now();
    const result = checkTypes(submission, '', []);
    // TS2590: the union got too big. The compiler's own limits are the guard.
    expect(result.error?.code).toBe(2590);
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 10_000);

  /* --------------------------------------------------------------- strictness */

  it('checks against the same strictness flags as the repo', () => {
    const base = JSON.parse(
      readFileSync(join(__dirname, '../../../../tsconfig.base.json'), 'utf8')
    ) as { compilerOptions: Record<string, unknown> };

    // Every strictness flag in the shared config has to hold here too, or the
    // grader teaches a different language from the one the repo compiles.
    expect(base.compilerOptions.strict).toBe(true);
    expect(checkTypes('function f(x): string { return x; }', '', []).error?.code).toBe(7006);
    expect(base.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(
      checkTypes('declare const xs: string[];\nconst first: string = xs[0];', '', []).error?.code
    ).toBe(2322);
    expect(base.compilerOptions.noImplicitReturns).toBe(true);
    expect(
      checkTypes('function f(flag: boolean): number {\n  if (flag) return 1;\n}', '', []).error
        ?.code
    ).toBe(2366);

    // And the two that are deliberately off, because a probe declares values it
    // only needs the type of.
    expect(base.compilerOptions.noUnusedLocals).toBe(true);
    expect(
      checkTypes('function f(): void {\n  const unused = 1;\n}', '', []).error
    ).toBeUndefined();
  });
});
