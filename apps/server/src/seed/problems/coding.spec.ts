import { describe, expect, it } from 'vitest';

import { gradeCode } from '../../grading/code-grader';
import type { CodeGraderConfig } from '../../grading/types';
import { problemSeeds } from '../problems.seed';

const codeProblems = problemSeeds.filter((seed) => seed.type === 'js-code');

describe('code problems', () => {
  it('ships a decent number of them', () => {
    expect(codeProblems.length).toBeGreaterThanOrEqual(12);
  });

  it('gives every one a starter and at least three tests', () => {
    for (const seed of codeProblems) {
      const config = seed.graderConfig as CodeGraderConfig;
      expect(config.starter?.trim().length, seed.slug).toBeGreaterThan(0);
      expect(config.tests.length, seed.slug).toBeGreaterThanOrEqual(3);
      for (const test of config.tests) {
        expect(test.name.trim().length, `${seed.slug}: unnamed test`).toBeGreaterThan(0);
      }
    }
  });

  it.each(codeProblems.map((seed) => [seed.slug, seed] as const))(
    'the reference implementation for %s passes its own tests',
    async (_slug, seed) => {
      const result = await gradeCode(seed.canonicalAnswer, seed.graderConfig as CodeGraderConfig);
      const failures = (result.tests ?? [])
        .filter((test) => !test.passed)
        .map((test) => `${test.name}: ${test.detail}`)
        .join('; ');
      expect(result.verdict, `${seed.slug} — ${result.feedback} ${failures}`).toBe('correct');
    }
  );

  it.each(codeProblems.map((seed) => [seed.slug, seed] as const))(
    'the starter for %s does not already pass',
    async (_slug, seed) => {
      const config = seed.graderConfig as CodeGraderConfig;
      const result = await gradeCode(config.starter ?? '', config);
      expect(result.verdict, `${seed.slug} starter should not be a solution`).not.toBe('correct');
    }
  );
});
