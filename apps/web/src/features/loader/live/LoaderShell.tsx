import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Bell,
  ClipboardCheck,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { Logo } from "../components/layout/Logo";
import { Avatar } from "../components/ui/Avatar";
import { CurvedLines } from "../components/ui/CurvedLines";

const navigation = [
  { to: "/", label: "Loading", accessible: "Loading queue", icon: Truck },
  {
    to: "/completed",
    label: "Completed",
    accessible: "Completed loads",
    icon: ClipboardCheck,
  },
  { to: "/issues", label: "Issues", accessible: "Issues", icon: TriangleAlert },
  {
    to: "/settings",
    label: "Settings",
    accessible: "Settings",
    icon: Settings,
  },
];
/** Presentation adapted from the supplied Loader ZIP; account and notifications use live state. */
export function LoaderShell({
  children,
  issueCount,
}: {
  children: ReactNode;
  issueCount: number;
}) {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const depot = user?.depotId ?? "Depot not assigned";
  return (
    <div className="loader-workspace">
      <a className="loader-skip" href="#loader-content">
        Skip to content
      </a>
      {menu && (
        <button
          className="loader-backdrop"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`loader-sidebar ${menu ? "is-open" : ""}`}>
        <div className="loader-brand">
          <Logo />
          <button
            className="loader-mobile-toggle"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Loader navigation">
          <p className="loader-nav-label">Menu</p>
          {navigation.map(({ to, label, accessible, icon: Icon }, i) => (
            <div key={to}>
              {i === 3 && <p className="loader-nav-label">General</p>}
              <NavLink
                end={to === "/"}
                to={to}
                aria-label={accessible}
                onClick={() => setMenu(false)}
              >
                <Icon size={20} />
                {label}
              </NavLink>
            </div>
          ))}
          <button onClick={logout}>
            <LogOut size={20} />
            Log out
          </button>
        </nav>
        <div className="loader-promo">
          <CurvedLines className="text-white/10" />
          <span className="loader-promo-icon">
            <Smartphone size={20} />
          </span>
          <h2>
            Get the Waypoint
            <br />
            mobile app
          </h2>
          <p>Manage loading right on the floor</p>
          <details>
            <summary>How to install</summary>
            <p>
              Open Waypoint on your phone and choose “Add to Home Screen” from
              your browser menu.
            </p>
          </details>
        </div>
      </aside>
      <div className="loader-body">
        <header className="loader-topbar">
          <button
            className="loader-mobile-toggle"
            aria-label="Open menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <span className="loader-role">
            <strong>Loader</strong> · {depot}
          </span>
          <div className="loader-account">
            <details className="loader-notifications">
              <summary aria-label="Loading notifications">
                <Bell size={22} />
                {issueCount > 0 && <span>{issueCount}</span>}
              </summary>
              <div>
                <strong>Loading updates</strong>
                <p>
                  {issueCount
                    ? `${issueCount} unresolved loading issues in this view.`
                    : "No unresolved loading issues in this view."}
                </p>
                <Link to="/issues">View loading issues</Link>
              </div>
            </details>
            <Link className="loader-profile" to="/settings">
              <Avatar name={user?.name ?? "Loader"} />
              <span>
                <strong>{user?.name}</strong>
                <small>Loader · {depot}</small>
              </span>
            </Link>
          </div>
        </header>
        <main id="loader-content" className="loader-panel">
          {children}
        </main>
      </div>
    </div>
  );
}
