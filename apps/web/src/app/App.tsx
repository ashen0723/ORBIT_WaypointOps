import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LOGIN_PATH } from '@waypoint/contracts';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { RoleRouter, type RoleModules } from './RoleRouter';
import { Login } from '../features/dispatcher/pages/Login';
import { DispatcherApp } from '../features/dispatcher/live/DispatcherApp';
import { OperationsApp } from '../features/operations/OperationsApp';

const ROLE_MODULES: RoleModules = { dispatcher: DispatcherApp, store_manager: OperationsApp, loader: OperationsApp, driver: OperationsApp };

const LOGIN_TREE = (
  <BrowserRouter>
    <Routes>
      <Route path={LOGIN_PATH} element={<Login />} />
      <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
    </Routes>
  </BrowserRouter>
);

function SessionRoleRouter() {
  const { user } = useAuth();
  return <RoleRouter role={user?.role ?? null} userId={user?.id ?? null} modules={ROLE_MODULES} login={LOGIN_TREE} />;
}

export function App() {
  return (
    <AuthProvider>
      <SessionRoleRouter />
    </AuthProvider>
  );
}
