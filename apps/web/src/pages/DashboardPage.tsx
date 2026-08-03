import { DEFAULT_SESSION_SIZE, type ProgressResponse, type SessionResponse } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Compass, Dumbbell, Layers, ListOrdered } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { isToday, minutesRange, todayLabel } from '@/lib/format';
import { formatElapsed, useStartSession } from '@/lib/session';

/**
 * Today. One decision at the top and nothing competing with it, because this is
 * the page a fifteen-minute morning opens on. Everything that reports rather
 * than asks moved to `/progress`: a dashboard that opens with a scoreboard makes
 * you read before you work.
 */
export function DashboardPage(): React.ReactElement {
  const progress = useQuery({ queryKey: queryKeys.progress, queryFn: api.progress });
  const latest = useQuery({
    queryKey: queryKeys.latestSession,
    queryFn: api.latestSession,
    staleTime: 0,
  });

  if (progress.isPending || latest.isPending) return <LoadingState label="Loading…" />;
  if (progress.error) return <ErrorState error={progress.error} />;
  if (latest.error) return <ErrorState error={latest.error} />;

  return (
    <div className="space-y-8">
      <Hero progress={progress.data} session={latest.data.session} />
      <OtherWaysIn />
      {progress.data.hasActivity && <ProgressLine progress={progress.data} />}
    </div>
  );
}

function Hero({
  progress,
  session,
}: {
  progress: ProgressResponse;
  session: SessionResponse | null;
}): React.ReactElement {
  if (session && !session.finishedAt) return <ResumeSession session={session} />;
  if (!progress.hasActivity) return <FirstRun total={progress.total} />;
  if (session?.finishedAt && isToday(session.finishedAt)) return <DoneToday session={session} />;
  return <StartToday progress={progress} />;
}

/** The one card the eye lands on. Every state of the morning wears this shell. */
function HeroCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Card className="border-primary/25 bg-gradient-to-b from-accent/40 to-card">
      <CardContent className="space-y-4 p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium tracking-widest text-primary uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StartToday({ progress }: { progress: ProgressResponse }): React.ReactElement {
  const start = useStartSession();

  const reviews =
    progress.due === 1
      ? '1 review is due and comes first'
      : `${progress.due} reviews are due and come first`;
  const blurb =
    progress.due > 0
      ? `${DEFAULT_SESSION_SIZE} problems. ${reviews}, then new material.`
      : `${DEFAULT_SESSION_SIZE} problems, pinned so the list can't shift under you. About fifteen minutes.`;

  return (
    <HeroCard eyebrow={todayLabel()} title="Start today's session">
      <p className="max-w-prose text-sm text-muted-foreground">{blurb}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={start.isPending}
          onClick={() => start.mutate({ size: DEFAULT_SESSION_SIZE })}
        >
          {start.isPending ? 'Starting…' : 'Start'}
          <ArrowRight />
        </Button>
        <Button asChild variant="outline">
          <Link to="/session">Choose what&apos;s in it</Link>
        </Button>
      </div>
      {start.error && <p className="text-sm text-rose-700">{start.error.message}</p>}
      <QueueLink />
    </HeroCard>
  );
}

function ResumeSession({ session }: { session: SessionResponse }): React.ReactElement {
  const done = session.total - session.remaining;

  return (
    <HeroCard eyebrow={todayLabel()} title={`${done} of ${session.total} done`}>
      <p className="text-sm text-muted-foreground">
        {session.solved} solved, {session.skipped} skipped, {formatElapsed(session.elapsedSeconds)}{' '}
        in.
      </p>
      <Progress value={session.total === 0 ? 0 : (done / session.total) * 100} />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link to={session.nextSlug ? `/problems/${session.nextSlug}` : '/session'}>
            {session.remaining === 0 ? 'See the summary' : 'Carry on'}
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/session">See the session</Link>
        </Button>
      </div>
    </HeroCard>
  );
}

function DoneToday({ session }: { session: SessionResponse }): React.ReactElement {
  const start = useStartSession();

  return (
    <HeroCard eyebrow={todayLabel()} title="Today's session is done">
      <p className="text-sm text-muted-foreground">
        {session.solved} of {session.total} solved in {formatElapsed(session.elapsedSeconds)}.
        Tomorrow picks up where today stopped.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link to="/session">See the summary</Link>
        </Button>
        <Button
          variant="ghost"
          disabled={start.isPending}
          onClick={() => start.mutate({ size: DEFAULT_SESSION_SIZE })}
        >
          {start.isPending ? 'Starting…' : 'Start another'}
        </Button>
      </div>
      {start.error && <p className="text-sm text-rose-700">{start.error.message}</p>}
      <QueueLink />
    </HeroCard>
  );
}

function FirstRun({ total }: { total: number }): React.ReactElement {
  const start = useStartSession();

  return (
    <HeroCard eyebrow="Welcome" title="devgym">
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        A practice gym for the web-dev fundamentals you lean on and lose when you don&apos;t use
        them. Short problems graded on the spot, longer workouts against a real toolchain, and a
        handbook to study from. It runs locally: no accounts, no network, no telemetry, and no AI
        writing your answers for you.
      </p>
      <p className="text-sm text-muted-foreground">
        {total} problems, three difficulty levels. A session pins a fixed set so the list can&apos;t
        shift under you.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={start.isPending}
          onClick={() => start.mutate({ size: DEFAULT_SESSION_SIZE })}
        >
          {start.isPending ? 'Starting…' : 'Start your first session'}
          <ArrowRight />
        </Button>
        <Button asChild variant="outline">
          <Link to="/library">Look around first</Link>
        </Button>
      </div>
      {start.error && <p className="text-sm text-rose-700">{start.error.message}</p>}
    </HeroCard>
  );
}

function QueueLink(): React.ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      Or{' '}
      <Link to="/practice" className="underline underline-offset-2 hover:text-foreground">
        work the queue without pinning a session
      </Link>
      .
    </p>
  );
}

/**
 * The other formats, ordered by what they cost you rather than by what they
 * are. On a morning the question is never "module or workout", it is how long
 * you have, so the durations are the content's own and not an estimate.
 */
function OtherWaysIn(): React.ReactElement {
  const cards = useQuery({ queryKey: queryKeys.cards, queryFn: api.cards });
  const modules = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });
  const workouts = useQuery({ queryKey: queryKeys.workouts, queryFn: api.workouts });
  const paths = useQuery({ queryKey: queryKeys.paths, queryFn: api.paths });

  const cardCount = cards.data?.cards.length;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        Other ways in
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WayIn
          icon={<Layers className="size-4" />}
          title="Cards"
          blurb="Two sides, self-graded. One pass over the pile."
          to="/cards"
          meta={cardCount === undefined ? undefined : `${cardCount} cards`}
        />
        <WayIn
          icon={<ListOrdered className="size-4" />}
          title="Modules"
          blurb="One API, one sitting. Commit to an answer, then run it."
          to="/library/modules"
          meta={minutesRange(modules.data?.map((entry) => entry.minutes) ?? [])}
        />
        <WayIn
          icon={<Dumbbell className="size-4" />}
          title="Workouts"
          blurb="A real toolchain, a timer, and checkpoints that say where you stand."
          to="/library/workouts"
          meta={minutesRange(workouts.data?.map((entry) => entry.minutes) ?? [])}
        />
        <WayIn
          icon={<Compass className="size-4" />}
          title="Essentials"
          blurb="One slice of the work: read it, prove it, build it."
          to="/library/essentials"
          meta={minutesRange(paths.data?.map((entry) => entry.minutes) ?? [])}
        />
      </div>
    </section>
  );
}

function WayIn({
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
      <CardContent className="p-4">
        <Link to={to} className="group block">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="text-primary">{icon}</span>
            {title}
            {meta && (
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                {meta}
              </span>
            )}
          </span>
          <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
        </Link>
      </CardContent>
    </Card>
  );
}

/** One line, because a number you glance at is not a page you visit. */
function ProgressLine({ progress }: { progress: ProgressResponse }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {progress.solved} of {progress.total} problems solved
      </span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{progress.accuracy}% correct</span>
      <Link
        to="/progress"
        className="ml-auto flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        See your progress
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
