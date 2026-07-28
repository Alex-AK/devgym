import type { CodeTestResult, ProblemType, Verdict } from '@devgym/shared';

import type { CodeTestSpec } from './code-runner';

export interface GradeResult {
  verdict: Verdict;
  feedback: string;
  /** Per-test results, for `js-code` problems only. */
  tests?: CodeTestResult[];
}

export interface CodeGraderConfig {
  /** Runs before the user's code: fixtures, helpers, imports-free stubs. */
  setup?: string;
  tests: CodeTestSpec[];
  /** Prefilled into the editor so the user starts from a signature. */
  starter?: string;
  hints: string[];
}

export interface SqlGraderConfig {
  solutionSql: string;
  orderMatters: boolean;
  hints: string[];
}

export interface ShortTextGraderConfig {
  accept: string[];
  acceptPatterns?: string[];
  /** Normalized answer → tailored `close` feedback. */
  nearMisses?: Record<string, string>;
  /** Substring of the normalized answer → tailored `close` feedback. */
  closeSubstrings?: Record<string, string>;
  hints: string[];
}

export interface ExplainKeywordGroup {
  synonyms: string[];
  missingFeedback: string;
}

export interface ExplainGraderConfig {
  groups: ExplainKeywordGroup[];
  hints: string[];
}

export type GraderConfigFor<T extends ProblemType> = T extends 'sql'
  ? SqlGraderConfig
  : T extends 'short-text'
    ? ShortTextGraderConfig
    : T extends 'js-code'
      ? CodeGraderConfig
      : ExplainGraderConfig;

export type AnyGraderConfig =
  SqlGraderConfig | ShortTextGraderConfig | ExplainGraderConfig | CodeGraderConfig;
