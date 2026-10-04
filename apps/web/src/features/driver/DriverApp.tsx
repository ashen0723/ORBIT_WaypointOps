import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DriverShell } from './components/driver/DriverShell';
import { DriverProvider } from './contexts/DriverContext';
import { CurrentStop } from './pages/driver/CurrentStop';
import { DeliveryOutcome } from './pages/driver/DeliveryOutcome';
import { DriverDashboardLab } from './pages/driver/DriverDashboardLab';
import { NextStopPanel } from './pages/driver/NextStopPanel';
import { Profile } from './pages/driver/Profile';
import { ReportIssue } from './pages/driver/ReportIssue';
import { RouteWorkspace } from './pages/driver/RouteWorkspace';
import { SafeUse } from './pages/driver/SafeUse';
import { StopDetail } from './pages/driver/StopDetail';
import { Today } from './pages/driver/Today';
import { TripCheck } from './pages/driver/TripCheck';
import { TripComplete } from './pages/driver/TripComplete';

export function DriverApp({ basename }: {basename?: string;} = {}) {
  return (
    <DriverProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="safe-use" element={<SafeUse />} />
          <Route element={<DriverShell />}>
            <Route index element={<Today />} />
            <Route path="trips/:tripId/check" element={<TripCheck />} />
            <Route path="trips/:tripId/stops" element={<RouteWorkspace />}>
              <Route index element={<NextStopPanel />} />
              <Route path=":sequence" element={<StopDetail />} />
              <Route path=":sequence/delivery" element={<DeliveryOutcome />} />
            </Route>
            <Route path="trips/:tripId/complete" element={<TripComplete />} />
            <Route path="current-stop" element={<CurrentStop />} />
            <Route path="report-issue" element={<ReportIssue />} />
            <Route path="dashboard-lab" element={<DriverDashboardLab />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
    </DriverProvider>);

}