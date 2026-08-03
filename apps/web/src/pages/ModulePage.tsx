import type { ModuleDetail, ModuleRunResponse, ModuleStep } from '@hone/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Dumbbell, Play, Target, X } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { CodeEditor } from '@/components/CodeEditor';
import { Markdown } from '@/components/Markdown';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

export function ModulePage(): React.ReactElement {
  const { slug = '' } = useParams();
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.module(slug),
    queryFn: () => api.module(slug),
  });

  if (isPending) return <LoadingState label="Loading the module…" />;
  if (error) return <ErrorState error={error} />;

  return <Steps module={data} />;
}

function Steps({ module: entry }: { module: ModuleDetail }): React.ReactElement {
  const [index, setIndex] = React.useState(0);
  // Edits survive moving between steps, because trying the next thing that
  // occurs to you is most of the point of the snippet being editable.
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [runs, setRuns] = React.useState<Record<string, ModuleRunResponse>>({});

  const step = entry.steps[index] as ModuleStep;
  const code = edits[step.id] ?? step.code;
  const run = runs[step.id];

  const mutation = useMutation({
    mutationFn: () => api.runModuleStep(entry.slug, step.id, code),
    onSuccess: (result) => setRuns((previous) => ({ ...previous, [step.id]: result })),
  });

  const go = (to: number): void => {
    mutation.reset();
    setIndex(to);
  };

  return (
    <article className="space-y-6">
      <header>
        <Link to="/library/modules" className="text-sm text-muted-foreground hover:underline">
          Modules
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{entry.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {index + 1} of {entry.steps.length} · {entry.minutes} min
        </p>
      </header>

      <div>
        <h2 className="text-lg font-medium">{step.title}</h2>
        <Card className="mt-3 border-primary/40">
          <CardContent className="p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Predict
            </p>
            <div className="mt-1.5 [&_p]:m-0">
              <Markdown>{step.predict}</Markdown>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Answer it before you run anything. Being wrong here is the part that works.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <CodeEditor
          value={code}
          onChange={(next) => setEdits((previous) => ({ ...previous, [step.id]: next }))}
          language="javascript"
          placeholder="The snippet for this step"
          onSubmit={() => mutation.mutate()}
          minHeight="8rem"
        />
        <div className="flex items-center gap-3">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Play className="size-4" />
            {mutation.isPending ? 'Running…' : 'Run'}
          </Button>
          <span className="text-sm text-muted-foreground">
            Change it and run it again. Nothing here is marked.
          </span>
        </div>
      </div>

      {run && <Outcome run={run} />}
      {run && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What is happening
            </p>
            <Markdown className="mt-2">{step.body}</Markdown>
          </CardContent>
        </Card>
      )}

      <nav className="flex items-center justify-between gap-4 border-t pt-4 text-sm">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft className="size-4" />
            {entry.steps[index - 1]?.title}
          </button>
        ) : (
          <span />
        )}
        {index < entry.steps.length - 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="ml-auto flex items-center gap-1.5 font-medium hover:underline"
          >
            {entry.steps[index + 1]?.title}
            <ArrowRight className="size-4" />
          </button>
        )}
      </nav>

      {index === entry.steps.length - 1 && <Ending module={entry} />}
    </article>
  );
}

function Outcome({ run }: { run: ModuleRunResponse }): React.ReactElement {
  return (
    <Card className={run.passed ? 'border-emerald-500/50' : 'border-amber-500/50'}>
      <CardContent className="space-y-3 p-4">
        {run.error ? (
          <p className="font-mono text-sm text-red-700">{run.error}</p>
        ) : (
          <ul className="space-y-1.5">
            {run.results.map((result) => (
              <li key={result.name} className="flex items-start gap-2 text-sm">
                {result.passed ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-red-600" />
                )}
                <span className="min-w-0">
                  <code className="break-words">{result.name}</code>
                  {result.detail && (
                    <span className="mt-0.5 block text-muted-foreground">{result.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {run.logs.length > 0 && (
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {run.logs.join('\n')}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function Ending({ module: entry }: { module: ModuleDetail }): React.ReactElement {
  return (
    <div className="space-y-6">
      {entry.practiseLinks.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Where to practise this</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {entry.practiseLinks.map((link) => (
                <li key={`${link.kind}-${link.slug}`}>
                  <Link
                    to={
                      link.kind === 'workout' ? `/workouts/${link.slug}` : `/problems/${link.slug}`
                    }
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
      )}

      <footer className="border-t pt-4 text-sm text-muted-foreground">
        <h2 className="font-medium text-foreground">Sources</h2>
        <ol className="mt-2 space-y-1">
          {entry.sources.map((source) => (
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
        <p className="mt-3 text-xs">
          Claims last checked against these sources on {entry.verified}.
        </p>
      </footer>
    </div>
  );
}
