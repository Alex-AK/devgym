import type {
  PathDetail,
  PathModuleStep,
  PathPageStep,
  PathProblemStep,
  PathStepDetail,
  PathWorkoutStep,
} from '@devgym/shared';
import { WORKOUT_KIND_LABELS } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock, Dumbbell, ListOrdered, Target } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { CategoryBadge, DifficultyBadge } from '@/components/badges';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

/**
 * Read, then prove, then build. The order is the format, so the view names the
 * three parts rather than showing one undifferentiated list.
 */
const PHASES = [
  {
    kind: 'page' as const,
    title: 'Read',
    blurb: 'In order. Each one assumes the last.',
    icon: BookOpen,
  },
  {
    kind: 'module' as const,
    title: 'Sit with the API',
    blurb: 'Predict, run, correct. What a session about an API has instead of a page.',
    icon: ListOrdered,
  },
  {
    kind: 'problem' as const,
    title: 'Prove it',
    blurb: 'The reps those pages explain, in a fixed order.',
    icon: Target,
  },
  {
    kind: 'workout' as const,
    title: 'Build it',
    blurb: 'Nobody tells you which part of the hour applies. That is the exercise.',
    icon: Dumbbell,
  },
];

export function PathPage(): React.ReactElement {
  const { slug = '' } = useParams();
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.path(slug),
    queryFn: () => api.path(slug),
  });

  if (isPending) return <LoadingState label="Loading the session…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <article className="space-y-8">
      <header>
        <Link to="/essentials" className="text-sm text-muted-foreground hover:underline">
          The essentials path
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-2 text-muted-foreground">{data.question}</p>
        <p className="mt-3 text-sm text-muted-foreground">{data.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            {data.minutes} min
          </span>
          <span>
            {data.done} of {data.provable} proved
          </span>
        </div>
      </header>

      {PHASES.map((phase) => {
        const steps = data.steps.filter((step) => step.kind === phase.kind);
        if (steps.length === 0) return null;

        return (
          <section key={phase.kind} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <phase.icon className="size-4 self-center text-muted-foreground" />
              <h2 className="font-medium">{phase.title}</h2>
              <p className="text-sm text-muted-foreground">{phase.blurb}</p>
            </div>
            <ol className="space-y-3">
              {steps.map((step) => (
                <li key={`${step.kind}-${step.ref}`}>
                  <StepCard step={step} resume={step.index === data.resumeIndex} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <Ending path={data} />
    </article>
  );
}

function StepCard({ step, resume }: { step: PathStepDetail; resume: boolean }): React.ReactElement {
  return (
    <Card className={resume ? 'border-primary' : undefined}>
      <CardContent className="flex gap-4 p-4">
        <span className="mt-0.5 w-6 shrink-0 text-sm text-muted-foreground tabular-nums">
          {step.index + 1}.
        </span>
        <div className="min-w-0 flex-1">
          <Step step={step} />
          {step.note && <p className="mt-1.5 text-sm text-muted-foreground">{step.note}</p>}
        </div>
        {resume && (
          <Badge variant="blue" className="h-fit shrink-0">
            You are here
          </Badge>
        )}
        {step.done && (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Solved" />
        )}
      </CardContent>
    </Card>
  );
}

/** One component per kind, so a `module` step is one more case rather than a rewrite. */
function Step({ step }: { step: PathStepDetail }): React.ReactElement {
  switch (step.kind) {
    case 'page':
      return <PageStep step={step} />;
    case 'problem':
      return <ProblemStep step={step} />;
    case 'workout':
      return <WorkoutStep step={step} />;
    case 'module':
      return <ModuleStep step={step} />;
  }
}

function ModuleStep({ step }: { step: PathModuleStep }): React.ReactElement {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link to={`/modules/${step.slug}`} className="font-medium hover:underline">
          {step.title}
        </Link>
        <span className="text-sm text-muted-foreground">
          {step.stepCount} steps · {step.minutes} min
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{step.summary}</p>
    </div>
  );
}

function PageStep({ step }: { step: PathPageStep }): React.ReactElement {
  return (
    <div>
      <Link to={`/handbook/${step.section}/${step.slug}`} className="font-medium hover:underline">
        {step.title}
      </Link>
      <p className="mt-0.5 text-sm text-muted-foreground">{step.question}</p>
    </div>
  );
}

function ProblemStep({ step }: { step: PathProblemStep }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Link to={`/problems/${step.slug}`} className="font-medium hover:underline">
        {step.title}
      </Link>
      <CategoryBadge category={step.category} />
      <DifficultyBadge difficulty={step.difficulty} />
    </div>
  );
}

function WorkoutStep({ step }: { step: PathWorkoutStep }): React.ReactElement {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link to={`/workouts/${step.slug}`} className="font-medium hover:underline">
          {step.title}
        </Link>
        <Badge variant="secondary">{WORKOUT_KIND_LABELS[step.workoutKind]}</Badge>
        <span className="text-sm text-muted-foreground">{step.minutes} min</span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{step.summary}</p>
      {step.bestCheckpointsPassed !== null && (
        <p className="mt-1 text-sm text-muted-foreground">
          Best: {step.bestCheckpointsPassed} of {step.checkpointCount} checkpoints
        </p>
      )}
    </div>
  );
}

function Ending({ path }: { path: PathDetail }): React.ReactElement {
  const done = path.resumeIndex === null;

  return (
    <footer className="border-t pt-4 text-sm text-muted-foreground">
      {done
        ? 'Every rep in this hour is solved. The reps come back on their own schedule from the daily session; the hour does not need repeating.'
        : 'Nothing here is scored. The reps carry their own progress, and they are the honest measure of whether the hour landed.'}
    </footer>
  );
}
