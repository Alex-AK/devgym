import { useQuery } from '@tanstack/react-query';
import { PartyPopper } from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <PartyPopper className="size-5" />
          <span className="text-xs font-medium tracking-widest uppercase">Queue clear</span>
        </div>
        <CardTitle className="text-2xl">
          {scoped ? 'Nothing left in this session' : 'Every problem solved'}
        </CardTitle>
        <CardDescription className="text-base">
          {scoped ? (
            <>
              You&apos;ve solved everything matching <strong>{label}</strong>. Widen the session, or
              go back to the full queue.
            </>
          ) : (
            <>
              Nothing left in the queue. Solved problems stay solved, but you can re-attempt any of
              them from the problem list.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {scoped && (
          <Button asChild>
            <Link to="/practice">Practice everything</Link>
          </Button>
        )}
        <Button asChild variant={scoped ? 'outline' : 'default'}>
          <Link to="/">Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/problems">Browse all problems</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
