import React, { useEffect, useReducer } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LOGIN_PATH, ROLE_BASE_PATH, type Role } from '@waypoint/contracts';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { resolveRoute } from './routes';
import { Login } from '../features/dispatcher/pages/Login';
import { App as DispatcherApp } from '../features/dispatcher/App';
import { App as StoreManagerApp } from '../features/store-manager/App';
import { App as LoaderApp } from '../features/loader/App';
import { DriverApp } from '../features/driver/DriverApp';

/** Each role's prototype keeps its own router; the root mounts exactly one of them under the role's base path. */
const ROLE_MODULE: Record<Role, React.ComponentType<{ basename?: string }>> = {
  dispatcher: DispatcherApp,
  store_manager: StoreManagerApp,
  loader: LoaderApp,
  driver: DriverApp,
};

function RoleRouter() {
  const { user } = useAuth();
  // Back/forward can leave the role's base path (e.g. back to /login); re-evaluate when that happens.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener('popstate', rerender);
    return () => window.removeEventListener('popstate', rerender);
  }, []);

  const decision = resolveRoute(user?.role ?? null, window.location.pathname);
  if (decision.redirectTo) window.history.replaceState(null, '', decision.redirectTo);

  if (decision.module === 'login') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path={LOGIN_PATH} element={<Login />} />
          <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const Module = ROLE_MODULE[decision.module];
  // key forces a fresh module (and fresh in-memory state) when a different user signs in on this tab.
  return <Module key={user?.id} basename={ROLE_BASE_PATH[decision.module]} />;
}

export function App() {
  return (
    <AuthProvider>
      <RoleRouter />
    </AuthProvider>
  );
}
