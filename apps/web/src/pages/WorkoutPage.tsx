import type { WorkoutCheckpointResult, WorkoutDetail, WorkoutFile } from '@devgym/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { CodeEditor, type CodeEditorHandle } from '@/components/CodeEditor';
import { DiffView } from '@/components/DiffView';
import { HandbookLinks } from '@/components/HandbookLinks';
import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';
import { languageForPath } from '@/lib/editor-language';
import { cn } from '@/lib/utils';

export function WorkoutPage(): React.ReactElement {
  const { slug = '' } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.workout(slug),
    queryFn: () => api.workout(slug),
    enabled: slug.length > 0,
  });

  if (isPending) return <LoadingState label="Loading workout…" />;
  if (error) return <ErrorState error={error} />;

  return data.attempt ? (
    <WorkoutIde key={data.attempt.id} slug={slug} detail={data} />
  ) : (
    <WorkoutIntro
      detail={data}
      onStart={async () => {
        const started = await api.startWorkout(slug);
        queryClient.setQueryData(queryKeys.workout(slug), started);
      }}
    />
  );
}

function WorkoutIntro({
  detail,
  onStart,
}: {
  detail: WorkoutDetail;
  onStart: () => Promise<void>;
}): React.ReactElement {
  const [starting, setStarting] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/library/workouts" className="text-sm text-muted-foreground hover:underline">
          ← Workouts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{detail.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(detail.stack).map(([part, value]) => (
            <Badge key={part} variant="muted" title={part}>
              {value}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Markdown>{detail.brief}</Markdown>
          <HandbookLinks slug={detail.slug} className="mt-6 border-t pt-4" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          disabled={starting}
          onClick={() => {
            setStarting(true);
            void onStart().finally(() => setStarting(false));
          }}
        >
          <Play />
          Start the {detail.minutes} minute clock
        </Button>
        <span className="text-sm text-muted-foreground">
          {detail.checkpointCount} checkpoints. Partial progress counts.
        </span>
      </div>
    </div>
  );
}

function WorkoutIde({ slug, detail }: { slug: string; detail: WorkoutDetail }): React.ReactElement {
  const queryClient = useQueryClient();
  const attempt = detail.attempt;
  const editorRef = React.useRef<CodeEditorHandle>(null);

  const [files, setFiles] = React.useState<WorkoutFile[]>(attempt?.files ?? []);
  const [activePath, setActivePath] = React.useState(files[0]?.path ?? '');
  const [run, setRun] = React.useState(attempt?.lastRun ?? null);
  // Three ways to look at the same file. `diff` is the one the review after the
  // timer wants: reading two files in turn is not comparing them.
  const [view, setView] = React.useState<'mine' | 'diff' | 'reference'>('mine');
  const [solution, setSolution] = React.useState<WorkoutFile[] | null>(detail.solution);

  const active = files.find((file) => file.path === activePath) ?? files[0];
  // The reference only ships the files it changes, so a missing one is a real
  // answer ("this file is already right") and not an empty editor.
  const reference = solution?.find((file) => file.path === activePath)?.contents ?? null;
  const shown =
    view === 'reference' ? (reference ?? active?.contents ?? '') : (active?.contents ?? '');

  const refresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.workouts });
  }, [queryClient]);

  // Save on a pause in typing. The workspace on disk is the source of truth for
  // the runner, so an unsaved buffer would grade the previous version.
  const pending = React.useRef<Map<string, string>>(new Map());
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const queued = [...pending.current.entries()];
      pending.current.clear();
      for (const [path, contents] of queued) {
        void api.saveWorkoutFile(slug, path, contents);
      }
    }, 400);
    return () => clearTimeout(timer);
  });

  function edit(contents: string): void {
    if (!active || view !== 'mine') return;
    setFiles((current) =>
      current.map((file) => (file.path === active.path ? { ...file, contents } : file))
    );
    pending.current.set(active.path, contents);
  }

  const runMutation = useMutation({
    mutationFn: async (checkpoint?: string) => {
      // Flush anything still in the debounce before grading.
      for (const [path, contents] of pending.current.entries()) {
        await api.saveWorkoutFile(slug, path, contents);
      }
      pending.current.clear();
      return api.runWorkout(slug, checkpoint);
    },
    onSuccess: async (result) => {
      setRun(result);
      if (result.passedCount === detail.checkpointCount) {
        const revealed = await api.revealWorkoutSolution(slug);
        setSolution(revealed.files);
      }
      await refresh();
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => api.finishWorkout(slug),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.workout(slug), updated);
      await refresh();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/library/workouts" className="text-sm text-muted-foreground hover:underline">
          ← Workouts
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{detail.title}</h1>
        {attempt && <Timer startedAt={attempt.startedAt} minutes={detail.minutes} />}
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => runMutation.mutate(undefined)} disabled={runMutation.isPending}>
            <Play />
            {runMutation.isPending ? 'Running…' : 'Run checkpoints'}
          </Button>
          <Button
            variant="outline"
            onClick={() => finishMutation.mutate()}
            disabled={finishMutation.isPending}
          >
            <Square />
            Finish
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1 border-b">
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setActivePath(file.path)}
                className={cn(
                  'rounded-t-md px-3 py-1.5 text-sm',
                  file.path === activePath
                    ? 'border-b-2 border-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {file.path.replace(/^src\//, '')}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pb-1">
              {solution && <ViewSwitch value={view} onChange={setView} />}
              <Button
                variant="ghost"
                className="h-7 text-xs"
                disabled={view !== 'mine'}
                onClick={() => {
                  void api.resetWorkoutFile(slug, activePath).then((result) => {
                    setFiles(result.files);
                  });
                }}
              >
                <RotateCcw />
                Reset file
              </Button>
            </div>
          </div>

          {view === 'reference' && (
            <p className="text-xs text-amber-700">
              {reference === null
                ? 'The reference leaves this file alone, so this is still your code.'
                : 'Showing the reference implementation. Edits here are not saved.'}
            </p>
          )}

          {view === 'diff' ? (
            <DiffView mine={active?.contents ?? ''} reference={reference} />
          ) : (
            active && (
              <CodeEditor
                key={`${activePath}-${view}`}
                ref={editorRef}
                value={shown}
                onChange={edit}
                language={languageForPath(activePath)}
                placeholder=""
                onSubmit={() => runMutation.mutate(undefined)}
                minHeight="34rem"
              />
            )
          )}
        </div>

        <div className="space-y-4">
          <CheckpointPanel
            results={run?.checkpoints ?? notRunYet(detail)}
            crashed={run?.crashed ?? null}
            running={runMutation.isPending}
            onRun={(checkpoint) => runMutation.mutate(checkpoint)}
          />
          <Card>
            <CardContent className="max-h-[22rem] overflow-y-auto p-5 text-sm">
              <Markdown>{detail.brief}</Markdown>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function notRunYet(detail: WorkoutDetail): WorkoutCheckpointResult[] {
  return detail.checkpoints.map((checkpoint) => ({
    id: checkpoint.id,
    title: checkpoint.title,
    ...(checkpoint.hint ? { hint: checkpoint.hint } : {}),
    status: 'not-run' as const,
    testsPassed: 0,
    testsTotal: 0,
    failure: null,
  }));
}

const VIEWS = [
  { value: 'mine', label: 'Mine' },
  { value: 'diff', label: 'Diff' },
  { value: 'reference', label: 'Reference' },
] as const;

function ViewSwitch({
  value,
  onChange,
}: {
  value: 'mine' | 'diff' | 'reference';
  onChange: (next: 'mine' | 'diff' | 'reference') => void;
}): React.ReactElement {
  return (
    <div className="flex items-center rounded-md border p-0.5">
      {VIEWS.map((entry) => (
        <button
          key={entry.value}
          type="button"
          onClick={() => onChange(entry.value)}
          className={cn(
            'rounded px-2 py-0.5 text-xs transition-colors',
            value === entry.value
              ? 'bg-secondary font-medium text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}

function CheckpointPanel({
  results,
  crashed,
  running,
  onRun,
}: {
  results: WorkoutCheckpointResult[];
  crashed: string | null;
  running: boolean;
  onRun: (checkpoint: string) => void;
}): React.ReactElement {
  const passed = results.filter((result) => result.status === 'passed').length;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Checkpoints</h2>
          <span className="text-sm text-muted-foreground">
            {passed} of {results.length}
          </span>
        </div>

        {crashed && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <p className="font-medium">The suite could not run.</p>
            <pre className="mt-1 break-words whitespace-pre-wrap">{crashed}</pre>
          </div>
        )}

        <ol className="space-y-3">
          {results.map((result) => (
            <li key={result.id} className="group space-y-1">
              <div className="flex items-start gap-2">
                {result.status === 'passed' ? (
                  <CheckCircle2
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-emerald-600',
                      result.stale && 'opacity-50'
                    )}
                  />
                ) : result.status === 'failed' ? (
                  <XCircle
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-rose-600',
                      result.stale && 'opacity-50'
                    )}
                  />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className={cn('text-sm', result.stale && 'text-muted-foreground')}>
                    {result.title}
                  </p>
                  {result.stale ? (
                    <p className="text-xs text-muted-foreground">Not re-run just now.</p>
                  ) : (
                    result.testsTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {result.testsPassed} of {result.testsTotal} assertions
                      </p>
                    )
                  )}
                </div>
                {/* One suite instead of the whole file set: the difference
                    between iterating on a failure and waiting for it. */}
                <button
                  type="button"
                  disabled={running}
                  onClick={() => onRun(result.id)}
                  className="ml-auto rounded px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 disabled:opacity-0"
                  title={`Run ${result.title} on its own`}
                >
                  Run
                </button>
              </div>
              {result.status === 'failed' && result.failure && (
                <pre className="ml-6 overflow-x-auto rounded bg-muted p-2 text-[11px] leading-relaxed whitespace-pre-wrap">
                  {result.failure}
                </pre>
              )}
              {result.status === 'failed' && result.hint && (
                <p className="ml-6 text-xs text-muted-foreground">{result.hint}</p>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Counts up, and keeps going past the target rather than nagging. */
function Timer({ startedAt, minutes }: { startedAt: string; minutes: number }): React.ReactElement {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const over = elapsed > minutes * 60;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <span
      className={cn(
        'rounded-md border px-2 py-0.5 font-mono text-sm tabular-nums',
        over ? 'border-amber-200 bg-amber-50 text-amber-800' : 'text-muted-foreground'
      )}
      title={over ? `Past the ${minutes} minute target — keep going and wrap it up` : undefined}
    >
      {mm}:{ss} / {minutes}:00
    </span>
  );
}
