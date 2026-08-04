import { RELEVANCE_LABELS, WORKOUT_KIND_LABELS, type WorkoutSummary } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { api, queryKeys } from '@/lib/api';

export function WorkoutsPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.workouts,
    queryFn: api.workouts,
  });

  if (isPending) return <LoadingState label="Loading workouts…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <p className="measure text-sm text-muted-foreground">
        Longer builds against a real toolchain. Set the timer, get as far as you can, run the
        checkpoints to see where you stand.
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No workouts yet. Add a directory under <code>packages/workouts/content/</code>.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {data.map((workout) => (
            <WorkoutRow key={workout.slug} workout={workout} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A row, not a card. Two dozen workouts as two dozen boxes is a wall, and the
 * only thing on this line that changes is how far you got: the rest is
 * metadata, so it reads as text.
 */
function WorkoutRow({ workout }: { workout: WorkoutSummary }): React.ReactElement {
  const complete = workout.bestCheckpointsPassed === workout.checkpointCount;
  const stack = Object.values(workout.stack).filter((part): part is string => Boolean(part));

  const meta = [
    WORKOUT_KIND_LABELS[workout.kind],
    workout.difficulty,
    RELEVANCE_LABELS[workout.relevance].toLowerCase(),
    ...stack,
  ];

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link className="font-medium hover:underline" to={`/workouts/${workout.slug}`}>
          {workout.title}
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums">{workout.minutes} min</span>
      </div>

      <p className="measure mt-1 text-sm text-muted-foreground">{workout.summary}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{meta.join(' · ')}</span>
        {workout.bestCheckpointsPassed !== null && (
          <span
            className={
              complete ? 'flex items-center gap-1.5 text-emerald-700' : 'text-muted-foreground'
            }
          >
            {complete && <CheckCircle2 className="size-3.5" />}
            {workout.bestCheckpointsPassed} of {workout.checkpointCount} checkpoints
          </span>
        )}
      </div>
    </li>
  );
}
