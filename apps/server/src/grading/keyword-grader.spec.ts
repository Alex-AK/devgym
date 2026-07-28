import { describe, expect, it } from 'vitest';

import { gradeExplain } from './keyword-grader';
import type { ExplainGraderConfig } from './types';

const config: ExplainGraderConfig = {
  groups: [
    { synonyms: ['allsettled'], missingFeedback: 'Name the combinator.' },
    { synonyms: ['status'], missingFeedback: 'Each result object has a status field.' },
    { synonyms: ['value', 'reason'], missingFeedback: 'What is on the result object?' },
  ],
  hints: [],
};

describe('gradeExplain', () => {
  it('is correct when every group matches', () => {
    const result = gradeExplain(
      'Promise.allSettled resolves with objects carrying a status plus a value or reason.',
      config
    );
    expect(result.verdict).toBe('correct');
  });

  it('is close at half the groups, quoting the first missing one', () => {
    const result = gradeExplain('Promise.allSettled gives you every status.', config);
    expect(result.verdict).toBe('close');
    expect(result.feedback).toContain('What is on the result object?');
    expect(result.feedback).toContain('2 of 3');
  });

  it('is incorrect below half, quoting the first missing group', () => {
    const result = gradeExplain('I would use a try/catch around the loop.', config);
    expect(result.verdict).toBe('incorrect');
    expect(result.feedback).toContain('Name the combinator.');
  });

  it('matches synonyms case-insensitively inside prose', () => {
    const result = gradeExplain('Use ALLSETTLED; check STATUS; read VALUE or REASON.', config);
    expect(result.verdict).toBe('correct');
  });

  it('rejects an empty answer', () => {
    expect(gradeExplain('  ', config).verdict).toBe('incorrect');
  });
});
