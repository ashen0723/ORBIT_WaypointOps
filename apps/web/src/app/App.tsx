import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LOGIN_PATH } from "@waypoint/contracts";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { RoleRouter, type RoleModules } from "./RoleRouter";
import { Login } from "./pages/Login";
import { Landing } from "./pages/Landing";
import { DispatcherApp } from "../features/dispatcher/live/DispatcherApp";
import { App as LoaderApp } from "../features/loader/App";
import { App as StoreManagerApp } from "../features/store-manager/App";

import { LiveDriverApp } from "../features/driver/LiveDriverApp";

const ROLE_MODULES: RoleModules = {
  dispatcher: DispatcherApp,
  store_manager: StoreManagerApp,
  loader: LoaderApp,
  driver: LiveDriverApp,
};

const PUBLIC_TREE = (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path={LOGIN_PATH} element={<Login />} />
      <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
    </Routes>
  </BrowserRouter>
);

function SessionRoleRouter() {
  const { user } = useAuth();
  return (
    <RoleRouter
      role={user?.role ?? null}
      userId={user?.id ?? null}
      modules={ROLE_MODULES}
      login={PUBLIC_TREE}
      landing={PUBLIC_TREE}
    />
  );
}

export function App() {
  return (
    <AuthProvider>
      <SessionRoleRouter />
    </AuthProvider>
  );
}
