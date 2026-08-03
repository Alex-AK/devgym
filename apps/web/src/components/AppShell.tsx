import { Dumbbell } from 'lucide-react';
import * as React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * Four, and they are the four questions someone arrives with: what am I doing
 * now, where is everything, what should I read, how am I doing. Every format
 * used to have a nav slot, which made a morning start with nine decisions and
 * buried the only one that matters. The formats are reachable from Today and
 * from the library instead.
 */
const LINKS = [
  { to: '/', label: 'Today', end: true },
  { to: '/library', label: 'Library', end: false },
  { to: '/handbook', label: 'Handbook', end: false },
  { to: '/progress', label: 'Progress', end: false },
];

export function AppShell(): React.ReactElement {
  // The workout IDE needs the room: editor and checkpoints side by side.
  const wide = /^\/workouts\/[^/]+/.test(useLocation().pathname);
  const container = wide ? 'max-w-[100rem]' : 'max-w-5xl';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card/85 backdrop-blur">
        <div className={cn('mx-auto flex h-14 items-center gap-6 px-4', container)}>
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Dumbbell className="size-5 text-primary" />
            devgym
          </NavLink>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className={cn('mx-auto px-4 py-8', container)}>
        <Outlet />
      </main>
      <footer className={cn('mx-auto px-4 pt-4 pb-8 text-xs text-muted-foreground', container)}>
        Content here is largely machine-written, and progressively reviewed through study sessions.{' '}
        <NavLink to="/about" className="underline underline-offset-2 hover:text-foreground">
          What this is, and what it owes to other people
        </NavLink>
        .
      </footer>
    </div>
  );
}
