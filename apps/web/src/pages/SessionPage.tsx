import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DEFAULT_SESSION_SIZE,
  DIFFICULTIES,
  type Difficulty,
  type SessionItem,
  type SessionResponse,
} from '@devgym/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  PartyPopper,
  SkipForward,
  Target,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { DifficultyBadge, RelevanceBadge } from '@/components/badges';
import { FilterChip, FilterRow } from '@/components/filters';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { describeScope, isScoped } from '@/lib/scope';
import { formatElapsed, useStartSession } from '@/lib/session';

const SIZES = [5, 10, 20];

export function SessionPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.latestSession,
    queryFn: api.latestSession,
    staleTime: 0,
  });

  if (isPending) return <LoadingState label="Loading your session…" />;
  if (error) return <ErrorState error={error} />;

  const session = data.session;
  if (session && !session.finishedAt) return <ActiveSession session={session} />;
  if (session) return <FinishedSession session={session} />;
  return <StartSession />;
}

function ActiveSession({ session }: { session: SessionResponse }): React.ReactElement {
  const done = session.total - session.remaining;
  const complete = session.remaining === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            {complete ? <PartyPopper className="size-5" /> : <Target className="size-5" />}
            <span className="text-xs font-medium tracking-widest uppercase">
              {complete ? 'Session complete' : "Today's session"}
            </span>
          </div>
          <CardTitle className="text-2xl">
            {complete
              ? `${session.solved} of ${session.total} solved`
              : `${done} of ${session.total} done`}
          </CardTitle>
          <CardDescription>
            {isScoped(session.scope) ? `${describeScope(session.scope)}. ` : ''}
            {session.skipped > 0 ? `${session.skipped} skipped. ` : ''}
            {complete
              ? `Done in ${formatElapsed(session.elapsedSeconds)}.`
              : `${formatElapsed(session.elapsedSeconds)} so far.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={session.total === 0 ? 0 : (done / session.total) * 100} />
          <SessionItems items={session.items} />
          <div className="flex flex-wrap gap-3">
            {session.nextSlug ? (
              <Button asChild>
                <Link to={`/problems/${session.nextSlug}`}>
                  Continue
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <FinishButton id={session.id} />
            )}
            {session.nextSlug && (
              <FinishButton id={session.id} variant="outline" label="End session" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinishedSession({ session }: { session: SessionResponse }): React.ReactElement {
  const accuracy = session.total === 0 ? 0 : Math.round((session.solved / session.total) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            <PartyPopper className="size-5" />
            <span className="text-xs font-medium tracking-widest uppercase">Last session</span>
          </div>
          <CardTitle className="text-2xl">
            {session.solved} of {session.total} solved
          </CardTitle>
          <CardDescription>
            {session.skipped > 0 ? `${session.skipped} skipped. ` : ''}
            {accuracy}% in {formatElapsed(session.elapsedSeconds)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionItems items={session.items} />
        </CardContent>
      </Card>
      <StartSession heading="Start another" />
    </div>
  );
}

function StartSession({
  heading = "Start today's session",
}: {
  heading?: string;
}): React.ReactElement {
  const [size, setSize] = React.useState(DEFAULT_SESSION_SIZE);
  const [category, setCategory] = React.useState<Category | null>(null);
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(null);

  const start = useStartSession();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" />
          {heading}
        </CardTitle>
        <CardDescription>
          Pins a fixed set of problems so the list doesn&apos;t shift under you. Due reviews come
          first, then new material, and solved problems drop out. Tomorrow picks up where today
          stopped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FilterRow label="Problems">
          {SIZES.map((option) => (
            <FilterChip key={option} active={size === option} onClick={() => setSize(option)}>
              {option}
            </FilterChip>
          ))}
        </FilterRow>
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
        <Button
          onClick={() =>
            start.mutate({
              size,
              ...(category ? { category } : {}),
              ...(difficulty ? { difficulty } : {}),
            })
          }
          disabled={start.isPending}
        >
          {start.isPending ? 'Starting…' : `Start ${size} problems`}
          <ArrowRight />
        </Button>
        {start.error && <p className="text-sm text-rose-700">{start.error.message}</p>}
      </CardContent>
    </Card>
  );
}

function FinishButton({
  id,
  variant = 'default',
  label = 'Finish session',
}: {
  id: number;
  variant?: 'default' | 'outline';
  label?: string;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const finish = useMutation({
    mutationFn: () => api.finishSession(id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return (
    <Button variant={variant} onClick={() => finish.mutate()} disabled={finish.isPending}>
      {label}
    </Button>
  );
}

function SessionItems({ items }: { items: SessionItem[] }): React.ReactElement {
  return (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            to={`/problems/${item.slug}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <ItemIcon status={item.status} />
            <span
              className={
                item.status === 'pending'
                  ? 'flex-1 truncate'
                  : 'flex-1 truncate text-muted-foreground'
              }
            >
              {item.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {CATEGORY_LABELS[item.category]}
            </span>
            <DifficultyBadge difficulty={item.difficulty} />
            <RelevanceBadge relevance={item.relevance} />
          </Link>
        </li>
      ))}
    </ol>
  );
}

function ItemIcon({ status }: { status: SessionItem['status'] }): React.ReactElement {
  if (status === 'solved') return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;
  if (status === 'skipped') return <SkipForward className="size-4 shrink-0 text-amber-600" />;
  return <CircleDashed className="size-4 shrink-0 text-muted-foreground" />;
}
