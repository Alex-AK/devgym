import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { AboutPage } from '@/pages/AboutPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HandbookPage } from '@/pages/HandbookPage';
import { HandbookPageView } from '@/pages/HandbookPageView';
import { HowItTeachesPage } from '@/pages/HowItTeachesPage';
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
