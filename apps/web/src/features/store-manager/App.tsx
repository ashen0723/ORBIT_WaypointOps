import './live.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { OrdersProvider } from './contexts/OrdersContext';
import { CutoffProvider } from './contexts/CutoffContext';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { PlaceOrder } from './pages/PlaceOrder';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderStatus } from './pages/OrderStatus';
import { DeferralNotice } from './pages/DeferralNotice';
import { ConfirmReceipt } from './pages/ConfirmReceipt';
import { OrderHistory } from './pages/OrderHistory';
import { Settings } from './pages/Settings';
import { DashboardLab } from './pages/DashboardLab';
import { CUTOFF_SCENARIO_SECONDS } from './data/schedule';

interface AppProps {
  cutoffScenario?: 'normal' | 'under_hour' | 'past';
  basename?: string;
}

export function App({ cutoffScenario = 'normal', basename }: AppProps) {
  return (
    <OrdersProvider>
      <CutoffProvider initialSeconds={CUTOFF_SCENARIO_SECONDS[cutoffScenario]}>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<DashboardLab />} />
              <Route path="place-order" element={<PlaceOrder />} />
              <Route path="history" element={<OrderHistory />} />
              <Route path="settings" element={<Settings />} />
              <Route path="orders/:orderId" element={<OrderStatus />} />
              <Route path="orders/:orderId/confirmation" element={<OrderConfirmation />} />
              <Route path="orders/:orderId/deferral" element={<DeferralNotice />} />
              <Route path="orders/:orderId/receipt" element={<ConfirmReceipt />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
      </CutoffProvider>
    </OrdersProvider>);

}