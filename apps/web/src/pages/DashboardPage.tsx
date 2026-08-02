import { CATEGORY_LABELS, type CategoryProgress, type ProgressResponse } from '@devgym/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Dumbbell, RotateCcw, Sparkles, Target } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { percent, relativeTime } from '@/lib/format';
import { formatElapsed } from '@/lib/session';

const VERDICT_BADGE = {
  correct: 'green',
  close: 'yellow',
  incorrect: 'red',
} as const;

/** How many of the thinnest categories to offer as a next step. */
const THIN_AREAS = 4;

export function DashboardPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.progress,
    queryFn: api.progress,
  });

  if (isPending) return <LoadingState label="Loading your progress…" />;
  if (error) return <ErrorState error={error} />;

  return data.hasActivity ? <ActiveState progress={data} /> : <ZeroState total={data.total} />;
}

/* --------------------------------------------------------------- zero state */

function ZeroState({ total }: { total: number }): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-xs font-medium tracking-widest uppercase">Welcome</span>
          </div>
          <CardTitle className="text-2xl">devgym</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            A practice gym for the web-dev fundamentals you lean on and lose when you don&apos;t use
            them. Three ways in: short problems graded on the spot, longer workouts against a real
            toolchain, and a handbook to study from. It all runs locally: no accounts, no network,
            no telemetry, and no AI writing your answers for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {total} problems across three difficulty levels. Start with a session: it pins a fixed
            set so the list cannot shift under you.
          </p>
          <Button asChild size="lg">
            <Link to="/session">
              Start your first session
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <SessionCard />
      <Modes />
    </div>
  );
}

/* ------------------------------------------------------------- active state */

function ActiveState({ progress }: { progress: ProgressResponse }): React.ReactElement {
  const left = progress.total - progress.solved;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Where you are</h1>
          <p className="text-sm text-muted-foreground">
            {left === 0
              ? 'Every problem solved. Reviews keep coming round.'
              : `${left} problem${left === 1 ? '' : 's'} still unsolved.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {progress.due > 0 && (
            <Button asChild variant="outline">
              <Link to="/practice?mode=due">{progress.due} due for review</Link>
            </Button>
          )}
          {progress.missed > 0 && (
            <Button asChild variant="outline">
              <Link to="/practice?mode=review">Review {progress.missed} missed</Link>
            </Button>
          )}
        </div>
      </div>

      <SessionCard />
      <Headline progress={progress} />

      <div className="grid gap-4 md:grid-cols-2">
        <ThinnestAreas byCategory={progress.byCategory} />
        <RecentActivity progress={progress} />
      </div>

      <Modes />
      <ResetPanel />
    </div>
  );
}

/**
 * The three numbers worth seeing daily. Problems and workouts both measure
 * progress; the handbook deliberately does not, so it is counted rather than
 * scored: pages are reference, the problems are the progress tracking.
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

/**
 * The most actionable thing on the page: the categories you have covered least,
 * each a link straight into practice scoped to it. Sorted by how far through you
 * are, then by how much is left, so an untouched big category beats an untouched
 * small one.
 */
function ThinnestAreas({ byCategory }: { byCategory: CategoryProgress[] }): React.ReactElement {
  const thinnest = [...byCategory]
    .filter((row) => row.total > 0 && row.solved < row.total)
    .sort(
      (a, b) => a.solved / a.total - b.solved / b.total || b.total - b.solved - (a.total - a.solved)
    )
    .slice(0, THIN_AREAS);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Thinnest areas</CardTitle>
        <CardDescription>Least covered first. Each one starts a scoped session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {thinnest.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every category is complete. Reviews will keep them honest.
          </p>
        ) : (
          thinnest.map((row) => <ThinRow key={row.category} row={row} />)
        )}
        <Link
          to="/problems"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          See every category
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ThinRow({ row }: { row: CategoryProgress }): React.ReactElement {
  return (
    <div className="space-y-1.5">
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

/** The three ways into the app, with an honest count on each. */
function Modes(): React.ReactElement {
  const { data: workouts } = useQuery({ queryKey: queryKeys.workouts, queryFn: api.workouts });
  const { data: handbook } = useQuery({ queryKey: queryKeys.handbook, queryFn: api.handbook });

  const pages = handbook?.reduce((count, section) => count + section.pages.length, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ModeCard
        icon={<Target className="size-4" />}
        title="Endless practice"
        blurb="Work the queue with no session pinned."
        to="/practice"
        meta="Due reviews first"
      />
      <ModeCard
        icon={<Dumbbell className="size-4" />}
        title="Workouts"
        blurb="20 minutes against a real toolchain."
        to="/workouts"
        meta={workouts ? `${workouts.length} to choose from` : undefined}
      />
      <ModeCard
        icon={<BookOpen className="size-4" />}
        title="Handbook"
        blurb="Short pages to study from, wired to the reps."
        to="/handbook"
        meta={
          pages !== undefined && handbook
            ? `${pages} pages in ${handbook.filter((s) => s.pages.length > 0).length} sections`
            : undefined
        }
      />
    </div>
  );
}

function ModeCard({
  icon,
  title,
  blurb,
  to,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  to: string;
  meta?: string;
}): React.ReactElement {
  return (
    <Card className="transition-colors hover:border-primary/50">
      <CardContent className="p-5">
        <Link to={to} className="group block">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="text-primary">{icon}</span>
            {title}
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </span>
          <p className="mt-1.5 text-sm text-muted-foreground">{blurb}</p>
          {meta && <p className="mt-3 text-xs text-muted-foreground tabular-nums">{meta}</p>}
        </Link>
      </CardContent>
    </Card>
  );
}

/** The morning entry point: resume today's session, or start one. */
function SessionCard(): React.ReactElement | null {
  const { data } = useQuery({
    queryKey: queryKeys.activeSession,
    queryFn: api.activeSession,
    staleTime: 0,
  });
  const session = data?.session;

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <Target className="size-5 text-primary" />
          <div className="mr-auto">
            <p className="text-sm font-medium">No session running</p>
            <p className="text-xs text-muted-foreground">
              Pin a fixed set of problems and work through them. Reviews come first.
            </p>
          </div>
          <Button asChild>
            <Link to="/session">
              Start a session
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const done = session.total - session.remaining;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Target className="size-5 text-primary" />
          <div className="mr-auto">
            <p className="text-sm font-medium">
              Session in progress: {done} of {session.total} done
            </p>
            <p className="text-xs text-muted-foreground">
              {session.solved} solved, {session.skipped} skipped,{' '}
              {formatElapsed(session.elapsedSeconds)} in.
            </p>
          </div>
          <Button asChild>
            <Link to={session.nextSlug ? `/problems/${session.nextSlug}` : '/session'}>
              {session.remaining === 0 ? 'See summary' : 'Continue session'}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <Progress value={session.total === 0 ? 0 : (done / session.total) * 100} />
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
