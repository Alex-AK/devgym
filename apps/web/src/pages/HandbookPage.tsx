import type { HandbookSectionSummary } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function HandbookPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.handbook,
    queryFn: api.handbook,
  });

  if (isPending) return <LoadingState label="Loading the handbook…" />;
  if (error) return <ErrorState error={error} />;

  const written = data.reduce((count, section) => count + section.pages.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Handbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short pages to study from, each one wired to the problems and workouts that make you prove
          you absorbed it. Not exhaustive, and never finished.
        </p>
      </div>

      {written === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No pages yet. Add one under <code>packages/handbook/content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((section) => (
            <SectionCard key={section.slug} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: HandbookSectionSummary }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-medium">{section.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>

        {section.pages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing written here yet.</p>
        ) : (
          <ul className="mt-4 divide-y border-t">
            {section.pages.map((page) => (
              <li key={page.slug} className="py-2.5">
                <Link
                  to={`/handbook/${page.section}/${page.slug}`}
                  className="font-medium hover:underline"
                >
                  {page.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">{page.question}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
