import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { OrdersProvider } from './contexts/OrdersContext';
import { CutoffProvider } from './contexts/CutoffContext';
import { AppShell } from './components/layout/AppShell';
import { PlaceOrder } from './pages/PlaceOrder';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderStatus } from './pages/OrderStatus';
import { DeferralNotice } from './pages/DeferralNotice';
import { ConfirmReceipt } from './pages/ConfirmReceipt';
import { OrderHistory } from './pages/OrderHistory';
import { Settings } from './pages/Settings';
import { DashboardLab } from './pages/DashboardLab';
import { LoadingQueue } from './pages/LoadingQueue';
import { VehicleLoadDetail } from './pages/VehicleLoadDetail';
import { StopSequence } from './pages/StopSequence';
import { UpdatedStopSequence } from './pages/UpdatedStopSequence';
import { LoadingIssue } from './pages/LoadingIssue';
import { CompletedLoad } from './pages/CompletedLoad';
import { LoaderIssues } from './pages/LoaderIssues';
import { QueueLoadDetail } from './pages/QueueLoadDetail';
import { QueueCompletedLoad } from './pages/QueueCompletedLoad';
import { LoaderProvider } from './contexts/LoaderContext';
import { CUTOFF_SCENARIO_SECONDS } from './data/schedule';
interface AppProps {
  cutoffScenario?: 'normal' | 'under_hour' | 'past';
  basename?: string;
}
export function App({
  cutoffScenario = 'normal',
  basename
}: AppProps) {
  return <OrdersProvider>
      <CutoffProvider initialSeconds={CUTOFF_SCENARIO_SECONDS[cutoffScenario]}>
        <LoaderProvider>
          <BrowserRouter basename={basename}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/loader" replace />} />
                <Route path="loader" element={<LoadingQueue />} />
                <Route path="loader/issues" element={<LoaderIssues />} />
                <Route path="loader/veh014" element={<VehicleLoadDetail />} />
                <Route path="loader/veh014/stops" element={<StopSequence />} />
                <Route path="loader/:vehicleId/stops/updated" element={<UpdatedStopSequence />} />
                <Route path="loader/veh014/issue/:itemId" element={<LoadingIssue />} />
                <Route path="loader/veh014/issue" element={<LoadingIssue />} />
                <Route path="loader/veh014/complete" element={<CompletedLoad />} />
                <Route path="loader/:vehicleId/complete" element={<QueueCompletedLoad />} />
                <Route path="loader/:vehicleId" element={<QueueLoadDetail />} />
                <Route path="dashboard" element={<DashboardLab />} />
                <Route path="place-order" element={<PlaceOrder />} />
                <Route path="history" element={<OrderHistory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="orders/:orderId" element={<OrderStatus />} />
                <Route path="orders/:orderId/confirmation" element={<OrderConfirmation />} />
                <Route path="orders/:orderId/deferral" element={<DeferralNotice />} />
                <Route path="orders/:orderId/receipt" element={<ConfirmReceipt />} />
                <Route path="*" element={<Navigate to="/loader" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif'
          }
        }} />
        </LoaderProvider>
      </CutoffProvider>
    </OrdersProvider>;
}