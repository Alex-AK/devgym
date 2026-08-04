import { ChevronDown, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The two controls share a shape, so the filter row reads as one row. */
const CONTROL = 'h-9 rounded-md border py-1 text-sm shadow-sm';
const ACTIVE = 'border-primary/40 bg-accent text-accent-foreground';

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
        className={cn(CONTROL, 'appearance-none pr-8 pl-3', active ? ACTIVE : 'bg-card')}
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

/**
 * The same axis, several values at once. A native `<select multiple>` is the
 * wrong control for this: it shows as a scrolling box that never collapses, and
 * picking a second option means knowing to hold a modifier. So this is a button
 * that says what is picked and a panel of real checkboxes, which are what a
 * "some of these" question has always been made of, and it stays out of the way
 * when it is closed.
 *
 * Keyboard: the button opens on Enter or Space, focus lands on the first
 * checkbox, Space toggles, Tab walks the list, and Escape closes and hands focus
 * back to the button. Tabbing off the end closes it too, so the panel is never
 * left open behind you, and a click anywhere outside does the same.
 */
export function FilterMultiSelect<T extends string>({
  allLabel,
  label,
  onChange,
  options,
  selected,
}: {
  /** What the button reads when nothing is picked: "All categories (450)". */
  allLabel: string;
  label: string;
  onChange: (values: T[]) => void;
  options: Array<{ label: string; value: T }>;
  selected: readonly T[];
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    // Land on the first option: the panel is what you just asked for, so the
    // keyboard should be in it without a second keystroke.
    panelRef.current?.querySelector('input')?.focus();

    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // On the document rather than on the panel, so Escape closes it from
    // wherever focus has got to, and so the only elements carrying handlers here
    // are the ones a keyboard already knows how to reach.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const chosen = options.filter((option) => selected.includes(option.value));
  const summary =
    chosen.length === 0
      ? allLabel
      : chosen.length === 1
        ? (chosen[0]?.label ?? allLabel)
        : `${chosen[0]?.label ?? ''} +${chosen.length - 1}`;

  // Kept in the panel's own order rather than click order, so the URL this ends
  // up in reads the same whichever way round you picked them.
  const toggle = (value: T): void =>
    onChange(
      options
        .filter((option) =>
          option.value === value ? !selected.includes(value) : selected.includes(option.value)
        )
        .map((option) => option.value)
    );

  return (
    <div
      className="relative"
      // Tabbing off the end of the list leaves the panel behind, so close it.
      // A blur to nothing is a click on dead space, which pointerdown owns.
      onBlur={(event) => {
        if (!event.relatedTarget) return;
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      ref={rootRef}
    >
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={
          chosen.length === 0
            ? `${label}: ${allLabel}`
            : `${label}: ${chosen.map((option) => option.label).join(', ')}`
        }
        className={cn(
          CONTROL,
          'flex items-center gap-2 pr-2.5 pl-3',
          chosen.length > 0 ? ACTIVE : 'bg-card'
        )}
        onClick={() => setOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        <span className="max-w-48 truncate">{summary}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border bg-card p-1 shadow-lg"
          id={panelId}
          ref={panelRef}
          role="group"
        >
          {options.map((option) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              key={option.value}
            >
              <input
                checked={selected.includes(option.value)}
                className="size-3.5 accent-primary"
                onChange={() => toggle(option.value)}
                type="checkbox"
              />
              <span className="flex-1 truncate">{option.label}</span>
            </label>
          ))}
          {chosen.length > 0 && (
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-sm border-t px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              // Clearing removes this button, so hand focus somewhere real
              // first. The panel stays open: you cleared it to pick again.
              onClick={() => {
                buttonRef.current?.focus();
                onChange([]);
              }}
              type="button"
            >
              <X className="size-3.5" />
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
