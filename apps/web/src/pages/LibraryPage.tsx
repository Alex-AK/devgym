import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const TABS = [
  { to: '/library/problems', label: 'Problems' },
  { to: '/library/workouts', label: 'Workouts' },
  { to: '/library/modules', label: 'Modules' },
  { to: '/library/essentials', label: 'Essentials' },
];

/**
 * One place to dig, so the nav does not have to carry a slot per format. The
 * daily session picks for you and this is where you pick instead, which is why
 * it is a browse surface rather than a second front door: it sits behind a
 * deliberate click, and nothing in a morning routes through it.
 *
 * Cards are not a tab. There is nothing to list, because a run is the whole
 * library shuffled and choosing a deck was refused; it lives on Today.
 */
export function LibraryPage(): React.ReactElement {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="measure mt-2 text-sm text-muted-foreground">
          Everything there is to practise, when you want something in particular rather than
          whatever the queue deals you.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
