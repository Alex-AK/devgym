import type { DeckSummary } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { Clock, Layers } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function DecksPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.decks,
    queryFn: api.decks,
  });

  if (isPending) return <LoadingState label="Loading cards…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A deck is one contrast drilled until it is instant. The daily queue refuses to do this on
          purpose: it interleaves, so nothing next to a rep tells you which distinction it is
          testing. Here the whole sitting is one family of near-identical things, and telling them
          apart at speed is the point. You mark yourself, and nothing is written down.
        </p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No decks yet. Add a directory under <code>packages/decks/content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((deck) => (
            <DeckCard key={deck.slug} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({ deck }: { deck: DeckSummary }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/cards/${deck.slug}`} className="text-lg font-medium hover:underline">
              {deck.title}
            </Link>
            {/* A deck summary names the things it contrasts, so it arrives with
                `code` spans in it. Modules get away with plain text; these do not. */}
            <Markdown className="mt-1 text-sm text-muted-foreground [&_p]:m-0">
              {deck.summary}
            </Markdown>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="size-4" />
              {deck.cardCount} cards
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {deck.minutes} min
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
