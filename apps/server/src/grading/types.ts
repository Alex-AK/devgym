import type { CodeTestResult, ProblemType, Verdict } from '@hone/shared';

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

/**
 * One question put to the type checker. Exactly one of three forms:
 *
 * - `type` + `equals` — what the submission's type for `type` must be, compared
 *   for identity rather than assignability.
 * - `compiles` — statements that must be accepted, which is the only way to
 *   observe narrowing, since a narrowed type has no name to assert on.
 * - `rejects` — statements the checker must refuse, which is what keeps a type
 *   that widened to `any` from passing everything.
 */
export interface TypeTestSpec {
  /** Shown to the user, so phrase it as the fact being checked. */
  name: string;
  /** A type expression. `typeof value` when the answer is a value. */
  type?: string;
  /** What `type` must be, identically. */
  equals?: string;
  /** Statements compiled inside a function body, after the submission. */
  compiles?: string;
  /** Statements that must not compile. */
  rejects?: string;
  /** With `rejects`, the TypeScript error code it must fail with. */
  errorCode?: number;
}

export interface TypeGraderConfig {
  /** Declarations in scope before the submission. Shown read-only above the editor. */
  setup?: string;
  /** Prefilled into the editor so the name the checks use is the name on screen. */
  starter?: string;
  tests: TypeTestSpec[];
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
      : T extends 'ts-type'
        ? TypeGraderConfig
        : ExplainGraderConfig;

export type AnyGraderConfig =
  | SqlGraderConfig
  | ShortTextGraderConfig
  | ExplainGraderConfig
  | CodeGraderConfig
  | TypeGraderConfig;
