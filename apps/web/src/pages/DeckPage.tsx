import type { DeckCard, DeckDetail } from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, Dumbbell, Eye, RotateCcw, Target, X } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';

export function DeckPage(): React.ReactElement {
  const { slug = '' } = useParams();
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.deck(slug),
    queryFn: () => api.deck(slug),
    enabled: slug.length > 0,
  });

  if (isPending) return <LoadingState label="Loading the deck…" />;
  if (error) return <ErrorState error={error} />;

  return <Drill deck={data} />;
}

/**
 * One pass over a set of cards. Nothing is persisted, so a pass is React state
 * and closing the tab loses it: the reps a deck cites are what carries progress.
 * A re-run is the same component with a shorter `cards`, which is why missing
 * one costs nothing more than seeing it again.
 */
function Drill({ deck }: { deck: DeckDetail }): React.ReactElement {
  const [cards, setCards] = React.useState<DeckCard[]>(deck.cards);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [missed, setMissed] = React.useState<DeckCard[]>([]);
  const [pass, setPass] = React.useState(1);

  // Focus moves here on every card, and to the summary at the end. It is a
  // container rather than a button on purpose: a Space keypress must never land
  // on something Space activates. See the keyboard effect below.
  const stageRef = React.useRef<HTMLDivElement>(null);

  const done = index >= cards.length;
  const card = cards[index];

  const flip = (): void => {
    if (card) setFlipped(true);
  };

  // Only a revealed card can be graded, so there is no marking a card you have
  // not read the back of, from the keyboard or otherwise.
  const grade = (gotIt: boolean): void => {
    if (!flipped || !card) return;
    if (!gotIt) setMissed((previous) => [...previous, card]);
    setIndex(index + 1);
    setFlipped(false);
  };

  const rerun = (): void => {
    setCards(missed);
    setMissed([]);
    setIndex(0);
    setFlipped(false);
    setPass((previous) => previous + 1);
  };

  // Land on the card, not on a control. A screen reader hears the position and
  // the question from the group's name; the back is a live region, announced
  // when it fills. preventScroll keeps the deck title in view.
  React.useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [index, pass, done]);

  // Keep the listener stable while it always sees the latest state, the way the
  // problem page does.
  const latest = React.useRef({ flip, grade, active: false });
  React.useEffect(() => {
    latest.current = { flip, grade, active: !done };
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!latest.current.active) return;

      // A focused control owns its own keys. Space activates a button natively,
      // so handling it here as well would flip the card and re-activate the
      // button from one keypress. Defer, and let the button be a button.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === ' ') {
        // Space scrolls the page if you let it.
        event.preventDefault();
        latest.current.flip();
      } else if (event.key === '1' || event.key === 'j') {
        latest.current.grade(true);
      } else if (event.key === '2' || event.key === 'k') {
        latest.current.grade(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <article className="space-y-6">
      <header>
        <Link to="/cards" className="text-sm text-muted-foreground hover:underline">
          Cards
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{deck.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pass === 1
            ? `${deck.cardCount} cards · ${deck.minutes} min`
            : `Pass ${pass}: the ${cards.length} you missed`}
        </p>
      </header>

      {done || !card ? (
        <Summary ref={stageRef} deck={deck} missed={missed} onRerun={rerun} total={cards.length} />
      ) : (
        <Stage
          ref={stageRef}
          card={card}
          flipped={flipped}
          index={index}
          onFlip={flip}
          onGrade={grade}
          total={cards.length}
        />
      )}
    </article>
  );
}

interface StageProps {
  card: DeckCard;
  flipped: boolean;
  index: number;
  onFlip: () => void;
  onGrade: (gotIt: boolean) => void;
  total: number;
}

const Stage = React.forwardRef<HTMLDivElement, StageProps>(function Stage(
  { card, flipped, index, onFlip, onGrade, total },
  ref
) {
  const id = React.useId();
  const positionId = `${id}-position`;
  const frontId = `${id}-front`;

  return (
    <div className="space-y-4">
      <div>
        <p id={positionId} className="text-sm text-muted-foreground">
          Card {index + 1} of {total}
        </p>
        <Progress className="mt-2" value={(index / total) * 100} />
      </div>

      {/* Naming the group with the position and the question together means one
          announcement per card: moving on is a focus change, which every screen
          reader reports, rather than a silent swap of text. */}
      <div
        aria-labelledby={`${positionId} ${frontId}`}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ref={ref}
        role="group"
        tabIndex={-1}
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-lg [&_p]:m-0" id={frontId}>
              <Markdown>{card.front}</Markdown>
            </div>

            {/* Mounted empty from the first render, and never hidden: a live
                region that arrives with its text already in it has not changed,
                so nothing is announced. The region has to exist before the
                message does, which is why the spacing lives on the inner div. */}
            <div role="status">
              {flipped && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Answer
                  </p>
                  <Markdown className="mt-1.5">{card.back}</Markdown>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {flipped ? (
          <>
            <Button
              onClick={(event) => {
                // Never leave a grade control focused: the next Space would
                // activate it as well as flipping the card behind it.
                event.currentTarget.blur();
                onGrade(true);
              }}
            >
              <Check />
              Got it
            </Button>
            <Button
              onClick={(event) => {
                event.currentTarget.blur();
                onGrade(false);
              }}
              variant="outline"
            >
              <X />
              Missed
            </Button>
          </>
        ) : (
          <Button onClick={onFlip}>
            <Eye />
            Show the answer
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          <Kbd>Space</Kbd> flip · <Kbd>1</Kbd>/<Kbd>j</Kbd> got it · <Kbd>2</Kbd>/<Kbd>k</Kbd>{' '}
          missed
        </span>
      </div>
    </div>
  );
});

interface SummaryProps {
  deck: DeckDetail;
  missed: DeckCard[];
  onRerun: () => void;
  total: number;
}

const Summary = React.forwardRef<HTMLDivElement, SummaryProps>(function Summary(
  { deck, missed, onRerun, total },
  ref
) {
  const id = React.useId();
  const headingId = `${id}-heading`;
  const got = total - missed.length;

  return (
    <div className="space-y-6">
      <div
        aria-labelledby={headingId}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ref={ref}
        role="group"
        tabIndex={-1}
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-medium" id={headingId}>
              {got} of {total} on sight
            </h2>
            {missed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing to come back to. Nothing here was written down, so run it again whenever the
                distinction starts to feel slow.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    What you missed
                  </p>
                  <ul className="mt-2 space-y-2">
                    {missed.map((card) => (
                      <li className="border-l-2 border-muted pl-3 text-sm [&_p]:m-0" key={card.id}>
                        <Markdown>{card.front}</Markdown>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button onClick={onRerun}>
                  <RotateCcw />
                  Run the ones you missed ({missed.length})
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {(deck.page || deck.practiseLinks.length > 0) && (
        <Card>
          <CardContent className="space-y-4 p-5">
            {deck.page && (
              <div>
                <h2 className="text-sm font-semibold">The page these came from</h2>
                <Link
                  className="mt-3 flex items-center gap-2 text-sm hover:underline"
                  to={`/handbook/${deck.page.section}/${deck.page.slug}`}
                >
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                  {deck.page.title}
                </Link>
              </div>
            )}

            {deck.practiseLinks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold">Where to practise this</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {deck.practiseLinks.map((link) => (
                    <li key={`${link.kind}-${link.slug}`}>
                      <Link
                        className="flex items-center gap-2 hover:underline"
                        to={
                          link.kind === 'workout'
                            ? `/workouts/${link.slug}`
                            : `/problems/${link.slug}`
                        }
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <footer className="border-t pt-4 text-sm text-muted-foreground">
        <h2 className="font-medium text-foreground">Sources</h2>
        <ol className="mt-2 space-y-1">
          {deck.sources.map((source) => (
            <li key={source.url}>
              {source.author},{' '}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                {source.title}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs">
          Claims last checked against these sources on {deck.verified}.
        </p>
      </footer>
    </div>
  );
});
