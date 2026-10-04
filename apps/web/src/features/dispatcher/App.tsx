import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { RequireRole } from './components/layout/RequireRole';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Orders } from './pages/Orders';
import { TripPlanning } from './pages/TripPlanning';
import { Loading } from './pages/Loading';
import { LoadingTrip } from './pages/LoadingTrip';
import { DeliveryMonitoring } from './pages/DeliveryMonitoring';
import { MonitoringTrip } from './pages/MonitoringTrip';
import { Deferrals } from './pages/Deferrals';
import { Vehicles } from './pages/Vehicles';
import { CapacityForecast } from './pages/CapacityForecast';
import { History } from './pages/History';
import { SystemChecks } from './pages/SystemChecks';
import { StoreOrders } from './pages/store/StoreOrders';
import { NewOrder } from './pages/store/NewOrder';
import { StoreOrderDetail } from './pages/store/StoreOrderDetail';
import { StoreHistory } from './pages/store/StoreHistory';
import { DriverTrips } from './pages/driver/DriverTrips';
import { DriverTrip } from './pages/driver/DriverTrip';
import type { Role } from './types/dispatch';

const only = (roles: Role[], el: React.ReactNode) => <RequireRole roles={roles}>{el}</RequireRole>;

// Merge note: SessionProvider now wraps the whole app in src/app/App.tsx, so it is no longer created here.
export function App({ basename }: {basename?: string;} = {}) {
  return (
    <>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={only(['dispatcher'], <Overview />)} />
            <Route path="orders" element={only(['dispatcher'], <Orders />)} />
            <Route path="planning" element={only(['dispatcher'], <TripPlanning />)} />
            <Route path="loading" element={only(['dispatcher', 'loader'], <Loading />)} />
            <Route path="loading/:tripId" element={only(['dispatcher', 'loader'], <LoadingTrip />)} />
            <Route path="monitoring" element={only(['dispatcher'], <DeliveryMonitoring />)} />
            <Route path="monitoring/:tripId" element={only(['dispatcher'], <MonitoringTrip />)} />
            <Route path="deferrals" element={only(['dispatcher'], <Deferrals />)} />
            <Route path="vehicles" element={only(['dispatcher'], <Vehicles />)} />
            <Route path="forecast" element={only(['dispatcher'], <CapacityForecast />)} />
            <Route path="history" element={only(['dispatcher'], <History />)} />
            <Route path="checks" element={only(['dispatcher'], <SystemChecks />)} />
            <Route path="driver" element={only(['driver'], <DriverTrips />)} />
            <Route path="driver/:tripId" element={only(['driver'], <DriverTrip />)} />
            <Route path="store" element={only(['store_manager'], <StoreOrders />)} />
            <Route path="store/new" element={only(['store_manager'], <NewOrder />)} />
            <Route path="store/history" element={only(['store_manager'], <StoreHistory />)} />
            <Route path="store/orders/:orderId" element={only(['store_manager'], <StoreOrderDetail />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
    </>);

}