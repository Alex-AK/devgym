import type { HandbookPageDetail, HandbookPractiseLink } from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Dumbbell, Target } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { DifficultyBadge } from '@/components/badges';
import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
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
    <article className="measure space-y-10">
      <header>
        <Link
          to="/handbook"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
        >
          {data.sectionTitle}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{data.question}</p>
      </header>

      <Markdown>{data.body}</Markdown>

      {/* Footnotes to the article, not peers of it: one rule separates the three
          from the page, and nothing separates them from each other. */}
      <footer className="space-y-8 border-t pt-6">
        <Practise links={data.practiseLinks} />
        <Neighbours page={data} />
        <Sources page={data} />
      </footer>
    </article>
  );
}

function Practise({ links }: { links: HandbookPractiseLink[] }): React.ReactElement | null {
  if (links.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Where to practise this
      </h2>
      <ul className="space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={`${link.kind}-${link.slug}`}>
            <Link
              to={link.kind === 'workout' ? `/workouts/${link.slug}` : `/problems/${link.slug}`}
              className="group flex items-center gap-2"
            >
              {link.kind === 'workout' ? (
                <Dumbbell className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Target className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="group-hover:underline">{link.title}</span>
              <DifficultyBadge difficulty={link.difficulty} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Provenance, and it reads as small print. The date a page was last checked is
 * bookkeeping, so it sits on the label line like a stamp rather than trailing
 * the citations as a sentence of its own.
 */
function Sources({ page }: { page: HandbookPageDetail }): React.ReactElement {
  return (
    <section className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-medium tracking-wide uppercase">Sources</h2>
        <p>Claims checked {page.verified}</p>
      </div>
      <ol className="space-y-1">
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
    </section>
  );
}

function Neighbours({ page }: { page: HandbookPageDetail }): React.ReactElement | null {
  if (!page.previous && !page.next) return null;

  return (
    <nav
      aria-label="Nearby pages"
      className="flex items-start justify-between gap-6 text-sm text-muted-foreground"
    >
      {page.previous ? (
        <Link
          to={`/handbook/${page.previous.section}/${page.previous.slug}`}
          className="group flex items-start gap-1.5 hover:text-foreground"
        >
          <ArrowLeft className="mt-0.5 size-3.5 shrink-0" />
          <span className="group-hover:underline">{page.previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {page.next && (
        <Link
          to={`/handbook/${page.next.section}/${page.next.slug}`}
          className="group ml-auto flex items-start gap-1.5 text-right hover:text-foreground"
        >
          <span className="group-hover:underline">{page.next.title}</span>
          <ArrowRight className="mt-0.5 size-3.5 shrink-0" />
        </Link>
      )}
    </nav>
  );
}
