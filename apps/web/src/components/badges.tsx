import {
  type Category,
  CATEGORY_LABELS,
  type Difficulty,
  type ProblemStatus,
} from '@devgym/shared';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';

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

export { STATUS_LABEL };
