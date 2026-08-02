import * as React from 'react';

import { cn } from '@/lib/utils';

/** A key in a shortcut legend. Two surfaces show one, so it lives here. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <kbd
      className={cn(
        'rounded border bg-muted px-1 font-mono text-[0.7rem] text-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}
