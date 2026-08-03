import type { ModuleSummary } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { Clock, ListOrdered } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function ModulesPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.modules,
    queryFn: api.modules,
  });

  if (isPending) return <LoadingState label="Loading modules…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-sm text-muted-foreground">
        One sitting with one API. Every step asks you to commit to an answer before it runs the
        code, because being wrong on purpose is what makes the correction stick. For the APIs you
        use constantly and have never quite sat down with.
      </p>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No modules yet. Add a directory under <code>packages/modules/content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((entry) => (
            <ModuleCard key={entry.slug} module={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ module: entry }: { module: ModuleSummary }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/modules/${entry.slug}`} className="text-lg font-medium hover:underline">
              {entry.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="size-4" />
              {entry.stepCount} steps
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {entry.minutes} min
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
