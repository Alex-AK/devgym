import {
  CATEGORY_LABELS,
  type CategoryProgress,
  type DifficultyProgress,
  type ProgressResponse,
  type RecentAttempt,
  type Verdict,
} from '@hone/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RotateCcw } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { percent, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const VERDICT_DOT: Record<Verdict, string> = {
  correct: 'bg-emerald-500',
  close: 'bg-amber-500',
  incorrect: 'bg-rose-500',
};

/**
 * What you have covered and what is thin. It is a page you visit rather than a
 * page you land on, which is the whole reason it exists: these numbers were on
 * the dashboard, where they made every morning open with a report.
 */
export function ProgressPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.progress,
    queryFn: api.progress,
  });

  if (isPending) return <LoadingState label="Loading your progress…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="measure mt-2 text-sm text-muted-foreground">
          The problems are the progress tracking. Pages, modules and cards deliberately have none:
          what you can answer is the measurement, not what you have opened.
        </p>
      </header>

      {data.hasActivity ? (
        <>
          <Headline progress={data} />
          <ReviewQueue progress={data} />
          <ByCategory byCategory={data.byCategory} />
          <ByDifficulty byDifficulty={data.byDifficulty} />
          <RecentActivity attempts={data.recentAttempts} />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <p className="mr-auto text-sm text-muted-foreground">
              Nothing answered yet, so there is nothing to show. {data.total} problems are waiting.
            </p>
            <Button asChild>
              <Link to="/">
                Start a session
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ResetPanel />
    </div>
  );
}

/** A labelled block. The label is chrome, so it stays small and muted. */
function Section({
  action,
  children,
  label,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  label: string;
}): React.ReactElement {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Problems and workouts both measure progress; the handbook deliberately does
 * not, so it is counted rather than scored. One strip rather than three cards:
 * these are three readings of the same thing, not three objects.
 */
function Headline({ progress }: { progress: ProgressResponse }): React.ReactElement {
  const { data: workouts } = useQuery({ queryKey: queryKeys.workouts, queryFn: api.workouts });

  const cleared =
    workouts?.filter((w) => w.bestCheckpointsPassed === w.checkpointCount).length ?? 0;
  const started = workouts?.filter((w) => w.bestCheckpointsPassed !== null).length ?? 0;

  const workoutFootnote = (): string | undefined => {
    if (!workouts) return undefined;
    if (started === 0) return 'none attempted yet';
    if (started > cleared) return `${started - cleared} started, not finished`;
    return 'every checkpoint green';
  };

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
      <StatTile
        footnote={`${progress.totalAttempts} attempt${progress.totalAttempts === 1 ? '' : 's'}, ${progress.accuracy}% correct`}
        label="Problems solved"
        meter={percent(progress.solved, progress.total)}
        value={`${progress.solved}/${progress.total}`}
      />
      <StatTile
        footnote={workoutFootnote()}
        label="Workouts cleared"
        meter={workouts ? percent(cleared, workouts.length) : 0}
        value={workouts ? `${cleared}/${workouts.length}` : '–'}
      />
      <StatTile
        footnote={progress.due === 0 ? 'nothing scheduled' : 'reviews come first in a session'}
        label="Due today"
        value={String(progress.due)}
      />
    </div>
  );
}

/** The two scoped queues, offered only when there is something in them. */
function ReviewQueue({ progress }: { progress: ProgressResponse }): React.ReactElement | null {
  if (progress.due === 0 && progress.missed === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-5">
        <div className="mr-auto">
          <p className="text-sm font-medium">Come back to these</p>
          <p className="text-xs text-muted-foreground">
            A session pulls due reviews first on its own. These run them on their own instead.
          </p>
        </div>
        {progress.due > 0 && (
          <Button asChild size="sm" variant="outline">
            <Link to="/practice?mode=due">{progress.due} due for review</Link>
          </Button>
        )}
        {progress.missed > 0 && (
          <Button asChild size="sm" variant="outline">
            <Link to="/practice?mode=review">Review {progress.missed} missed</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Least covered first, then by how much is left, so an untouched big category
 * beats an untouched small one. Two columns of thin rows rather than 22 full
 * bars: at this count the ordering is the finding, and a stack of near-empty
 * meters buries it under a screen of chrome. Each row starts a scoped session.
 */
function ByCategory({ byCategory }: { byCategory: CategoryProgress[] }): React.ReactElement {
  const rows = [...byCategory]
    .filter((row) => row.total > 0)
    .sort(
      (a, b) => a.solved / a.total - b.solved / b.total || b.total - b.solved - (a.total - a.solved)
    );

  const untouched = rows.filter((row) => row.solved === 0).length;

  return (
    <Section
      action={
        <Link
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          to="/library/problems"
        >
          Browse every problem
          <ArrowRight className="size-3.5" />
        </Link>
      }
      label="Coverage by category"
    >
      <p className="measure text-sm text-muted-foreground">
        Thinnest first, so the top of the list is what you have least of.{' '}
        {untouched > 0 && `${untouched} of ${rows.length} are still untouched. `}
        Each one starts a session scoped to it.
      </p>

      <div className="grid gap-x-10 sm:grid-cols-2">
        {rows.map((row) => (
          <Link
            className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
            key={row.category}
            to={`/practice?category=${row.category}`}
          >
            <span className="truncate">{CATEGORY_LABELS[row.category]}</span>
            <Progress
              className="ml-auto h-1 w-16 shrink-0"
              value={percent(row.solved, row.total)}
            />
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {row.solved}/{row.total}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function ByDifficulty({
  byDifficulty,
}: {
  byDifficulty: DifficultyProgress[];
}): React.ReactElement {
  return (
    <Section label="By difficulty">
      <p className="measure text-sm text-muted-foreground">
        Difficulty is not relevance: an easy rep can be daily bread.
      </p>
      <div className="grid gap-6 sm:grid-cols-3">
        {byDifficulty.map((row) => (
          <div className="space-y-1.5" key={row.difficulty}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Link
                className="capitalize hover:underline"
                to={`/practice?difficulty=${row.difficulty}`}
              >
                {row.difficulty}
              </Link>
              <span className="text-xs text-muted-foreground tabular-nums">
                {row.solved}/{row.total}
              </span>
            </div>
            <Progress className="h-1" value={percent(row.solved, row.total)} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/**
 * A timestamp is only worth printing when it differs from the row above it.
 * Answers arrive in bursts, so a session's worth of attempts would otherwise be
 * a column of identical "just now" against nothing to compare it to.
 */
function RecentActivity({ attempts }: { attempts: RecentAttempt[] }): React.ReactElement {
  const stamps = attempts.map((attempt) => relativeTime(attempt.createdAt));

  return (
    <Section label="Recent activity">
      {attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ol>
          {attempts.map((attempt, index) => {
            const stamp = stamps[index] === stamps[index - 1] ? '' : stamps[index];

            return (
              <li key={attempt.id}>
                <Link
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                  to={`/problems/${attempt.slug}`}
                >
                  <span
                    className={cn('size-1.5 shrink-0 rounded-full', VERDICT_DOT[attempt.verdict])}
                  />
                  <span className="truncate">{attempt.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {attempt.verdict}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {stamp}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

function ResetPanel(): React.ReactElement {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const reset = useMutation({
    mutationFn: (clearHistory: boolean) => api.resetAll(clearHistory),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-wrap items-center gap-3 p-5">
        <div className="mr-auto">
          <p className="text-sm font-medium">Start over</p>
          <p className="text-xs text-muted-foreground">
            Run the whole set again. The problems themselves aren&apos;t touched.
          </p>
        </div>
        {confirming ? (
          <>
            <Button
              disabled={reset.isPending}
              onClick={() => reset.mutate(false)}
              size="sm"
              variant="outline"
            >
              Reset statuses only
            </Button>
            <Button
              disabled={reset.isPending}
              onClick={() => reset.mutate(true)}
              size="sm"
              variant="destructive"
            >
              Reset everything
            </Button>
            <Button onClick={() => setConfirming(false)} size="sm" variant="ghost">
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
            <RotateCcw />
            Reset progress…
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  footnote,
  label,
  meter,
  value,
}: {
  footnote?: string;
  label: string;
  meter?: number;
  value: string;
}): React.ReactElement {
  return (
    <div className="bg-card p-5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {meter !== undefined && <Progress className="mt-3 h-1" value={meter} />}
      {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
