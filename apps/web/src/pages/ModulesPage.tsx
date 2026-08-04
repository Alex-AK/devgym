import type { ModuleSummary } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
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
      <p className="measure text-sm text-muted-foreground">
        One sitting with one API. Every step asks you to commit to an answer before it runs the
        code, because being wrong on purpose is what makes the correction stick. For the APIs you
        use constantly and have never quite sat down with.
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No modules yet. Add a directory under <code>packages/modules/content/</code>.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {data.map((entry) => (
            <ModuleRow key={entry.slug} module={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ModuleRow({ module: entry }: { module: ModuleSummary }): React.ReactElement {
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link className="font-medium hover:underline" to={`/modules/${entry.slug}`}>
          {entry.title}
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entry.stepCount} steps · {entry.minutes} min
        </span>
      </div>
      <p className="measure mt-1 text-sm text-muted-foreground">{entry.summary}</p>
    </li>
  );
}
