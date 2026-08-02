import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { AboutPage } from '@/pages/AboutPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeckPage } from '@/pages/DeckPage';
import { DecksPage } from '@/pages/DecksPage';
import { HandbookPage } from '@/pages/HandbookPage';
import { HandbookPageView } from '@/pages/HandbookPageView';
import { HowItTeachesPage } from '@/pages/HowItTeachesPage';
import { ModulePage } from '@/pages/ModulePage';
import { ModulesPage } from '@/pages/ModulesPage';
import { PathPage } from '@/pages/PathPage';
import { PathsPage } from '@/pages/PathsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProblemPage } from '@/pages/ProblemPage';
import { ProblemsPage } from '@/pages/ProblemsPage';
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
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/:slug" element={<WorkoutPage />} />
        {/* The path is one route per hour. "Essentials" is what it is called
            to a reader; "path" is what it is called in the code and the API. */}
        <Route path="essentials" element={<PathsPage />} />
        <Route path="essentials/:slug" element={<PathPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/:slug" element={<ModulePage />} />
        {/* "Cards" is what a reader sees; "deck" is what the code and the API
            call it, the same split the essentials path already makes. */}
        <Route path="cards" element={<DecksPage />} />
        <Route path="cards/:slug" element={<DeckPage />} />
        <Route path="handbook" element={<HandbookPage />} />
        <Route path="handbook/:section/:slug" element={<HandbookPageView />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="how-it-teaches" element={<HowItTeachesPage />} />
        <Route path="problems/:slug" element={<ProblemPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
