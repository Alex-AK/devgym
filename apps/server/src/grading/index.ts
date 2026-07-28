import type { ProblemType } from '@devgym/shared';
import type { Database as SqliteDatabase } from 'better-sqlite3';

import { gradeCode } from './code-grader';
import { gradeExplain } from './keyword-grader';
import { gradeSql } from './sql-grader';
import { gradeShortText } from './text-grader';
import type {
  AnyGraderConfig,
  CodeGraderConfig,
  ExplainGraderConfig,
  GradeResult,
  ShortTextGraderConfig,
  SqlGraderConfig,
} from './types';

export { gradeCode } from './code-grader';
export { runCode, deepEqual, display, CODE_TIMEOUT_MS } from './code-runner';
export type { CodeTestSpec, CodeTestOutcome } from './code-runner';
export { gradeExplain } from './keyword-grader';
export { levenshtein, similarity } from './levenshtein';
export {
  normalizeAnswer,
  normalizeForMatch,
  stripCodeFence,
  stripWrappingQuotes,
} from './normalize';
export { gradeSql, ROW_CAP } from './sql-grader';
export { gradeShortText } from './text-grader';
export * from './types';

export class GraderConfigError extends Error {}

function asRecord(value: unknown, slug: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraderConfigError(`grader_config for "${slug}" is not an object`);
  }
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown, field: string, slug: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new GraderConfigError(`grader_config.${field} for "${slug}" must be a string[]`);
  }
  return value as string[];
}

/** Parse and shape-check the JSON stored in `problems.grader_config`. */
export function parseGraderConfig(
  type: ProblemType,
  rawJson: string,
  slug = 'unknown'
): AnyGraderConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new GraderConfigError(
      `grader_config for "${slug}" is not valid JSON: ${(error as Error).message}`
    );
  }
  const record = asRecord(parsed, slug);
  const hints = asStringArray(record.hints ?? [], 'hints', slug);

  if (type === 'sql') {
    if (typeof record.solutionSql !== 'string') {
      throw new GraderConfigError(`grader_config.solutionSql for "${slug}" must be a string`);
    }
    return {
      solutionSql: record.solutionSql,
      orderMatters: record.orderMatters === true,
      hints,
    } satisfies SqlGraderConfig;
  }

  if (type === 'short-text') {
    return {
      accept: asStringArray(record.accept ?? [], 'accept', slug),
      acceptPatterns: record.acceptPatterns
        ? asStringArray(record.acceptPatterns, 'acceptPatterns', slug)
        : undefined,
      nearMisses: (record.nearMisses as Record<string, string> | undefined) ?? undefined,
      closeSubstrings: (record.closeSubstrings as Record<string, string> | undefined) ?? undefined,
      hints,
    } satisfies ShortTextGraderConfig;
  }

  if (type === 'js-code') {
    if (!Array.isArray(record.tests) || record.tests.length === 0) {
      throw new GraderConfigError(`grader_config.tests for "${slug}" must be a non-empty array`);
    }
    return {
      setup: typeof record.setup === 'string' ? record.setup : undefined,
      starter: typeof record.starter === 'string' ? record.starter : undefined,
      tests: record.tests as CodeGraderConfig['tests'],
      hints,
    } satisfies CodeGraderConfig;
  }

  const groups = record.groups;
  if (!Array.isArray(groups)) {
    throw new GraderConfigError(`grader_config.groups for "${slug}" must be an array`);
  }
  return {
    groups: groups.map((group, index) => {
      const entry = asRecord(group, `${slug}.groups[${index}]`);
      return {
        synonyms: asStringArray(entry.synonyms ?? [], `groups[${index}].synonyms`, slug),
        missingFeedback:
          typeof entry.missingFeedback === 'string'
            ? entry.missingFeedback
            : 'Something is missing.',
      };
    }),
    hints,
  } satisfies ExplainGraderConfig;
}

export function getHints(config: AnyGraderConfig): string[] {
  return config.hints;
}

/**
 * Grade an answer against its problem's config. `practiceDb` is required for
 * `sql` problems and must be a read-only handle on practice.db.
 */
export async function gradeAnswer(
  type: ProblemType,
  config: AnyGraderConfig,
  answer: string,
  practiceDb?: SqliteDatabase
): Promise<GradeResult> {
  if (type === 'sql') {
    if (!practiceDb) {
      throw new Error('gradeAnswer: sql problems require a practice database handle');
    }
    return gradeSql(answer, config as SqlGraderConfig, practiceDb);
  }
  if (type === 'short-text') {
    return gradeShortText(answer, config as ShortTextGraderConfig);
  }
  if (type === 'js-code') {
    return gradeCode(answer, config as CodeGraderConfig);
  }
  return gradeExplain(answer, config as ExplainGraderConfig);
}
