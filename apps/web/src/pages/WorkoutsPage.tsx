import { WORKOUT_KIND_LABELS, type WorkoutSummary } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Dumbbell } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { DifficultyBadge, RelevanceBadge } from '@/components/badges';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
      <p className="max-w-prose text-sm text-muted-foreground">
        Longer builds against a real toolchain. Set the timer, get as far as you can, run the
        checkpoints to see where you stand.
      </p>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No workouts yet. Add a directory under <code>packages/workouts/content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((workout) => (
            <WorkoutCard key={workout.slug} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutSummary }): React.ReactElement {
  const complete = workout.bestCheckpointsPassed === workout.checkpointCount;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/workouts/${workout.slug}`} className="text-lg font-medium hover:underline">
              {workout.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{workout.summary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {workout.minutes} min
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{WORKOUT_KIND_LABELS[workout.kind]}</Badge>
          <DifficultyBadge difficulty={workout.difficulty} />
          <RelevanceBadge relevance={workout.relevance} />
          {Object.entries(workout.stack).map(([part, value]) => (
            <Badge key={part} variant="muted" title={part}>
              {value}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          {workout.bestCheckpointsPassed === null ? (
            <span className="text-muted-foreground">Not attempted</span>
          ) : (
            <span
              className={
                complete ? 'flex items-center gap-1.5 text-emerald-700' : 'text-muted-foreground'
              }
            >
              {complete && <CheckCircle2 className="size-4" />}
              Best: {workout.bestCheckpointsPassed} of {workout.checkpointCount} checkpoints
            </span>
          )}
          <Link
            to={`/workouts/${workout.slug}`}
            className="ml-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Dumbbell className="size-4" />
            {workout.bestCheckpointsPassed === null ? 'Start' : 'Run it again'}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
