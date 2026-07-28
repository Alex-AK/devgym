import { normalizeForMatch } from './normalize';
import type { ExplainGraderConfig, GradeResult } from './types';

/**
 * Explanation answers are scored by keyword groups: each group is one idea the
 * answer has to contain, satisfied by any of its synonyms.
 */
export function gradeExplain(rawAnswer: string, config: ExplainGraderConfig): GradeResult {
  const normalized = normalizeForMatch(rawAnswer);

  if (normalized.length === 0) {
    return { verdict: 'incorrect', feedback: 'Enter an answer before submitting.' };
  }
  if (config.groups.length === 0) {
    return { verdict: 'correct', feedback: 'Correct.' };
  }

  const matched = config.groups.map((group) =>
    group.synonyms.some((synonym) => {
      const needle = normalizeForMatch(synonym);
      return needle.length > 0 && normalized.includes(needle);
    })
  );

  const hits = matched.filter(Boolean).length;
  const total = config.groups.length;

  if (hits === total) {
    return { verdict: 'correct', feedback: 'Correct. You covered every part.' };
  }

  const firstMissingIndex = matched.indexOf(false);
  const firstMissing = config.groups[firstMissingIndex];
  const feedback = firstMissing?.missingFeedback ?? 'Something is missing from your answer.';
  const threshold = Math.ceil(total / 2);

  return {
    verdict: hits >= threshold ? 'close' : 'incorrect',
    feedback: `${feedback} (${hits} of ${total} key points covered.)`,
  };
}
