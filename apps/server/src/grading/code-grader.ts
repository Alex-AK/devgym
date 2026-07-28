import { type CodeTestOutcome, runCode } from './code-runner';
import { stripCodeFence } from './normalize';
import type { CodeGraderConfig, GradeResult } from './types';

/** Fraction of tests that must pass before an answer counts as "close". */
const CLOSE_THRESHOLD = 0.5;

export async function gradeCode(rawAnswer: string, config: CodeGraderConfig): Promise<GradeResult> {
  const answer = stripCodeFence(rawAnswer).trim();
  if (answer.length === 0) {
    return { verdict: 'incorrect', feedback: 'Write some code before submitting.' };
  }

  const result = await runCode(answer, config.tests, config.setup ?? '');

  if (result.error) {
    return {
      verdict: 'incorrect',
      feedback: `Your code did not run: ${result.error}`,
      tests: [],
    };
  }

  const passed = result.outcomes.filter((outcome) => outcome.passed).length;
  const total = result.outcomes.length;

  if (total > 0 && passed === total) {
    return {
      verdict: 'correct',
      feedback: `All ${total} tests passed.`,
      tests: result.outcomes,
    };
  }

  return {
    verdict: passed / Math.max(1, total) >= CLOSE_THRESHOLD ? 'close' : 'incorrect',
    feedback: `${passed} of ${total} tests passed. ${firstFailure(result.outcomes)}`,
    tests: result.outcomes,
  };
}

function firstFailure(outcomes: CodeTestOutcome[]): string {
  const failed = outcomes.find((outcome) => !outcome.passed);
  if (!failed) return '';
  return failed.detail ? `**${failed.name}**: ${failed.detail}` : `**${failed.name}** failed.`;
}
