import type { PathSummary } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function PathsPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({ queryKey: queryKeys.paths, queryFn: api.paths });

  if (isPending) return <LoadingState label="Loading the path…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-sm text-muted-foreground">
        An hour each, on one slice of the work. Read the pages in order, prove it on the reps, then
        build the thing. This is the deliberate-study entrance: the daily session stays interleaved,
        because that is what remembering wants, and a path is blocked and ordered, because that is
        what understanding something the first time wants.
      </p>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No sessions yet. Add a directory under <code>packages/paths/content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((path) => (
            <PathCard key={path.slug} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}

function PathCard({ path }: { path: PathSummary }): React.ReactElement {
  const complete = path.provable > 0 && path.done === path.provable;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/essentials/${path.slug}`} className="text-lg font-medium hover:underline">
              {path.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{path.summary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {path.minutes} min
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span
            className={
              complete ? 'flex items-center gap-1.5 text-emerald-700' : 'text-muted-foreground'
            }
          >
            {complete && <CheckCircle2 className="size-4" />}
            {path.done} of {path.provable} proved
          </span>
          <Link
            to={`/essentials/${path.slug}`}
            className="ml-auto font-medium text-primary hover:underline"
          >
            {path.done === 0 ? 'Start the hour' : 'Pick it up'}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
