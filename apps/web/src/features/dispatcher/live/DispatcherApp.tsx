import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from '../../../components/shared/RequireRole';
import { DispatcherProvider } from './context';
import { OverviewProvider } from './overview-context';
import { DispatcherShell } from './DispatcherShell';
import { Dashboard } from './Overview';
import { OrdersPage, OperationsPage, TripsPage, VehiclesPage } from './ReadPages';
import { ForecastPage, ChecksPage } from './SupportPages';
import { PlanningWorkspace } from './PlanningWorkspace';
import { TripDetail } from './TripDetail';
import './dispatcher.css';
export function DispatcherApp({
  basename = "/dispatcher",
}: {
  basename?: string;
}) {
  return (
    <RequireRole roles={["dispatcher"]}>
      <BrowserRouter basename={basename}>
        <DispatcherProvider><OverviewProvider>
          <Routes>
            <Route element={<DispatcherShell />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<OrdersPage key="orders" />} />
              <Route path="planning" element={<PlanningWorkspace />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="trips/:tripId" element={<TripDetail />} />
              <Route
                path="deferred"
                element={<OrdersPage key="deferred" deferred />}
              />
              <Route path="operations" element={<OperationsPage />} />
              <Route path="loading" element={<OperationsPage mode="loading" />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="history" element={<OrdersPage key="history" history />} />
              <Route path="checks" element={<ChecksPage />} />
              <Route
                path="monitoring"
                element={<OperationsPage mode="monitoring" />}
              />
              <Route
                path="deferrals"
                element={<OrdersPage key="deferrals" deferred />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </OverviewProvider></DispatcherProvider>
      </BrowserRouter>
    </RequireRole>
  );
}