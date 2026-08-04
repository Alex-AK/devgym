import * as React from 'react';

import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps): React.ReactElement {
  return (
    <div
      // Border, no shadow. A hairline on warm paper is enough separation, and
      // stacking both is what made every surface read as a Material panel.
      className={cn('rounded-xl border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps): React.ReactElement {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: DivProps): React.ReactElement {
  return <h3 className={cn('leading-none font-semibold tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: DivProps): React.ReactElement {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps): React.ReactElement {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps): React.ReactElement {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
