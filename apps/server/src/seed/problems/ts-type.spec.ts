import { describe, expect, it } from 'vitest';

import { gradeTypes } from '../../grading/type-grader';
import type { TypeGraderConfig } from '../../grading/types';
import { problemSeeds } from '../problems.seed';

const typeProblems = problemSeeds.filter((seed) => seed.type === 'ts-type');

describe('type problems', () => {
  it('ships some', () => {
    expect(typeProblems.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every one a starter and at least three checks', () => {
    for (const seed of typeProblems) {
      const config = seed.graderConfig as TypeGraderConfig;
      expect(config.starter?.trim().length, seed.slug).toBeGreaterThan(0);
      expect(config.tests.length, seed.slug).toBeGreaterThanOrEqual(3);
      for (const test of config.tests) {
        expect(test.name.trim().length, `${seed.slug}: unnamed check`).toBeGreaterThan(0);
      }
    }
  });

  it.each(typeProblems.map((seed) => [seed.slug, seed] as const))(
    'the reference answer for %s passes its own checks',
    (_slug, seed) => {
      const result = gradeTypes(seed.canonicalAnswer, seed.graderConfig as TypeGraderConfig);
      const failures = (result.tests ?? [])
        .filter((test) => !test.passed)
        .map((test) => `${test.name}: ${test.detail}`)
        .join('; ');
      expect(result.verdict, `${seed.slug} — ${result.feedback} ${failures}`).toBe('correct');
    }
  );

  it.each(typeProblems.map((seed) => [seed.slug, seed] as const))(
    'the starter for %s does not already pass',
    (_slug, seed) => {
      const config = seed.graderConfig as TypeGraderConfig;
      const result = gradeTypes(config.starter ?? '', config);
      expect(result.verdict, `${seed.slug} starter should not be a solution`).not.toBe('correct');
    }
  );
});
