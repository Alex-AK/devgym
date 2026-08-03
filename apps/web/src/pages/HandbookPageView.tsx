import type { HandbookPageDetail, HandbookPractiseLink } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Dumbbell, Target } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function HandbookPageView(): React.ReactElement {
  const { section = '', slug = '' } = useParams();
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.handbookPage(section, slug),
    queryFn: () => api.handbookPage(section, slug),
  });

  if (isPending) return <LoadingState label="Loading the page…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <article className="space-y-8">
      <header>
        <Link to="/handbook" className="text-sm text-muted-foreground hover:underline">
          {data.sectionTitle}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-2 text-muted-foreground">{data.question}</p>
      </header>

      <Markdown>{data.body}</Markdown>

      <Practise links={data.practiseLinks} />
      <Sources page={data} />
      <Neighbours page={data} />
    </article>
  );
}

function Practise({ links }: { links: HandbookPractiseLink[] }): React.ReactElement | null {
  if (links.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold">Where to practise this</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {links.map((link) => (
            <li key={`${link.kind}-${link.slug}`}>
              <Link
                to={link.kind === 'workout' ? `/workouts/${link.slug}` : `/problems/${link.slug}`}
                className="flex items-center gap-2 hover:underline"
              >
                {link.kind === 'workout' ? (
                  <Dumbbell className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Target className="size-4 shrink-0 text-muted-foreground" />
                )}
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Sources({ page }: { page: HandbookPageDetail }): React.ReactElement {
  return (
    <footer className="border-t pt-4 text-sm text-muted-foreground">
      <h2 className="font-medium text-foreground">Sources</h2>
      <ol className="mt-2 space-y-1">
        {page.sources.map((source) => (
          <li key={source.url}>
            {source.author},{' '}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs">Claims last checked against these sources on {page.verified}.</p>
    </footer>
  );
}

function Neighbours({ page }: { page: HandbookPageDetail }): React.ReactElement | null {
  if (!page.previous && !page.next) return null;

  return (
    <nav className="flex items-center justify-between gap-4 border-t pt-4 text-sm">
      {page.previous ? (
        <Link
          to={`/handbook/${page.previous.section}/${page.previous.slug}`}
          className="flex items-center gap-1.5 hover:underline"
        >
          <ArrowLeft className="size-4" />
          {page.previous.title}
        </Link>
      ) : (
        <span />
      )}
      {page.next && (
        <Link
          to={`/handbook/${page.next.section}/${page.next.slug}`}
          className="ml-auto flex items-center gap-1.5 hover:underline"
        >
          {page.next.title}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
