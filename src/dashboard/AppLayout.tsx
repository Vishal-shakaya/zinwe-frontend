import { Suspense, useEffect, type ReactElement } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { DashIcon, type DashIconName } from "./components/DashIcon";
import "../styles/dashboard.css";

const NAV: ReadonlyArray<{ to: string; label: string; icon: DashIconName; end?: boolean }> = [
  { to: "/app", label: "Devices", icon: "pc", end: true },
  { to: "/app/rules", label: "Rules", icon: "shield" },
  { to: "/app/activity", label: "Activity", icon: "activity" },
];

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (name.trim() ? (parts[1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

/**
 * Owner dashboard shell: sidebar on desktop, a compact top bar with tabs on
 * phones. Pages render into <Outlet />.
 */
export default function AppLayout(): ReactElement {
  const { user, signOut } = useAuth();
  const { pathname, hash } = useLocation();

  // New page starts at the top; a hash (e.g. /app#add-pc) jumps to that section.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="dash">
      <a className="dash-skip" href="#dash-main">
        Skip to content
      </a>
      <aside className="dash__side">
        <div className="dash__top">
          <Link className="brand dash__brand" to="/app" aria-label="Zinwe dashboard home">
            zinwe<span className="brand__dot"></span>
          </Link>
          <button type="button" className="dash__logout dash__logout--top" onClick={signOut}>
            <DashIcon name="logout" />
            <span>Log out</span>
          </button>
        </div>

        <nav className="dash__nav" aria-label="Dashboard">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="dash__link">
              <DashIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dash__me">
          <span className="dash__avatar" aria-hidden="true">
            {user ? initials(user.full_name, user.email) : ""}
          </span>
          <div className="dash__who">
            <b>{user ? user.full_name || user.email : "Your account"}</b>
            <small>{user ? user.company || user.email : " "}</small>
          </div>
          <button type="button" className="dash__logout" onClick={signOut}>
            <DashIcon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="dash__main" id="dash-main" tabIndex={-1}>
        <div className="dash__inner">
          <Suspense
            fallback={
              <div className="dash-boot" role="status" aria-live="polite">
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
