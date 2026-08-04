import type { PathSummary } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { api, queryKeys } from '@/lib/api';

export function PathsPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({ queryKey: queryKeys.paths, queryFn: api.paths });

  if (isPending) return <LoadingState label="Loading the path…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <p className="measure text-sm text-muted-foreground">
        An hour each, on one slice of the work. Read the pages in order, prove it on the reps, then
        build the thing. This is the deliberate-study entrance: the daily session stays interleaved,
        because that is what remembering wants, and a path is blocked and ordered, because that is
        what understanding something the first time wants.
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet. Add a directory under <code>packages/paths/content/</code>.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {data.map((path) => (
            <PathRow key={path.slug} path={path} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PathRow({ path }: { path: PathSummary }): React.ReactElement {
  const complete = path.provable > 0 && path.done === path.provable;

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link className="font-medium hover:underline" to={`/essentials/${path.slug}`}>
          {path.title}
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums">{path.minutes} min</span>
      </div>

      <p className="measure mt-1 text-sm text-muted-foreground">{path.summary}</p>

      <p
        className={
          complete
            ? 'mt-2 flex items-center gap-1.5 text-xs text-emerald-700'
            : 'mt-2 text-xs text-muted-foreground'
        }
      >
        {complete && <CheckCircle2 className="size-3.5" />}
        {path.done} of {path.provable} proved
      </p>
    </li>
  );
}
