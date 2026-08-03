import {
  CATEGORY_LABELS,
  type CategoryProgress,
  type DifficultyProgress,
  type ProgressResponse,
} from '@hone/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RotateCcw } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { percent, relativeTime } from '@/lib/format';

const VERDICT_BADGE = {
  correct: 'green',
  close: 'yellow',
  incorrect: 'red',
} as const;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          The problems are the progress tracking. Pages, modules and cards deliberately have none:
          what you can answer is the measurement, not what you have opened.
        </p>
      </div>

      {data.hasActivity ? (
        <>
          <Headline progress={data} />
          <ReviewQueue progress={data} />
          <div className="grid gap-4 md:grid-cols-2">
            <ByCategory byCategory={data.byCategory} />
            <div className="space-y-4">
              <ByDifficulty byDifficulty={data.byDifficulty} />
              <RecentActivity progress={data} />
            </div>
          </div>
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

/**
 * Problems and workouts both measure progress; the handbook deliberately does
 * not, so it is counted rather than scored.
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
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile
        label="Problems solved"
        value={`${progress.solved}/${progress.total}`}
        meter={percent(progress.solved, progress.total)}
        footnote={`${progress.totalAttempts} attempt${progress.totalAttempts === 1 ? '' : 's'}, ${progress.accuracy}% correct`}
      />
      <StatTile
        label="Workouts cleared"
        value={workouts ? `${cleared}/${workouts.length}` : '–'}
        meter={workouts ? percent(cleared, workouts.length) : 0}
        footnote={workoutFootnote()}
      />
      <StatTile
        label="Due today"
        value={String(progress.due)}
        footnote={progress.due === 0 ? 'nothing scheduled' : 'reviews come first in a session'}
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
          <Button asChild variant="outline" size="sm">
            <Link to="/practice?mode=due">{progress.due} due for review</Link>
          </Button>
        )}
        {progress.missed > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link to="/practice?mode=review">Review {progress.missed} missed</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Least covered first, then by how much is left, so an untouched big category
 * beats an untouched small one. Each row starts a session scoped to it.
 */
function ByCategory({ byCategory }: { byCategory: CategoryProgress[] }): React.ReactElement {
  const rows = [...byCategory]
    .filter((row) => row.total > 0)
    .sort(
      (a, b) => a.solved / a.total - b.solved / b.total || b.total - b.solved - (a.total - a.solved)
    );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">By category</CardTitle>
        <CardDescription>Thinnest first. Each one starts a scoped session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {rows.map((row) => (
          <div key={row.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <Link
                to={`/practice?category=${row.category}`}
                className="font-medium hover:underline"
                title={`Practice ${CATEGORY_LABELS[row.category]}`}
              >
                {CATEGORY_LABELS[row.category]}
              </Link>
              <span className="text-muted-foreground tabular-nums">
                {row.solved}/{row.total}
              </span>
            </div>
            <Progress value={percent(row.solved, row.total)} />
          </div>
        ))}
        <Link
          to="/library/problems"
          className="inline-flex items-center gap-1.5 pt-1 text-sm text-primary hover:underline"
        >
          Browse every problem
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ByDifficulty({
  byDifficulty,
}: {
  byDifficulty: DifficultyProgress[];
}): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">By difficulty</CardTitle>
        <CardDescription>
          Difficulty is not relevance: an easy rep can be daily bread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {byDifficulty.map((row) => (
          <div key={row.difficulty} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <Link
                to={`/practice?difficulty=${row.difficulty}`}
                className="font-medium capitalize hover:underline"
              >
                {row.difficulty}
              </Link>
              <span className="text-muted-foreground tabular-nums">
                {row.solved}/{row.total}
              </span>
            </div>
            <Progress value={percent(row.solved, row.total)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ progress }: { progress: ProgressResponse }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>The last answers you gave.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {progress.recentAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          progress.recentAttempts.map((attempt) => (
            <Link
              key={attempt.id}
              to={`/problems/${attempt.slug}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="truncate font-medium">{attempt.title}</span>
              <span className="flex shrink-0 items-center gap-3">
                <Badge variant={VERDICT_BADGE[attempt.verdict]}>{attempt.verdict}</Badge>
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {relativeTime(attempt.createdAt)}
                </span>
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
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
    <Card className="border-dashed">
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
              variant="outline"
              size="sm"
              disabled={reset.isPending}
              onClick={() => reset.mutate(false)}
            >
              Reset statuses only
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={reset.isPending}
              onClick={() => reset.mutate(true)}
            >
              Reset everything
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            <RotateCcw />
            Reset progress…
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  meter,
  footnote,
}: {
  label: string;
  value: string;
  meter?: number;
  footnote?: string;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        {meter !== undefined && <Progress value={meter} className="mt-3" />}
        {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}
