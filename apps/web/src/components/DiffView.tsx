import * as React from 'react';

import { collapseUnchanged, countChanges, diffLines } from '@/lib/diff';
import { cn } from '@/lib/utils';

/**
 * Your file against the reference, as a comparison rather than two files to
 * read in turn. Left is yours, right is the reference, so a removed line is
 * something you wrote that the reference does not have.
 */
export function DiffView({
  mine,
  reference,
  minHeight = '34rem',
}: {
  mine: string;
  reference: string | null;
  minHeight?: string;
}): React.ReactElement {
  const rows = React.useMemo(
    () => (reference === null ? [] : diffLines(mine, reference)),
    [mine, reference]
  );
  const entries = React.useMemo(() => collapseUnchanged(rows), [rows]);
  const changes = countChanges(rows);
  const identical = changes.added === 0 && changes.removed === 0;

  return (
    <div className="overflow-hidden rounded-md border" style={{ minHeight }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/50 px-3 py-2 text-xs">
        {reference === null ? (
          <span className="text-muted-foreground">The reference does not change this file.</span>
        ) : identical ? (
          <span className="text-muted-foreground">Identical to the reference.</span>
        ) : (
          <>
            <span className="text-rose-700 tabular-nums">−{changes.removed} yours</span>
            <span className="text-emerald-700 tabular-nums">+{changes.added} reference</span>
            <span className="text-muted-foreground">
              Left is what you wrote, right is the reference.
            </span>
          </>
        )}
      </div>

      {reference !== null && (
        <div className="overflow-x-auto font-mono text-[12px] leading-relaxed">
          {entries.map((entry, index) =>
            entry.kind === 'gap' ? (
              <div
                key={`gap-${index}`}
                className="border-y bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground select-none"
              >
                {entry.count} unchanged {entry.count === 1 ? 'line' : 'lines'}
              </div>
            ) : (
              <div
                key={`${entry.left ?? 'x'}-${entry.right ?? 'x'}-${index}`}
                className={cn(
                  'flex',
                  entry.kind === 'added' && 'bg-emerald-50',
                  entry.kind === 'removed' && 'bg-rose-50'
                )}
              >
                <span className="w-10 shrink-0 px-1 text-right text-muted-foreground tabular-nums select-none">
                  {entry.left ?? ''}
                </span>
                <span className="w-10 shrink-0 px-1 text-right text-muted-foreground tabular-nums select-none">
                  {entry.right ?? ''}
                </span>
                <span
                  className={cn(
                    'w-4 shrink-0 select-none',
                    entry.kind === 'added' && 'text-emerald-700',
                    entry.kind === 'removed' && 'text-rose-700',
                    entry.kind === 'same' && 'text-muted-foreground'
                  )}
                >
                  {entry.kind === 'added' ? '+' : entry.kind === 'removed' ? '−' : ' '}
                </span>
                <pre className="flex-1 pr-3 whitespace-pre">{entry.text || ' '}</pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
