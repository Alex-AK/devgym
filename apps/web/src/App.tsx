import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { AboutPage } from '@/pages/AboutPage';
import { CardsPage } from '@/pages/CardsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HandbookPage } from '@/pages/HandbookPage';
import { HandbookPageView } from '@/pages/HandbookPageView';
import { HowItTeachesPage } from '@/pages/HowItTeachesPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { ModulePage } from '@/pages/ModulePage';
import { ModulesPage } from '@/pages/ModulesPage';
import { PathPage } from '@/pages/PathPage';
import { PathsPage } from '@/pages/PathsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProblemPage } from '@/pages/ProblemPage';
import { ProblemsPage } from '@/pages/ProblemsPage';
import { ProgressPage } from '@/pages/ProgressPage';
import { SessionPage } from '@/pages/SessionPage';
import { WorkoutPage } from '@/pages/WorkoutPage';
import { WorkoutsPage } from '@/pages/WorkoutsPage';

export function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="session" element={<SessionPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="progress" element={<ProgressPage />} />

        {/* Every list is a tab of the library, so the nav carries one slot
            rather than one per format. Detail routes keep their own top-level
            URLs: a link to a problem or a workout is the thing itself, not a
            place in the browse surface. */}
        <Route path="library" element={<LibraryPage />}>
          <Route index element={<Navigate to="/library/problems" replace />} />
          <Route path="problems" element={<ProblemsPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="modules" element={<ModulesPage />} />
          {/* "Essentials" is what the path is called to a reader; "path" is
              what it is called in the code and the API. */}
          <Route path="essentials" element={<PathsPage />} />
        </Route>

        <Route path="problems" element={<Navigate to="/library/problems" replace />} />
        <Route path="problems/:slug" element={<ProblemPage />} />
        <Route path="workouts" element={<Navigate to="/library/workouts" replace />} />
        <Route path="workouts/:slug" element={<WorkoutPage />} />
        <Route path="modules" element={<Navigate to="/library/modules" replace />} />
        <Route path="modules/:slug" element={<ModulePage />} />
        <Route path="essentials" element={<Navigate to="/library/essentials" replace />} />
        <Route path="essentials/:slug" element={<PathPage />} />

        {/* One route: /cards is the run itself, over every card there is.
            Decks are still how cards are written and checked, but choosing one
            was a decision the morning did not need. */}
        <Route path="cards" element={<CardsPage />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="handbook/:section/:slug" element={<HandbookPageView />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="how-it-teaches" element={<HowItTeachesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
