import { similarity } from './levenshtein';
import { normalizeAnswer, normalizeForMatch, stripCodeFence } from './normalize';
import type { GradeResult, ShortTextGraderConfig } from './types';

/** Fuzzy matching only kicks in for accept strings this long — short words need exactness. */
const MIN_FUZZY_LENGTH = 6;
const FUZZY_CORRECT = 0.85;
const FUZZY_CLOSE = 0.7;

export function gradeShortText(rawAnswer: string, config: ShortTextGraderConfig): GradeResult {
  const raw = stripCodeFence(rawAnswer);
  const normalized = normalizeAnswer(rawAnswer);

  if (normalized.length === 0) {
    return { verdict: 'incorrect', feedback: 'Enter an answer before submitting.' };
  }

  for (const pattern of config.acceptPatterns ?? []) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      continue;
    }
    if (regex.test(raw)) {
      return { verdict: 'correct', feedback: 'Correct.' };
    }
  }

  for (const candidate of config.accept) {
    if (normalizeAnswer(candidate) === normalized) {
      return { verdict: 'correct', feedback: 'Correct.' };
    }
  }

  for (const [miss, feedback] of Object.entries(config.nearMisses ?? {})) {
    if (normalizeAnswer(miss) === normalized) {
      return { verdict: 'close', feedback };
    }
  }

  const loose = normalizeForMatch(rawAnswer);
  for (const [needle, feedback] of Object.entries(config.closeSubstrings ?? {})) {
    const normalizedNeedle = normalizeForMatch(needle);
    if (normalizedNeedle.length > 0 && loose.includes(normalizedNeedle)) {
      return { verdict: 'close', feedback };
    }
  }

  let best = 0;
  for (const candidate of config.accept) {
    const normalizedCandidate = normalizeAnswer(candidate);
    if (normalizedCandidate.length < MIN_FUZZY_LENGTH) continue;
    best = Math.max(best, similarity(normalizedCandidate, normalized));
  }

  if (best >= FUZZY_CORRECT) {
    return {
      verdict: 'correct',
      feedback: "Correct. Watch the spelling, but that's the right answer.",
    };
  }
  if (best >= FUZZY_CLOSE) {
    return { verdict: 'close', feedback: "You're close. Check the spelling." };
  }

  return {
    verdict: 'incorrect',
    feedback: 'Not the answer we were looking for. Read the hint and try again.',
  };
}
