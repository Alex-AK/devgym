import type { AttemptResponse, ProblemDetail, ProblemType } from '@hone/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FlaskConical,
  Lightbulb,
  RotateCcw,
  SkipForward,
  Target,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CategoryBadge, DifficultyBadge, RelevanceBadge, StatusBadge } from '@/components/badges';
import { CodeEditor, type CodeEditorHandle } from '@/components/CodeEditor';
import { HandbookLinks } from '@/components/HandbookLinks';
import { Markdown } from '@/components/Markdown';
import { SchemaPanel } from '@/components/SchemaPanel';
import { ErrorState, LoadingState } from '@/components/states';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { api, queryKeys, scopeToParams } from '@/lib/api';
import { describeScope, isScoped, scopeFromSearch } from '@/lib/scope';
import { nextInSession, sessionPosition } from '@/lib/session';

const VERDICT_UI = {
  correct: { variant: 'success', icon: '✅', title: 'Correct' },
  close: { variant: 'warning', icon: '🟡', title: 'Close' },
  incorrect: { variant: 'danger', icon: '❌', title: 'Not close' },
} as const;

const PLACEHOLDER = {
  sql: 'SELECT …',
  'short-text': 'Type your answer…',
  explain: 'Explain in a sentence or two…',
  'js-code': 'Write your solution…',
  'ts-type': 'Write the type…',
} as const;

const EDITOR_ROWS = { sql: 8, 'short-text': 4, explain: 4, 'js-code': 14, 'ts-type': 12 } as const;

/** The types that get a real editor. Prose answers stay a plain textarea. */
const CODE_SHAPED = ['sql', 'js-code', 'ts-type'] as const;
const EDITOR_MIN_HEIGHT = { sql: '11rem', 'js-code': '20rem', 'ts-type': '14rem' } as const;
const EDITOR_LANGUAGE = { sql: 'sql', 'js-code': 'javascript', 'ts-type': 'typescript' } as const;

/** Both of the editor types prefill from a starter and can carry a setup block. */
const PREFILLED = ['js-code', 'ts-type'] as const;

function isCodeShaped(type: ProblemType): type is (typeof CODE_SHAPED)[number] {
  return (CODE_SHAPED as readonly ProblemType[]).includes(type);
}

function isPrefilled(type: ProblemType): boolean {
  return (PREFILLED as readonly ProblemType[]).includes(type);
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

export function ProblemPage(): React.ReactElement {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const scope = scopeFromSearch(searchParams);
  const scopeQuery = scopeToParams(scope).toString();
  const scoped = isScoped(scope);

  const [answer, setAnswer] = React.useState('');
  const [attempt, setAttempt] = React.useState<AttemptResponse | null>(null);
  const [revealed, setRevealed] = React.useState<{ solution: string; explanation: string } | null>(
    null
  );
  const [confirmingReset, setConfirmingReset] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editorRef = React.useRef<CodeEditorHandle>(null);

  // Only one of the two is mounted, depending on the problem type.
  const focusAnswer = React.useCallback((options?: { preventScroll?: boolean }) => {
    if (editorRef.current) editorRef.current.focus();
    else textareaRef.current?.focus(options);
  }, []);

  // Clear the previous problem's answer, verdict and reveal when the slug changes.
  // A `key` on the route element would be the idiomatic fix, but remounting also
  // resets the focus effect below, whose ordering the keyboard shortcuts rely on.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setAnswer('');
    setAttempt(null);
    setRevealed(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [slug]);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.problem(slug),
    queryFn: () => api.problem(slug),
    enabled: slug.length > 0,
  });

  // Code problems start from their signature so the function name matches the
  // tests. Only prefill an untouched editor, never overwrite what you typed. The
  // starter arrives with the query, so there is no render-time value to derive from.
  React.useEffect(() => {
    if (isPending || !data || !isPrefilled(data.type) || !data.starter) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswer((current) => (current.length > 0 ? current : (data.starter ?? '')));
  }, [data, isPending]);

  // Land in the answer box: typing is the primary action, and keeping focus
  // there stops the single-key shortcuts firing on stray keystrokes. Depends on
  // `isPending` because the textarea only mounts once the query resolves, and
  // preventScroll so the prompt above stays in view.
  React.useEffect(() => {
    if (isPending) return;
    focusAnswer({ preventScroll: true });
  }, [slug, isPending, focusAnswer]);

  const { data: activeSession } = useQuery({
    queryKey: queryKeys.activeSession,
    queryFn: api.activeSession,
    staleTime: 0,
  });
  // Session UI only takes over when this problem is actually part of it.
  const session =
    activeSession?.session && activeSession.session.items.some((item) => item.slug === slug)
      ? activeSession.session
      : null;

  const refreshEverything = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.progress }),
      queryClient.invalidateQueries({ queryKey: queryKeys.problems }),
      queryClient.invalidateQueries({ queryKey: queryKeys.problem(slug) }),
      queryClient.invalidateQueries({ queryKey: ['next-problem'] }),
      queryClient.invalidateQueries({ queryKey: ['session'] }),
    ]);
  }, [queryClient, slug]);

  const goTo = React.useCallback(
    (nextSlug: string | null | undefined) => {
      if (!nextSlug) {
        navigate(`/practice${scopeQuery ? `?${scopeQuery}` : ''}`);
        return;
      }
      navigate(`/problems/${nextSlug}${scopeQuery ? `?${scopeQuery}` : ''}`);
    },
    [navigate, scopeQuery]
  );

  const submit = useMutation({
    mutationFn: () => api.attempt(slug, answer),
    onSuccess: async (result) => {
      setAttempt(result);
      // Once it is solved there is nothing left to type, so hand the keyboard
      // back to the navigation shortcuts.
      if (result.verdict === 'correct') textareaRef.current?.blur();
      await refreshEverything();
    },
  });

  const skip = useMutation({
    mutationFn: () => api.skip(slug, scope),
    onSuccess: async (result) => {
      // Same rule as starting a session: refresh after the navigation, never
      // before it. Awaiting it here repaints this problem as skipped, queue
      // count and all, a beat before the page you are already leaving.
      if (session) {
        const fresh = (await api.activeSession()).session;
        const target = fresh ? nextInSession(fresh, slug, 'next') : null;
        navigate(target ? `/problems/${target}` : '/session');
      } else {
        goTo(result.next?.slug);
      }
      void refreshEverything();
    },
  });

  const reveal = useMutation({
    mutationFn: () => api.revealSolution(slug),
    onSuccess: async (result) => {
      setRevealed({ solution: result.solution, explanation: result.explanation });
      await refreshEverything();
    },
  });

  const reset = useMutation({
    mutationFn: () => api.reset(slug),
    onSuccess: async () => {
      setAnswer('');
      setAttempt(null);
      setRevealed(null);
      setConfirmingReset(false);
      await refreshEverything();
    },
  });

  const move = React.useCallback(
    async (direction: 'next' | 'prev') => {
      if (session) {
        // Inside a session, navigation stays within its pinned problems.
        const fresh = (await api.activeSession()).session ?? session;
        const target = nextInSession(fresh, slug, direction);
        navigate(target ? `/problems/${target}` : '/session');
        return;
      }
      const result = await api.next(slug, direction, scope);
      goTo(result.next?.slug);
    },
    [goTo, navigate, scope, session, slug]
  );

  const status = attempt?.status ?? data?.status ?? 'unseen';
  const solved = status === 'solved';
  const busy = submit.isPending || skip.isPending || reveal.isPending || reset.isPending;

  // Keep the keyboard listener stable while it always sees the latest state.
  const latest = React.useRef({
    move,
    skip: () => {},
    solved: false,
    busy: false,
    focusAnswer,
  });
  React.useEffect(() => {
    latest.current = { move, skip: () => skip.mutate(), solved, busy, focusAnswer };
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.key === 'Escape' && typing) {
        target.blur();
        return;
      }
      if (typing) return;

      if (event.key === '/') {
        event.preventDefault();
        latest.current.focusAnswer();
        return;
      }
      if (latest.current.busy) return;
      if (event.key === 'n') void latest.current.move('next');
      else if (event.key === 'p') void latest.current.move('prev');
      else if (event.key === 's' && !latest.current.solved) latest.current.skip();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!slug) return <ErrorState error={new Error('Missing problem slug')} />;
  if (isPending) return <LoadingState label="Loading problem…" />;
  if (error) return <ErrorState error={error} />;

  const hints = attempt?.revealedHints ?? data.revealedHints;
  const hintsTotal = attempt?.hintsTotal ?? data.hintsTotal;
  const attemptsCount = attempt?.attemptsCount ?? data.attemptsCount;
  const canReveal = attempt?.canRevealSolution ?? data.canRevealSolution;
  const solution = revealed?.solution ?? attempt?.solution ?? data.solution;
  const explanation = revealed?.explanation ?? attempt?.explanation ?? data.explanation;

  const onSubmit = (): void => {
    if (!busy && answer.trim().length > 0) submit.mutate();
  };

  return (
    <div className="space-y-5">
      {session ? (
        <div className="space-y-2 rounded-lg border bg-accent/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Target className="size-4 text-primary" />
            <span className="font-medium">
              Problem {sessionPosition(session, slug) ?? '?'} of {session.total}
            </span>
            <span className="text-muted-foreground">
              {session.solved} solved, {session.remaining} to go
            </span>
            <Link to="/session" className="ml-auto text-xs text-muted-foreground hover:underline">
              Session overview
            </Link>
          </div>
          <Progress
            value={
              session.total === 0 ? 0 : ((session.total - session.remaining) / session.total) * 100
            }
          />
        </div>
      ) : (
        scoped && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2 text-sm">
            <Target className="size-4 text-primary" />
            <span className="font-medium">Focused session</span>
            <span className="text-muted-foreground">{describeScope(scope)}</span>
            <Link to="/practice" className="ml-auto text-xs text-muted-foreground hover:underline">
              Exit session
            </Link>
          </div>
        )
      )}

      <Header detail={data} status={status} attemptsCount={attemptsCount} />

      <Card>
        <CardContent className="p-6">
          <Markdown>{data.prompt}</Markdown>
        </CardContent>
      </Card>

      {data.type === 'sql' && <SchemaPanel orderMatters={data.orderMatters === true} />}

      {/* Always visible rather than collapsed: the tests name these values, so a
          failing assertion is unreadable without them. They are short by design. */}
      {data.setup && (
        <Card>
          <CardContent className="space-y-2 p-6">
            <p className="text-xs text-muted-foreground">
              Already defined. Your solution and the tests can both use it.
            </p>
            <Markdown className="text-sm">
              {'```' + (data.type === 'ts-type' ? 'ts' : 'js') + '\n' + data.setup + '\n```'}
            </Markdown>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-6">
          {isCodeShaped(data.type) ? (
            <CodeEditor
              ref={editorRef}
              value={answer}
              onChange={setAnswer}
              language={EDITOR_LANGUAGE[data.type]}
              placeholder={PLACEHOLDER[data.type]}
              onSubmit={onSubmit}
              minHeight={EDITOR_MIN_HEIGHT[data.type]}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              spellCheck={false}
              autoComplete="off"
              placeholder={PLACEHOLDER[data.type]}
              rows={EDITOR_ROWS[data.type]}
              className="w-full resize-y rounded-md border bg-card px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSubmit} disabled={busy || answer.trim().length === 0}>
              {submit.isPending ? 'Grading…' : 'Submit'}
            </Button>
            <span className="mr-auto text-xs text-muted-foreground">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}+↵</Kbd> submit · <Kbd>Esc</Kbd> leave box · <Kbd>/</Kbd>{' '}
              focus · <Kbd>n</Kbd>/<Kbd>p</Kbd> move · <Kbd>s</Kbd> skip
            </span>
            <Button variant="outline" onClick={() => void move('prev')} disabled={busy}>
              <ChevronLeft />
              Previous
            </Button>
            <Button variant="outline" onClick={() => skip.mutate()} disabled={busy || solved}>
              <SkipForward />
              Skip
            </Button>
            <Button variant="outline" onClick={() => void move('next')} disabled={busy}>
              Next
              <ChevronRight />
            </Button>
          </div>
          {submit.error && <p className="text-sm text-rose-700">{submit.error.message}</p>}
        </CardContent>
      </Card>

      {attempt && (
        <Alert variant={VERDICT_UI[attempt.verdict].variant}>
          <AlertTitle className="flex items-center gap-2">
            <span aria-hidden>{VERDICT_UI[attempt.verdict].icon}</span>
            {VERDICT_UI[attempt.verdict].title}
          </AlertTitle>
          <AlertDescription>
            {/* Feedback carries markdown (`ORDER BY`, *all*), so render it as such. */}
            <Markdown className="text-sm">{attempt.feedback}</Markdown>
          </AlertDescription>
        </Alert>
      )}

      {attempt && attempt.tests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-muted-foreground" />
              Tests ({attempt.tests.filter((test) => test.passed).length}/{attempt.tests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {/* A near miss is a failure that got the shape right, so it reads
                amber: an answer that widened to `any` satisfies every
                assignability check and is still the wrong answer. */}
            {attempt.tests.map((test) => (
              <div key={test.name} className="flex gap-2.5 rounded-md px-2 py-1.5 text-sm">
                <span
                  aria-hidden
                  className={
                    test.passed
                      ? 'text-emerald-600'
                      : test.near
                        ? 'text-amber-600'
                        : 'text-rose-600'
                  }
                >
                  {test.passed ? '✓' : test.near ? '~' : '✗'}
                </span>
                <span className="flex-1">
                  <span className={test.passed ? 'text-muted-foreground' : 'font-medium'}>
                    {test.name}
                  </span>
                  {test.detail && (
                    <span
                      className={`mt-0.5 block font-mono text-xs ${
                        test.near ? 'text-amber-700' : 'text-rose-700'
                      }`}
                    >
                      {test.detail}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" />
              Hints ({hints.length}/{hintsTotal})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hints.map((hint, index) => (
              <div key={hint} className="flex gap-3 rounded-md bg-muted/60 p-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                <Markdown className="flex-1">{hint}</Markdown>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!solved && canReveal && !solution && (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => reveal.mutate()} disabled={busy}>
            <Eye />
            Reveal solution
          </Button>
          <span className="text-xs text-muted-foreground">
            This marks the problem skipped. It won&apos;t count as solved.
          </span>
        </div>
      )}

      {solution && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {solved ? 'Solution' : 'Solution (revealed)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Markdown>{solution}</Markdown>
            {explanation && (
              <div className="rounded-md border-l-2 border-primary bg-muted/50 p-4">
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Why
                </p>
                <Markdown>{explanation}</Markdown>
              </div>
            )}
            <HandbookLinks slug={data.slug} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void move('next')} disabled={busy}>
                Next problem
                <ArrowRight />
              </Button>
              {/* One click from "Next problem", and what it discards is a review
                  interval built over months that only re-solving can rebuild.
                  So it says what it costs, and asks twice. */}
              {confirmingReset ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => reset.mutate()}
                    disabled={busy}
                  >
                    Start over
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
                    Cancel
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Clears its attempts and drops it off the review ladder, as if you had never seen
                    it.
                  </span>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmingReset(true)} disabled={busy}>
                  <RotateCcw />
                  Start over…
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Header({
  detail,
  status,
  attemptsCount,
}: {
  detail: ProblemDetail;
  status: ProblemDetail['status'];
  attemptsCount: number;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <Link to="/library/problems" className="text-xs text-muted-foreground hover:underline">
        ← All problems
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{detail.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={detail.category} />
        <DifficultyBadge difficulty={detail.difficulty} />
        <RelevanceBadge relevance={detail.relevance} />
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground">
          {attemptsCount} attempt{attemptsCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
