import {
  type Category,
  CATEGORY_LABELS,
  type Difficulty,
  type ProblemStatus,
  type Relevance,
  RELEVANCE_BLURBS,
  RELEVANCE_LABELS,
} from '@hone/shared';
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

/**
 * The same facts as the badges above, read as one muted line instead of a row of
 * pills. A badge earns its colour by carrying state you act on, which is why
 * status stays one and these don't: they describe the problem and never move,
 * and four chips above a one-sentence prompt outweigh the prompt. Lists keep the
 * badges, where colour is what makes a long table scannable.
 *
 * Every field is optional, so a caller shows only what its surface needs.
 */
export function ProblemMeta({
  category,
  difficulty,
  relevance,
  attempts,
  className,
}: {
  category?: Category;
  difficulty?: Difficulty;
  relevance?: Relevance;
  attempts?: number;
  className?: string;
}): React.ReactElement {
  const parts: { key: string; node: React.ReactNode }[] = [];

  if (category) parts.push({ key: 'category', node: CATEGORY_LABELS[category] });
  if (difficulty) {
    parts.push({ key: 'difficulty', node: <span className="capitalize">{difficulty}</span> });
  }
  if (relevance) {
    parts.push({
      key: 'relevance',
      // The dot is what keeps two axes reading as two once the pills are gone:
      // difficulty is a word, relevance is a word with a colour, and the title
      // says which is which for anyone who hasn't met the distinction yet.
      node: (
        <span className="inline-flex items-center gap-1.5" title={RELEVANCE_BLURBS[relevance]}>
          <span className={cn('inline-block size-1.5 rounded-full', RELEVANCE_DOT[relevance])} />
          {RELEVANCE_LABELS[relevance]}
        </span>
      ),
    });
  }
  if (attempts !== undefined && attempts > 0) {
    parts.push({
      key: 'attempts',
      node: `${attempts} attempt${attempts === 1 ? '' : 's'}`,
    });
  }

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
        className
      )}
    >
      {parts.map((part, index) => (
        <React.Fragment key={part.key}>
          {index > 0 && (
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
          )}
          {part.node}
        </React.Fragment>
      ))}
    </span>
  );
}

export { STATUS_LABEL };
