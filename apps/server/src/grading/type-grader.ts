import type { CodeTestResult } from '@hone/shared';

import { stripCodeFence } from './normalize';
import { type CheckedProbe, checkTypes, type Probe, type TypeDiagnostic } from './type-checker';
import type { GradeResult, TypeGraderConfig, TypeTestSpec } from './types';

/**
 * Fraction of the tests that must land before an answer counts as "close". A
 * near miss counts here and never toward `correct`: a type that is assignable
 * both ways but is not the type asked for is the answer that looks right and
 * has lost the point.
 */
const CLOSE_THRESHOLD = 0.5;

export function gradeTypes(rawAnswer: string, config: TypeGraderConfig): GradeResult {
  const answer = stripCodeFence(rawAnswer).trim();
  if (answer.length === 0) {
    return { verdict: 'incorrect', feedback: 'Write some code before submitting.' };
  }

  const result = checkTypes(answer, config.setup ?? '', config.tests.map(toProbe));

  if (result.error) {
    return {
      verdict: 'incorrect',
      feedback: `Your answer did not type-check. Line ${result.error.line}: ${explain(result.error)}`,
      tests: [],
    };
  }

  const outcomes = config.tests.map((test, index) =>
    judge(test, result.probes[index] ?? { diagnostics: [] })
  );
  const passed = outcomes.filter((outcome) => outcome.passed).length;
  const near = outcomes.filter((outcome) => outcome.near).length;
  const total = outcomes.length;

  if (total > 0 && passed === total) {
    return { verdict: 'correct', feedback: `All ${total} checks passed.`, tests: outcomes };
  }

  const score = (passed + near) / Math.max(1, total);
  return {
    verdict: score >= CLOSE_THRESHOLD ? 'close' : 'incorrect',
    feedback: `${passed} of ${total} checks passed. ${firstFailure(outcomes)}`,
    tests: outcomes,
  };
}

function toProbe(test: TypeTestSpec): Probe {
  if (test.equals !== undefined && test.type !== undefined) {
    return { kind: 'identity', type: test.type, equals: test.equals };
  }
  return { kind: 'statements', code: test.compiles ?? test.rejects ?? '' };
}

function judge(test: TypeTestSpec, probe: CheckedProbe): CodeTestResult {
  if (test.rejects !== undefined) return judgeRejects(test, probe);
  if (test.compiles !== undefined) return judgeCompiles(test, probe);
  return judgeIdentity(test, probe);
}

/** The snippet has to be accepted. Any diagnostic inside it is the failure. */
function judgeCompiles(test: TypeTestSpec, probe: CheckedProbe): CodeTestResult {
  const [first] = probe.diagnostics;
  if (!first) return { name: test.name, passed: true };
  return { name: test.name, passed: false, detail: explain(first) };
}

/** TS2304 cannot find name, TS2552 cannot find name, did you mean. */
const MISSING_NAME = new Set([2304, 2552]);

/**
 * The snippet has to be rejected, which is how a rep proves a type is actually
 * load-bearing. An answer that widens to `any` compiles everything, so without
 * this the wrong answer passes.
 */
function judgeRejects(test: TypeTestSpec, probe: CheckedProbe): CodeTestResult {
  if (probe.diagnostics.length === 0) {
    return {
      name: test.name,
      passed: false,
      detail: 'the checker accepted this, and it should have refused it',
    };
  }
  // A rejection has to be the one the rep is about. "Cannot find name" means the
  // answer never declared the thing the check refers to, so the snippet was
  // refused for not existing rather than for being wrong, and no rep can
  // legitimately be asking for that. Without this an empty answer passes every
  // unpinned `rejects` in the library.
  const missing = probe.diagnostics.find((diagnostic) => MISSING_NAME.has(diagnostic.code));
  if (missing) {
    return {
      name: test.name,
      passed: false,
      detail: `this was refused because the answer does not define it: ${missing.message}`,
    };
  }
  if (test.errorCode !== undefined) {
    const matched = probe.diagnostics.some((diagnostic) => diagnostic.code === test.errorCode);
    if (!matched) {
      const [first] = probe.diagnostics;
      return {
        name: test.name,
        passed: false,
        detail: `expected TS${test.errorCode}, got ${first ? `TS${first.code}: ${first.message}` : 'nothing'}`,
      };
    }
  }
  return { name: test.name, passed: true };
}

/**
 * The interesting one. Identity is the pass; mutual assignability without
 * identity is the near miss, and it is the verdict that teaches, because the
 * two ways to land there are the two ways to write a type that looks right:
 * reaching for `any`, and dropping a modifier the mapped type was supposed to
 * carry.
 */
function judgeIdentity(test: TypeTestSpec, probe: CheckedProbe): CodeTestResult {
  const [first] = probe.diagnostics;
  if (first) return { name: test.name, passed: false, detail: explain(first) };

  const reading = probe.reading;
  if (!reading) {
    return { name: test.name, passed: false, detail: 'the checker gave no answer for this one' };
  }
  if (reading.identical) return { name: test.name, passed: true };

  if (reading.assignableTo && reading.assignableFrom) {
    return {
      name: test.name,
      passed: false,
      near: true,
      detail:
        `expected \`${reading.expected}\`, got \`${reading.actual}\` — assignable in both ` +
        'directions, which is not the same as being that type',
    };
  }
  return {
    name: test.name,
    passed: false,
    detail: `expected \`${reading.expected}\`, got \`${reading.actual}\``,
  };
}

function firstFailure(outcomes: CodeTestResult[]): string {
  const failed = outcomes.find((outcome) => !outcome.passed);
  if (!failed) return '';
  return failed.detail ? `**${failed.name}**: ${failed.detail}` : `**${failed.name}** failed.`;
}

/**
 * A raw `TS2322` dump teaches nothing, so the codes with a recurring cause get
 * a sentence naming it. The rest keep the compiler's own message, which is
 * usually the clearest thing anyone could write.
 */
const EXPLANATIONS: Record<number, string> = {
  2304: 'The checks use the name in the starter. Yours declares something else.',
  2307: 'Imports are not available here. Everything the answer needs is already in scope.',
  2314: 'That type takes type arguments, and the checks call it with them.',
  2552: 'The checks use the name in the starter. Yours declares something else.',
  2584: 'The DOM is not in scope here. This runs against the ES library only.',
  2589: 'The type recurses with nothing to stop it. A conditional needs a branch that ends.',
  2590: 'That type expands to more members than the compiler will build. Narrow the inputs.',
  2591: 'Node globals are not in scope here. This runs against the ES library only.',
  2775:
    'An assertion function has to be reached through a name with an explicit type ' +
    'annotation, which a `const` holding an arrow function does not have. Declare it with ' +
    '`function`.',
  2792: 'Imports are not available here. Everything the answer needs is already in scope.',
  7006: 'That parameter is implicitly `any`. This runs with the same `strict` flags as the repo.',
};

function explain(diagnostic: TypeDiagnostic): string {
  const mapped = EXPLANATIONS[diagnostic.code];
  if (mapped) return mapped;
  return `${diagnostic.message} (TS${diagnostic.code})`;
}
