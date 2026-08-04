import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DEFAULT_SESSION_SIZE,
  DIFFICULTIES,
  type Difficulty,
  type SessionItem,
  type SessionResponse,
  type Tag,
  TAG_LABELS,
  TAGS,
} from '@hone/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleDashed, SkipForward } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ProblemMeta } from '@/components/badges';
import { FilterChip, FilterMultiSelect, FilterRow } from '@/components/filters';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';
import { describeScope, isScoped } from '@/lib/scope';
import { formatElapsed, useStartSession } from '@/lib/session';

const SIZES = [5, 10, 20];

/** Matches the problem page: one label style, and it is never full contrast. */
const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';

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
    <div className="max-w-2xl space-y-10">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className={LABEL}>{complete ? 'Session complete' : "Today's session"}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {complete
              ? `${session.solved} of ${session.total} solved`
              : `${done} of ${session.total} done`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isScoped(session.scope) ? `${describeScope(session.scope)}. ` : ''}
            {session.skipped > 0 ? `${session.skipped} skipped. ` : ''}
            {complete
              ? `Done in ${formatElapsed(session.elapsedSeconds)}.`
              : `${formatElapsed(session.elapsedSeconds)} so far.`}
          </p>
        </div>
        <Progress className="h-1" value={session.total === 0 ? 0 : (done / session.total) * 100} />
      </div>

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
        {session.nextSlug && <FinishButton id={session.id} variant="ghost" label="End session" />}
      </div>
    </div>
  );
}

function FinishedSession({ session }: { session: SessionResponse }): React.ReactElement {
  const accuracy = session.total === 0 ? 0 : Math.round((session.solved / session.total) * 100);

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-2">
        <p className={LABEL}>Last session</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {session.solved} of {session.total} solved
        </h1>
        <p className="text-sm text-muted-foreground">
          {session.skipped > 0 ? `${session.skipped} skipped. ` : ''}
          {accuracy}% in {formatElapsed(session.elapsedSeconds)}.
        </p>
      </div>

      <SessionItems items={session.items} />

      <div className="border-t pt-10">
        <StartSession heading="Start another" compact />
      </div>
    </div>
  );
}

/**
 * `compact` is the version that sits under a finished session: a label rather
 * than a second page title, and no description, because the page above it has
 * already said what a session is.
 */
function StartSession({
  heading = "Start today's session",
  compact = false,
}: {
  heading?: string;
  compact?: boolean;
}): React.ReactElement {
  const [size, setSize] = React.useState(DEFAULT_SESSION_SIZE);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [difficulties, setDifficulties] = React.useState<Difficulty[]>([]);
  const [tag, setTag] = React.useState<Tag | null>(null);

  const start = useStartSession();

  return (
    <div className="max-w-2xl space-y-6">
      {compact ? (
        <p className={LABEL}>{heading}</p>
      ) : (
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
          <p className="measure text-sm text-muted-foreground">
            Pins a fixed set of problems so the list doesn&apos;t shift under you. Due reviews come
            first, then new material, and solved problems drop out. Tomorrow picks up where today
            stopped.
          </p>
        </div>
      )}
      <div className="space-y-3">
        <FilterRow label="Problems">
          {SIZES.map((option) => (
            <FilterChip key={option} active={size === option} onClick={() => setSize(option)}>
              {option}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Category">
          <FilterMultiSelect
            allLabel="Any category"
            label="Category"
            onChange={setCategories}
            options={[...CATEGORIES]
              .sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b]))
              .map((entry) => ({ label: CATEGORY_LABELS[entry], value: entry }))}
            selected={categories}
          />
        </FilterRow>
        {/* Chips still fit three difficulties, and picking two is one more tap
            rather than a panel: "Any" is the empty list, not a fourth value. */}
        <FilterRow label="Difficulty">
          <FilterChip active={difficulties.length === 0} onClick={() => setDifficulties([])}>
            Any
          </FilterChip>
          {DIFFICULTIES.map((entry) => (
            <FilterChip
              key={entry}
              active={difficulties.includes(entry)}
              onClick={() =>
                setDifficulties((current) =>
                  current.includes(entry)
                    ? current.filter((value) => value !== entry)
                    : DIFFICULTIES.filter((value) => value === entry || current.includes(value))
                )
              }
            >
              <span className="capitalize">{entry}</span>
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Focus">
          <FilterChip active={tag === null} onClick={() => setTag(null)}>
            Any
          </FilterChip>
          {TAGS.map((entry) => (
            <FilterChip
              key={entry}
              active={tag === entry}
              onClick={() => setTag(tag === entry ? null : entry)}
            >
              {TAG_LABELS[entry]}
            </FilterChip>
          ))}
        </FilterRow>
        <Button
          onClick={() =>
            start.mutate({
              size,
              ...(categories.length > 0 ? { category: categories } : {}),
              ...(difficulties.length > 0 ? { difficulty: difficulties } : {}),
              ...(tag ? { tag } : {}),
            })
          }
          disabled={start.isPending}
        >
          {start.isPending ? 'Starting…' : `Start ${size} problems`}
          <ArrowRight />
        </Button>
        {start.error && <p className="text-sm text-rose-700">{start.error.message}</p>}
      </div>
    </div>
  );
}

function FinishButton({
  id,
  variant = 'default',
  label = 'Finish session',
}: {
  id: number;
  variant?: 'default' | 'ghost';
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

/**
 * The list is pinned and worked in order, so the only thing a row is for is the
 * title and whether it is done. Difficulty and relevance are on the problem page
 * itself; as ten rows of pills they were the loudest thing on the screen.
 */
function SessionItems({ items }: { items: SessionItem[] }): React.ReactElement {
  return (
    <ol className="space-y-0.5">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            to={`/problems/${item.slug}`}
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
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
            <ProblemMeta
              category={item.category}
              difficulty={item.difficulty}
              className="shrink-0"
            />
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
