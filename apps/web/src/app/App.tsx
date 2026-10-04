import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LOGIN_PATH } from '@waypoint/contracts';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { RoleRouter, type RoleModules } from './RoleRouter';
import { Login } from '../features/dispatcher/pages/Login';
import { App as DispatcherApp } from '../features/dispatcher/App';
import { App as StoreManagerApp } from '../features/store-manager/App';
import { App as LoaderApp } from '../features/loader/App';
import { DriverApp } from '../features/driver/DriverApp';

/** Each role's prototype keeps its own router; the root mounts exactly one of them under the role's base path. */
const ROLE_MODULES: RoleModules = {
  dispatcher: DispatcherApp,
  store_manager: StoreManagerApp,
  loader: LoaderApp,
  driver: DriverApp,
};

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
