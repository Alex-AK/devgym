import * as React from 'react';

import { Button } from '@/components/ui/button';

/**
 * One labelled row of filter chips. The label column is wide enough for the
 * longest label we use ("DIFFICULTY"); anything narrower lets the text overflow
 * into the first chip. Shared so the dashboard and the problem list stay aligned.
 */
export function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Button variant={active ? 'secondary' : 'ghost'} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}
