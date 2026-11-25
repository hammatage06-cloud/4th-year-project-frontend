import { useState } from "react";
import {
  Plus,
  Search,
  Boxes,
  CircleCheck,
  Loader,
  CircleAlert,
  ExternalLink,
  ChevronRight,
  GitBranch,
  History,
  Activity,
  Rocket,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { usePolling } from "../usePolling";
import { ACTIVE, errorMessage, fullDate, timeAgo } from "../format";
import StatusBadge from "../components/StatusBadge";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "progress", label: "In progress" },
  { id: "failed", label: "Failed" },
];

export default function Dashboard() {
  const [apps, setApps] = useState(null);
  const [recent, setRecent] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const refresh = async () => {
    try {
      const a = await api("/applications");
      setApps(a);
      const details = await Promise.all(
        a.slice(0, 8).map((item) =>
          api("/applications/" + item.id).then((detail) => ({
            ...detail,
            deployments: detail.deployments || [],
          })),
        ),
      );
      const history = details
        .flatMap((item) =>
          item.deployments.map((deployment) => ({
            ...deployment,
            appId: item.id,
            appName: item.name,
          })),
        )
        .sort((x, y) => new Date(y.queued_at) - new Date(x.queued_at));
      setRecent(history.slice(0, 5));
      setActivity(history.slice(0, 4).map((item) => ({
        id: item.id,
        appId: item.appId,
        appName: item.appName,
        status: item.status,
        at: item.finished_at || item.queued_at,
      })));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  usePolling(refresh, 1e4);
  const list = apps || [];
  const count = (s) => list.filter((a) => a.status === s).length;
  const inProgress = list.filter((a) => ACTIVE.includes(a.status)).length;
  const shown = list.filter((a) => {
    const q = query.trim().toLowerCase();
    if (q && !(a.name.includes(q) || a.repo.toLowerCase().includes(q))) return false;
    if (filter === "running") return a.status === "RUNNING";
    if (filter === "progress") return ACTIVE.includes(a.status) || a.status === "DELETING";
    if (filter === "failed") return a.status === "FAILED" || a.status === "DELETE_FAILED";
    return true;
  });
  const stats = [
    { label: "Total projects", value: list.length, icon: Boxes, tone: "neutral" },
    { label: "Active deployments", value: inProgress, icon: Loader, tone: "warn" },
    { label: "Healthy applications", value: count("RUNNING"), icon: CircleCheck, tone: "ok" },
    { label: "Needs attention", value: count("FAILED"), icon: CircleAlert, tone: "danger" },
  ];
  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Workspace overview</span>
          <h1 className="page-title">Your deployments, at a glance.</h1>
          <p className="muted">
            Track project health, recent activity, and deployment progress from one place.
          </p>
        </div>
        <Link className="btn btn--primary" to="/deploy/new"><Plus size={17} /> New deployment</Link>
      </header>

      <section className="stats">
        {stats.map((s) => (
          <div key={s.label} className={"stat stat--" + s.tone}>
            <span className="stat__icon">
              <s.icon size={18} />
            </span>
            <div>
              <span className="stat__value">{apps ? s.value : "\u2013"}</span>
              <span className="stat__label">{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      {error && <p className="alert alert--danger">{error}</p>}

      <section className="panel">
        <div className="toolbar">
          <div className="input-icon toolbar__search">
            <Search size={16} />
            <input
              className="input"
              placeholder="Search by name or repository"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={"chip" + (filter === f.id ? " is-on" : "")}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {apps === null && (
          <div className="app-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton skeleton--row" />
            ))}
          </div>
        )}

        {apps && list.length === 0 && (
          <div className="empty">
            <div className="empty__art">
              <Rocket size={26} />
            </div>
            <h3>No applications yet</h3>
            <p>
              Connect a GitHub repository and DeployHub will guide you through configuring and launching it.
            </p>
            <Link className="btn btn--primary" to="/deploy/new"><Plus size={16} /> Deploy your first app</Link>
          </div>
        )}

        {apps && list.length > 0 && shown.length === 0 && (
          <div className="empty empty--inline">
            <Search size={20} />
            <p>No applications match this filter.</p>
          </div>
        )}

        {shown.length > 0 && (
          <div className="app-list">
            <div className="app-row app-row--head">
              <span>Application</span>
              <span>Status</span>
              <span>URL</span>
              <span>Created</span>
              <span />
            </div>
            {shown.map((a) => (
              <Link key={a.id} to={"/apps/" + a.id} className="app-row">
                <span className="app-row__name">
                  <span className="app-mark">{a.name.slice(0, 2)}</span>
                  <span>
                    <strong>{a.name}</strong>
                    <span className="app-row__repo">
                      {a.repo}
                      <GitBranch size={12} />
                      {a.branch}
                    </span>
                  </span>
                </span>
                <span>
                  <StatusBadge status={a.status} />
                </span>
                <span className="app-row__url">
                  {a.url ? (
                    <span
                      role="link"
                      tabIndex={0}
                      className="link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(a.url || "", "_blank", "noreferrer");
                      }}
                    >
                      {a.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
                    </span>
                  ) : (
                    <span className="muted">not deployed</span>
                  )}
                </span>
                <span className="muted" title={fullDate(a.created_at)}>
                  {timeAgo(a.created_at)}
                </span>
                <ChevronRight size={18} className="app-row__chev" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-recent">
        <section className="panel">
          <div className="panel__title"><History size={16} /> Deployment history</div>
          {recent.length ? <div className="recent-list">{recent.map((item) => <Link key={item.id + "-" + item.appId} to={`/apps/${item.appId}`} className="recent-row">
            <span className="recent-row__icon"><History size={15} /></span><span className="recent-row__main"><strong>{item.appName}</strong><small>Deployment #{item.id} · {timeAgo(item.queued_at)}</small></span><StatusBadge status={item.status} /><ChevronRight size={15} className="recent-row__chev" />
          </Link>)}</div> : <p className="muted recent-empty">{apps ? "No deployments yet. Launch a project to see its history here." : "Loading deployment history..."}</p>}
        </section>
        <section className="panel">
          <div className="panel__title"><Activity size={16} /> Recent activity</div>
          {activity.length ? <div className="activity-list">{activity.map((item) => <div key={item.id + "-" + item.appId} className="activity-row">
            <span className={"activity-dot" + (item.status === "FAILED" ? " is-failed" : item.status === "RUNNING" ? " is-live" : "")} />
            <div><strong>{item.appName}</strong><span>{item.status === "RUNNING" ? "deployment went live" : item.status === "FAILED" ? "deployment failed" : `deployment ${item.status.toLowerCase()}`}</span></div>
            <time>{timeAgo(item.at)}</time>
          </div>)}</div> : <p className="muted recent-empty">Activity will appear when deployments start.</p>}
        </section>
      </div>
    </>
  );
}
