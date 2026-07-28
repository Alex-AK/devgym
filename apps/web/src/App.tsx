import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProblemPage } from '@/pages/ProblemPage';
import { ProblemsPage } from '@/pages/ProblemsPage';
import { SessionPage } from '@/pages/SessionPage';

export function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="session" element={<SessionPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="problems/:slug" element={<ProblemPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
