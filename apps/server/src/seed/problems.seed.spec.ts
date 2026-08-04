import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CATEGORIES, DIFFICULTIES, PROBLEM_TYPES, RELEVANCES, TAGS } from '@hone/shared';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { gradeAnswer, normalizeAnswer, normalizeForMatch, parseGraderConfig } from '../grading';
import type { ExplainGraderConfig, ShortTextGraderConfig } from '../grading/types';
import { buildPracticeDatabase, openPracticeDatabase } from './practice-db';
import { problemSeeds } from './problems.seed';

let dir: string;
let db: SqliteDatabase;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'hone-seed-'));
  const path = join(dir, 'practice.db');
  buildPracticeDatabase(path);
  db = openPracticeDatabase(path);
});

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('seeded problems', () => {
  it('has unique slugs and a contiguous position sequence', () => {
    expect(problemSeeds.length).toBeGreaterThanOrEqual(100);
    expect(new Set(problemSeeds.map((p) => p.slug)).size).toBe(problemSeeds.length);
    expect(problemSeeds.map((p) => p.position)).toEqual(problemSeeds.map((_, index) => index + 1));
  });

  it('orders the queue easy → medium → hard', () => {
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const ranks = problemSeeds.map((p) => rank[p.difficulty]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('covers every category', () => {
    const seen = new Set(problemSeeds.map((p) => p.category));
    for (const category of CATEGORIES) expect(seen).toContain(category);
  });

  it('uses valid enum values and non-empty copy', () => {
    for (const seed of problemSeeds) {
      expect(CATEGORIES, seed.slug).toContain(seed.category);
      expect(DIFFICULTIES, seed.slug).toContain(seed.difficulty);
      expect(RELEVANCES, seed.slug).toContain(seed.relevance);
      expect(PROBLEM_TYPES, seed.slug).toContain(seed.type);
      expect(seed.prompt.trim().length, seed.slug).toBeGreaterThan(0);
      expect(seed.solution.trim().length, seed.slug).toBeGreaterThan(0);
      expect(seed.explanation.trim().length, seed.slug).toBeGreaterThan(0);
      expect(seed.canonicalAnswer.trim().length, seed.slug).toBeGreaterThan(0);
      expect(seed.graderConfig.hints.length, seed.slug).toBeGreaterThan(0);
      for (const tag of seed.tags ?? []) expect(TAGS, seed.slug).toContain(tag);
      expect(new Set(seed.tags ?? []).size, seed.slug).toBe((seed.tags ?? []).length);
    }
  });

  /**
   * A tag is an entrance, so an empty one is a dead link on the dashboard and a
   * scope that resolves to nothing. Delete the tag or tag some reps; there is no
   * third state worth shipping.
   */
  it('leaves no tag without reps behind it', () => {
    for (const tag of TAGS) {
      const tagged = problemSeeds.filter((seed) => seed.tags?.includes(tag));
      expect(tagged.length, `${tag} has no reps`).toBeGreaterThan(0);
      // The whole justification for a tag over a category: it cuts across them.
      expect(new Set(tagged.map((seed) => seed.category)).size, tag).toBeGreaterThan(1);
    }
  });

  it('round-trips every grader config through JSON', () => {
    for (const seed of problemSeeds) {
      const parsed = parseGraderConfig(seed.type, JSON.stringify(seed.graderConfig), seed.slug);
      expect(parsed.hints, seed.slug).toEqual(seed.graderConfig.hints);
    }
  });

  it('compiles every acceptPattern regex', () => {
    for (const seed of problemSeeds) {
      if (seed.type !== 'short-text') continue;
      const config = seed.graderConfig as ShortTextGraderConfig;
      for (const pattern of config.acceptPatterns ?? []) {
        expect(() => new RegExp(pattern, 'i'), `${seed.slug}: ${pattern}`).not.toThrow();
      }
    }
  });

  // A needle that folds to "" can never match, so the group would be dead weight
  // and the problem unsolvable. This bit us with the `??` synonym.
  it('has no keyword synonym that normalizes away to nothing', () => {
    for (const seed of problemSeeds) {
      if (seed.type !== 'explain') continue;
      const config = seed.graderConfig as ExplainGraderConfig;
      for (const group of config.groups) {
        for (const synonym of group.synonyms) {
          expect(normalizeForMatch(synonym).length, `${seed.slug}: "${synonym}"`).toBeGreaterThan(
            0
          );
        }
      }
    }
  });

  it('has no accept or closeSubstring entry that normalizes away to nothing', () => {
    for (const seed of problemSeeds) {
      if (seed.type !== 'short-text') continue;
      const config = seed.graderConfig as ShortTextGraderConfig;
      for (const entry of config.accept) {
        expect(normalizeAnswer(entry).length, `${seed.slug} accept: "${entry}"`).toBeGreaterThan(0);
      }
      for (const entry of Object.keys(config.closeSubstrings ?? {})) {
        expect(normalizeForMatch(entry).length, `${seed.slug} close: "${entry}"`).toBeGreaterThan(
          0
        );
      }
    }
  });

  it('gives every problem a usable grader (accept list, pattern, or groups)', () => {
    for (const seed of problemSeeds) {
      if (seed.type === 'short-text') {
        const config = seed.graderConfig as ShortTextGraderConfig;
        const usable = config.accept.length > 0 || (config.acceptPatterns ?? []).length > 0;
        expect(usable, `${seed.slug} has no way to be answered correctly`).toBe(true);
      }
      if (seed.type === 'explain') {
        const config = seed.graderConfig as ExplainGraderConfig;
        expect(config.groups.length, seed.slug).toBeGreaterThan(0);
      }
    }
  });

  it.each(problemSeeds.map((seed) => [seed.slug, seed] as const))(
    'grades the canonical answer for %s as correct',
    async (_slug, seed) => {
      const config = parseGraderConfig(seed.type, JSON.stringify(seed.graderConfig), seed.slug);
      const result = await gradeAnswer(seed.type, config, seed.canonicalAnswer, db);
      expect(result.verdict, `${seed.slug}: ${result.feedback}`).toBe('correct');
    }
  );

  it('grades an obviously wrong answer as not correct for every problem', async () => {
    for (const seed of problemSeeds) {
      const config = parseGraderConfig(seed.type, JSON.stringify(seed.graderConfig), seed.slug);
      const answer =
        seed.type === 'sql'
          ? 'SELECT country FROM authors'
          : seed.type === 'js-code'
            ? 'const nope = 1;'
            : // A `ts-type` answer has to compile before its checks mean
              // anything, so give it something that does and is still wrong.
              seed.type === 'ts-type'
              ? 'type Nope = number;'
              : 'purple monkey dishwasher';
      const result = await gradeAnswer(seed.type, config, answer, db);
      expect(result.verdict, seed.slug).not.toBe('correct');
    }
  });

  it('grades every configured nearMiss as close, not correct', async () => {
    for (const seed of problemSeeds) {
      if (seed.type !== 'short-text') continue;
      const config = parseGraderConfig(
        seed.type,
        JSON.stringify(seed.graderConfig),
        seed.slug
      ) as ShortTextGraderConfig;
      for (const miss of Object.keys(config.nearMisses ?? {})) {
        const { verdict } = await gradeAnswer(seed.type, config, miss, db);
        expect(verdict, `${seed.slug} nearMiss "${miss}"`).toBe('close');
      }
    }
  });

  it('does not let an explain answer pass on a single keyword', async () => {
    for (const seed of problemSeeds) {
      if (seed.type !== 'explain') continue;
      const config = parseGraderConfig(
        seed.type,
        JSON.stringify(seed.graderConfig),
        seed.slug
      ) as ExplainGraderConfig;
      if (config.groups.length < 2) continue;
      const onlyFirst = config.groups[0]?.synonyms[0] ?? '';
      const { verdict } = await gradeAnswer(seed.type, config, onlyFirst, db);
      expect(verdict, seed.slug).not.toBe('correct');
    }
  });
});
