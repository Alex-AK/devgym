import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * One labelled row of filter chips. The label column is wide enough for the
 * longest label we use ("DIFFICULTY"); anything narrower lets the text overflow
 * into the first chip. Shared so the session form and the problem list stay aligned.
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

/**
 * One axis, one control. Native on purpose: it is keyboard-navigable, it types
 * ahead to a category by name, and it costs no dependency.
 *
 * Chips are still right for an axis with four options. This is for the ones that
 * do not stop growing: category reached twenty-two and wrapped to four rows,
 * which made the quietest page in the app shout its filters at you.
 */
export function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}): React.ReactElement {
  const active = value !== 'all';

  return (
    <div className="relative">
      <select
        aria-label={label}
        className={cn(
          'h-9 appearance-none rounded-md border py-1 pr-8 pl-3 text-sm shadow-sm',
          active ? 'border-primary/40 bg-accent text-accent-foreground' : 'bg-card'
        )}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
