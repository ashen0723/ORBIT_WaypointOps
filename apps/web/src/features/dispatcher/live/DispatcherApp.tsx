import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Route as RouteIcon,
  Truck,
  Waypoints,
} from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { RequireRole } from "../../../components/shared/RequireRole";
import { Button, ErrorPanel } from "../../../components/shared/ui";
import { DispatcherProvider, useDispatcher } from "./context";
import {
  Dashboard,
  OrdersPage,
  OperationsPage,
  TripsPage,
  VehiclesPage,
} from "./ReadPages";
import { PlanningWorkspace } from "./PlanningWorkspace";
import { TripDetail } from "./TripDetail";
import "./dispatcher.css";
const navigation = [
  ["/", "Dashboard", LayoutDashboard],
  ["/orders", "Orders Queue", ClipboardList],
  ["/planning", "Planning Workspace", RouteIcon],
  ["/vehicles", "Vehicle List", Truck],
  ["/trips", "Trips", Waypoints],
  ["/deferred", "Deferred Orders", CalendarClock],
  ["/operations", "Operations Status", Activity],
] as const;
export function DispatcherApp({
  basename = "/dispatcher",
}: {
  basename?: string;
}) {
  return (
    <RequireRole roles={["dispatcher"]}>
      <BrowserRouter basename={basename}>
        <DispatcherProvider>
          <Routes>
            <Route element={<Layout />}>
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
              <Route
                path="monitoring"
                element={<Navigate to="/operations" replace />}
              />
              <Route
                path="deferrals"
                element={<Navigate to="/deferred" replace />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </DispatcherProvider>
      </BrowserRouter>
    </RequireRole>
  );
}
function Layout() {
  const { user, logout } = useAuth(),
    { date, setDate, depotId, setDepotId, depots, depotError, refreshDepots } =
      useDispatcher();
  return (
    <div className="dispatcher-live">
      <a className="dispatch-skip" href="#dispatcher-main">
        Skip to content
      </a>
      <aside className="dispatch-sidebar">
        <NavLink to="/" className="dispatch-brand">
          <span className="dispatch-brand-mark">W</span>
          <span>
            WAYPOINT<small>Dispatcher workspace</small>
          </span>
        </NavLink>
        <nav aria-label="Dispatcher navigation">
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dispatch-sidebar-note">
          From order to receipt.
          <br />
          One shared operating plan.
        </div>
      </aside>
      <div className="dispatch-body">
        <header className="dispatch-topbar">
          <div className="dispatch-inline">
            <label>
              Run date
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </label>
            <label>
              Depot
              <select
                aria-label="Depot"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
              >
                <option value="">All depots</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="dispatch-inline">
            <span>{user?.name}</span>
            <Button variant="ghost" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </header>
        <main id="dispatcher-main" className="dispatch-content">
          <ErrorPanel error={depotError} retry={refreshDepots} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
