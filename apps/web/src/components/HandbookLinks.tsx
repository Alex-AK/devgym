import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { api, queryKeys } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * The other half of the two-way link. A page names what it is practised by, and
 * this reads that list backwards, so a problem or a workout never has to
 * maintain its own list of further reading. Derived from the handbook index,
 * which is small enough to fetch whole.
 */
export function HandbookLinks({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}): React.ReactElement | null {
  const { data } = useQuery({ queryKey: queryKeys.handbook, queryFn: api.handbook });

  const pages = (data ?? [])
    .flatMap((section) => section.pages)
    .filter((page) => page.practise.includes(slug));

  if (pages.length === 0) return null;

  return (
    <div className={cn('text-sm', className)}>
      <h2 className="flex items-center gap-1.5 font-medium">
        <BookOpen className="size-4 text-muted-foreground" />
        Read about it
      </h2>
      <ul className="mt-2 space-y-1">
        {pages.map((page) => (
          <li key={`${page.section}/${page.slug}`}>
            <Link
              to={`/handbook/${page.section}/${page.slug}`}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
