import type {
  CardDeck,
  CardLibrary,
  HandbookPageRef,
  HandbookPractiseLink,
  HandbookSource,
  LibraryCard,
} from '@devgym/shared';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, Dumbbell, Eye, RotateCcw, Target, X } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys } from '@/lib/api';

export function CardsPage(): React.ReactElement {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.cards,
    queryFn: api.cards,
  });

  if (isPending) return <LoadingState label="Loading the cards…" />;
  if (error) return <ErrorState error={error} />;

  if (data.cards.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No cards yet. Add a deck under <code>packages/decks/content/</code>.
        </CardContent>
      </Card>
    );
  }

  return <Run library={data} />;
}

/**
 * Fisher-Yates, a fresh copy each time. In file order the run would open on the
 * same card every morning, which is the one thing a pile of near-identical
 * questions cannot afford.
 */
function shuffle(cards: LibraryCard[]): LibraryCard[] {
  const order = [...cards];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = order[i];
    const b = order[j];
    if (a && b) {
      order[i] = b;
      order[j] = a;
    }
  }
  return order;
}

/**
 * One pass over every card there is. Nothing is persisted, so a pass is React
 * state and closing the tab loses it: the reps a card cites are what carries
 * progress. A re-run is the same component with a shorter `cards`, which is why
 * missing one costs nothing more than seeing it again.
 */
function Run({ library }: { library: CardLibrary }): React.ReactElement {
  // Shuffled once, when the run starts. Re-shuffling on a refetch would move
  // the pile under someone mid-card.
  //
  // The whole library goes in, and there is no cap here on purpose. At 32 cards
  // that is a few minutes. Somewhere past a few hundred a run stops being
  // sittable before work, and the answer then is not a slice off the top of a
  // shuffle: it is deciding which cards a morning owes you, which needs
  // something written down about what you have already seen. A real change to
  // make at that point, not a number to pick now.
  const [cards, setCards] = React.useState<LibraryCard[]>(() => shuffle(library.cards));
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [missed, setMissed] = React.useState<LibraryCard[]>([]);
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
    // Not re-shuffled: what you missed is already a subsequence of a shuffled
    // pile, so a second shuffle would only cost you the order you met them in.
    setCards(missed);
    setMissed([]);
    setIndex(0);
    setFlipped(false);
    setPass((previous) => previous + 1);
  };

  // Land on the card, not on a control. A screen reader hears the position and
  // the question from the group's name; the back is a live region, announced
  // when it fills. preventScroll keeps the heading in view.
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
        <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pass === 1
            ? `All ${cards.length} cards, shuffled. You mark yourself, and nothing is written down.`
            : `Pass ${pass}: the ${cards.length} you missed.`}
        </p>
      </header>

      {done || !card ? (
        <Summary
          ref={stageRef}
          cards={cards}
          decks={library.decks}
          missed={missed}
          onRerun={rerun}
        />
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
  card: LibraryCard;
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
  /** What this pass ran, which is the whole library only on the first one. */
  cards: LibraryCard[];
  decks: CardDeck[];
  missed: LibraryCard[];
  onRerun: () => void;
}

const Summary = React.forwardRef<HTMLDivElement, SummaryProps>(function Summary(
  { cards, decks, missed, onRerun },
  ref
) {
  const id = React.useId();
  const headingId = `${id}-heading`;
  const total = cards.length;
  const got = total - missed.length;

  // A run crosses whichever decks the shuffle dealt from, so the reading and
  // the practice at the end are gathered rather than one deck's.
  const ran = decksBehind(cards, decks);

  // Miss something and the useful answer is the page behind that, not behind
  // all of it: four pages after a run you aced is a list nobody reads. So the
  // reading narrows to the decks you actually dropped cards from, and widens
  // back out to the whole run when there is nothing to diagnose.
  const behind = missed.length > 0 ? decksBehind(missed, decks) : ran;
  const pages = uniqueBy(
    behind.flatMap((deck) => (deck.page ? [deck.page] : [])),
    (page: HandbookPageRef) => `${page.section}/${page.slug}`
  );
  const practise = uniqueBy(
    behind.flatMap((deck) => deck.practiseLinks),
    (link: HandbookPractiseLink) => `${link.kind}/${link.slug}`
  );

  // Credit is for everything you were shown, missed or not, so the sources come
  // from the whole run rather than from the narrowed set.
  const sources = uniqueBy(
    ran.flatMap((deck) => deck.sources),
    (source: HandbookSource) => source.url
  );
  const checked = ran.map((deck) => deck.verified).sort();
  const oldest = checked[0];
  const newest = checked[checked.length - 1];

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
                      <li
                        className="border-l-2 border-muted pl-3 text-sm [&_p]:m-0"
                        key={`${card.deck}/${card.id}`}
                      >
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

      {(pages.length > 0 || practise.length > 0) && (
        <Card>
          <CardContent className="space-y-4 p-5">
            {pages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold">
                  {missed.length > 0
                    ? 'The pages behind what you missed'
                    : 'The pages these came from'}
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {pages.map((page) => (
                    <li key={`${page.section}/${page.slug}`}>
                      <Link
                        className="flex items-center gap-2 hover:underline"
                        to={`/handbook/${page.section}/${page.slug}`}
                      >
                        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {practise.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold">
                  {missed.length > 0 ? 'Where to practise those' : 'Where to practise these'}
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {practise.map((link) => (
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

      {sources.length > 0 && (
        <footer className="border-t pt-4 text-sm text-muted-foreground">
          <h2 className="font-medium text-foreground">Sources</h2>
          <ol className="mt-2 space-y-1">
            {sources.map((source) => (
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
          {oldest && newest && (
            <p className="mt-3 text-xs">
              {oldest === newest
                ? `Claims last checked against these sources on ${oldest}.`
                : `Claims last checked against these sources between ${oldest} and ${newest}.`}
            </p>
          )}
        </footer>
      )}
    </div>
  );
});

/** The decks a set of cards came from, in library order, each one once. */
function decksBehind(cards: LibraryCard[], decks: CardDeck[]): CardDeck[] {
  const slugs = new Set(cards.map((card) => card.deck));
  return decks.filter((deck) => slugs.has(deck.slug));
}

/** First one wins, so a page or a rep cited by two decks is listed once. */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
