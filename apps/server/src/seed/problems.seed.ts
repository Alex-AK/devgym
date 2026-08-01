import { CATEGORIES, type Category, DIFFICULTIES } from '@devgym/shared';

import { a11yProblems } from './problems/a11y';
import { codingProblems } from './problems/coding';
import { cssProblems } from './problems/css';
import { dateProblems } from './problems/dates';
import { debuggingProblems } from './problems/debugging';
import { domProblems } from './problems/dom';
import { formProblems } from './problems/forms';
import { htmlProblems } from './problems/html';
import { httpProblems } from './problems/http';
import { jsApiProblems } from './problems/js-apis';
import { queryParamProblems } from './problems/query-params';
import { reactProblems } from './problems/react';
import { securityProblems } from './problems/security';
import { sqlProblems } from './problems/sql';
import { systemsProblems } from './problems/systems';
import { testingProblems } from './problems/testing';
import type { ProblemDraft, ProblemSeed } from './problems/types';
import { typescriptProblems } from './problems/typescript';

export type { ProblemDraft, ProblemSeed } from './problems/types';

const drafts: ProblemDraft[] = [
  ...sqlProblems,
  ...queryParamProblems,
  ...jsApiProblems,
  ...typescriptProblems,
  ...reactProblems,
  ...httpProblems,
  ...domProblems,
  ...cssProblems,
  ...a11yProblems,
  ...formProblems,
  ...dateProblems,
  ...testingProblems,
  ...securityProblems,
  ...debuggingProblems,
  ...codingProblems,
  ...systemsProblems,
  ...htmlProblems,
];

/**
 * Queue order: easy problems first, then medium, then hard — and within each
 * difficulty we round-robin across categories, so practising in order never
 * means twenty SQL questions in a row.
 */
function assignPositions(all: ProblemDraft[]): ProblemSeed[] {
  const ordered: ProblemDraft[] = [];

  for (const difficulty of DIFFICULTIES) {
    const buckets = new Map<Category, ProblemDraft[]>();
    for (const draft of all) {
      if (draft.difficulty !== difficulty) continue;
      const bucket = buckets.get(draft.category);
      if (bucket) bucket.push(draft);
      else buckets.set(draft.category, [draft]);
    }

    for (let index = 0, placed = true; placed; index += 1) {
      placed = false;
      for (const category of CATEGORIES) {
        const draft = buckets.get(category)?.[index];
        if (!draft) continue;
        ordered.push(draft);
        placed = true;
      }
    }
  }

  return ordered.map((draft, index) => ({ ...draft, position: index + 1 }));
}

export const problemSeeds: ProblemSeed[] = assignPositions(drafts);
