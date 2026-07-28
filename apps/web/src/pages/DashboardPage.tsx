import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DIFFICULTIES,
  type Difficulty,
  type ProgressResponse,
} from '@devgym/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RotateCcw, Sparkles, Target } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FilterChip, FilterRow } from '@/components/filters';
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

export function DashboardPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.progress,
    queryFn: api.progress,
  });

  if (isPending) return <LoadingState label="Loading your progress…" />;
  if (error) return <ErrorState error={error} />;

  return data.hasActivity ? <ActiveState progress={data} /> : <ZeroState total={data.total} />;
}

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
            them. You get a prompt, you type an answer, it gets graded on the spot. SQL runs against
            a real seeded database. Everything else is matched against known-good answers. Every
            wrong attempt unlocks the next hint, so you get a nudge instead of the answer. It all
            runs locally: no accounts, no network, no telemetry, and no AI writing it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Badge key={category} variant="secondary">
                {CATEGORY_LABELS[category]}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {total} problems, across three difficulty levels.
          </p>
          <Button asChild size="lg">
            <Link to="/practice">
              Start practicing
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <SessionCard />
      <SessionLauncher />
    </div>
  );
}

function ActiveState({ progress }: { progress: ProgressResponse }): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your progress</h1>
          <p className="text-sm text-muted-foreground">
            {progress.solved === progress.total
              ? 'Every problem solved. Nice work.'
              : `${progress.total - progress.solved} problem${
                  progress.total - progress.solved === 1 ? '' : 's'
                } left in the queue.`}
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
          <Button asChild>
            <Link to="/practice">
              Continue practicing
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <SessionCard />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Solved" value={`${progress.solved}/${progress.total}`} />
        <StatTile label="Total attempts" value={String(progress.totalAttempts)} />
        <StatTile label="Accuracy" value={`${progress.accuracy}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.byCategory.map((row) => (
              <div key={row.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Link
                    to={`/practice?category=${row.category}`}
                    className="hover:underline"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">By difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.byDifficulty.map((row) => (
              <div key={row.difficulty} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Link
                    to={`/practice?difficulty=${row.difficulty}`}
                    className="capitalize hover:underline"
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
      </div>

      <SessionLauncher />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {progress.recentAttempts.map((attempt) => (
            <Link
              key={attempt.id}
              to={`/problems/${attempt.slug}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="truncate font-medium">{attempt.title}</span>
              <span className="flex shrink-0 items-center gap-3">
                <Badge variant={VERDICT_BADGE[attempt.verdict]}>{attempt.verdict}</Badge>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {relativeTime(attempt.createdAt)}
                </span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <ResetPanel />
    </div>
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
              Pin a fixed set of problems and work through them.
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

/** Build a scoped practice session: pick a category and/or a difficulty. */
function SessionLauncher(): React.ReactElement {
  const navigate = useNavigate();
  const [category, setCategory] = React.useState<Category | null>(null);
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(null);

  const start = (): void => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    const query = params.toString();
    navigate(`/practice${query ? `?${query}` : ''}`);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" />
          Endless practice
        </CardTitle>
        <CardDescription>
          Skip the session and just work the queue, optionally narrowed to one area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FilterRow label="Category">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>
            Any
          </FilterChip>
          {CATEGORIES.map((entry) => (
            <FilterChip
              key={entry}
              active={category === entry}
              onClick={() => setCategory(category === entry ? null : entry)}
            >
              {CATEGORY_LABELS[entry]}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Difficulty">
          <FilterChip active={difficulty === null} onClick={() => setDifficulty(null)}>
            Any
          </FilterChip>
          {DIFFICULTIES.map((entry) => (
            <FilterChip
              key={entry}
              active={difficulty === entry}
              onClick={() => setDifficulty(difficulty === entry ? null : entry)}
            >
              <span className="capitalize">{entry}</span>
            </FilterChip>
          ))}
        </FilterRow>
        <Button onClick={start}>
          Start session
          <ArrowRight />
        </Button>
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

function StatTile({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
