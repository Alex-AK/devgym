import {
  type Category,
  CATEGORY_LABELS,
  type Difficulty,
  type ProblemStatus,
  type Relevance,
  RELEVANCE_BLURBS,
  RELEVANCE_LABELS,
} from '@devgym/shared';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DIFFICULTY_VARIANT = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
} as const;

const STATUS_LABEL: Record<ProblemStatus, string> = {
  unseen: 'Unseen',
  in_progress: 'In progress',
  solved: 'Solved',
  skipped: 'Skipped',
};

const RELEVANCE_DOT: Record<Relevance, string> = {
  daily: 'bg-emerald-500',
  occasional: 'bg-sky-500',
  foundational: 'bg-slate-400',
};

const STATUS_VARIANT = {
  unseen: 'muted',
  in_progress: 'blue',
  solved: 'green',
  skipped: 'yellow',
} as const;

export function CategoryBadge({ category }: { category: Category }): React.ReactElement {
  return <Badge variant="secondary">{CATEGORY_LABELS[category]}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }): React.ReactElement {
  return <Badge variant={DIFFICULTY_VARIANT[difficulty]}>{difficulty}</Badge>;
}

export function StatusBadge({ status }: { status: ProblemStatus }): React.ReactElement {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * Deliberately a different shape from the difficulty badge: outline plus a dot,
 * so the two axes read as two axes rather than competing for the same slot.
 */
export function RelevanceBadge({ relevance }: { relevance: Relevance }): React.ReactElement {
  return (
    <Badge variant="outline" className="gap-1.5" title={RELEVANCE_BLURBS[relevance]}>
      <span className={cn('inline-block size-1.5 rounded-full', RELEVANCE_DOT[relevance])} />
      {RELEVANCE_LABELS[relevance]}
    </Badge>
  );
}

export { STATUS_LABEL };
