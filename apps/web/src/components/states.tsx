import { AlertCircle, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LoadingState({ label = 'Loading…' }: { label?: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }): React.ReactElement {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <Alert variant="danger" className="my-8">
      <AlertCircle />
      <AlertTitle>Couldn&apos;t load that</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
