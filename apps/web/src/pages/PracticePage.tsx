import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { api, queryKeys, scopeToParams } from '@/lib/api';
import { describeScope, isScoped, scopeFromSearch } from '@/lib/scope';

/** `/practice` is a jump gate: it resolves the queue head and redirects to it. */
export function PracticePage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const scope = scopeFromSearch(searchParams);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.next(scope),
    queryFn: () => api.next(undefined, 'next', scope),
    gcTime: 0,
    staleTime: 0,
  });

  if (isPending) return <LoadingState label="Finding your next problem…" />;
  if (error) return <ErrorState error={error} />;

  if (data.next) {
    const query = scopeToParams(scope).toString();
    return <Navigate to={`/problems/${data.next.slug}${query ? `?${query}` : ''}`} replace />;
  }

  return <QueueEmpty scoped={isScoped(scope)} label={describeScope(scope)} />;
}

export function QueueEmpty({
  scoped = false,
  label,
}: {
  scoped?: boolean;
  label?: string;
}): React.ReactElement {
  return (
    <div className="space-y-8 py-8">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Queue clear
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {scoped ? 'Nothing left in this session' : 'Every problem solved'}
        </h1>
        <p className="measure text-sm text-muted-foreground">
          {scoped ? (
            <>
              You&apos;ve solved everything matching{' '}
              <strong className="text-foreground">{label}</strong>. Widen the session, or go back to
              the full queue.
            </>
          ) : (
            <>
              Nothing left in the queue. Solved problems stay solved, but you can re-attempt any of
              them from the problem list.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {scoped && (
          <Button asChild>
            <Link to="/practice">Practice everything</Link>
          </Button>
        )}
        <Button asChild variant={scoped ? 'outline' : 'default'}>
          <Link to="/">Back to today</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/library/problems">Browse all problems</Link>
        </Button>
      </div>
    </div>
  );
}
