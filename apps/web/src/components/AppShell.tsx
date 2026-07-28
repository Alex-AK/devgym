import { Dumbbell } from 'lucide-react';
import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/session', label: 'Session', end: false },
  { to: '/practice', label: 'Practice', end: false },
  { to: '/problems', label: 'Problems', end: false },
];

export function AppShell(): React.ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Dumbbell className="size-5 text-primary" />
            devgym
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
