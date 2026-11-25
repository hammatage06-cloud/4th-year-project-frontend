import { useEffect, useState } from "react";
import { Boxes, LogOut, Shield, RotateCcw, FlaskConical, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUser, isAdmin, signOut } from "../api";
import { DEMO } from "../config";
import { resetDemo } from "../mock";
import Logo from "./Logo";

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUserState] = useState(null);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    setUserState(getUser());
    setAdmin(isAdmin());
  }, [pathname]);
  const logout = () => {
    signOut();
    navigate("/login");
  };
  const nav = [
    {
      to: "/dashboard",
      label: "Overview",
      icon: Boxes,
      active:
        pathname === "/dashboard" ||
        pathname.startsWith("/apps") ||
        (pathname.startsWith("/deploy") && pathname !== "/deploy/new"),
    },
    {
      to: "/deploy/new",
      label: "New deployment",
      icon: Plus,
      active: pathname === "/deploy/new",
    },
    ...(admin
      ? [
          {
            to: "/admin",
            label: "Cluster admin",
            icon: Shield,
            active: pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">
          <Logo />
          <span className="brand__name">DeployHub</span>
        </Link>

        <nav className="sidenav">
          <span className="sidenav__label">Workspace</span>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={"sidenav__item" + (item.active ? " is-active" : "")}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="cluster-chip">
            <span className="pulse" />
            <div>
              <strong>K3s lab cluster</strong>
              <span>single node · Traefik</span>
            </div>
          </div>
          {user && (
            <div className="user-card">
              <div className="avatar">{user.email.slice(0, 1).toUpperCase()}</div>
              <div className="user-card__meta">
                <strong title={user.email}>{user.email}</strong>
                <span>{user.role}</span>
              </div>
              <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="shell__main">
        {DEMO && (
          <div className="demo-bar">
            <FlaskConical size={15} />
            <span>
              Demo mode: the backend is simulated in your browser. Try a repo containing{" "}
              <code>no-dockerfile</code>, branch <code>nope</code>, or hello-web on port{" "}
              <code>4000</code> to see failures.
            </span>
            <button
              className="demo-bar__reset"
              onClick={() => {
                resetDemo();
                window.location.reload();
              }}
            >
              <RotateCcw size={13} /> Reset data
            </button>
          </div>
        )}
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
