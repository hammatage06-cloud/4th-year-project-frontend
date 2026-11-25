import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Rocket,
  Trash2,
  GitBranch,
  Github,
  History,
  Activity,
  ScrollText,
  Power,
  RotateCcw,
  Settings,
  Save,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { usePolling } from "../usePolling";
import { BUSY, duration, errorMessage, fullDate, timeAgo } from "../format";
import StatusBadge from "../components/StatusBadge";
import Pipeline from "../components/Pipeline";
import PodsPanel from "../components/PodsPanel";
import LogsPanel from "../components/LogsPanel";
import Modal from "../components/Modal";

const TABS = [
  { id: "history", label: "Deployment history", icon: History },
  { id: "pods", label: "Pods and resources", icon: Activity },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "config", label: "Configuration", icon: Settings },
];

export default function AppDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("history");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [config, setConfig] = useState(null);
  const [secrets, setSecrets] = useState([{ key: "", value: "" }]);
  const [saved, setSaved] = useState("");
  const refresh = () =>
    api("/applications/" + id)
      .then((a) => {
        setApp(a);
        if (a.status === "DELETED") navigate("/dashboard");
      })
      .catch((e) => setError(errorMessage(e)));
  usePolling(refresh, 3e3);
  useEffect(() => {
    if (app) {
      setConfig({
        framework: app.framework || "Auto-detect",
        build_command: app.build_command || "",
        start_command: app.start_command || "",
        port: String(app.port || 3000),
        profile: app.profile || "small",
      });
    }
  }, [app?.id]);
  async function deploy() {
    setError("");
    setWorking(true);
    try {
      await api("/applications/" + id + "/deploy", { method: "POST" });
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  async function lifecycleAction(action) {
    setError("");
    setSaved("");
    setWorking(true);
    try {
      await api(`/applications/${id}/${action}`, { method: "POST" });
      await refresh();
      setSaved(action === "stop" ? "Application stop queued." : "Application restart queued.");
    } catch (e) {
      setError(errorMessage(e));
    }
    finally {
      setWorking(false);
    }
  }
  async function saveConfig(e) {
    e.preventDefault();
    setError("");
    setSaved("");
    setWorking(true);
    const environment = Object.fromEntries(secrets.filter((item) => item.key && item.value).map((item) => [item.key, item.value]));
    try {
      await api(`/applications/${id}/config`, {
        method: "PATCH",
        body: { ...config, port: Number(config.port), environment },
      });
      setSecrets([{ key: "", value: "" }]);
      await refresh();
      setSaved("Configuration updated. Secret values are hidden and cannot be retrieved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  async function remove() {
    setError("");
    try {
      await api("/applications/" + id, { method: "DELETE" });
      setConfirming(false);
      navigate("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setConfirming(false);
    }
  }
  if (!app) {
    return (
      <>
        <Link to="/dashboard" className="back">
          <ArrowLeft size={16} /> Applications
        </Link>
        {error ? (
          <p className="alert alert--danger">{error}</p>
        ) : (
          <div className="skeleton skeleton--hero" />
        )}
      </>
    );
  }
  const busy = BUSY.includes(app.status) || working;
  const configValid =
    config &&
    Number.isInteger(Number(config.port)) &&
    Number(config.port) >= 1024 &&
    Number(config.port) <= 65535 &&
    secrets.every(
      (item) =>
        (!item.key && !item.value) ||
        (/^[A-Z_][A-Z0-9_]*$/.test(item.key) && Boolean(item.value)),
    );
  const latest = app.deployments[0];
  const meta = [
    { k: "Repository", v: app.repo, mono: true },
    { k: "Branch", v: app.branch, mono: true },
    { k: "Port", v: String(app.port), mono: true },
    { k: "Profile", v: app.profile, mono: false },
    { k: "Namespace", v: "dh-" + app.name, mono: true },
    { k: "Created", v: fullDate(app.created_at), mono: false },
  ];
  return (
    <>
      <Link to="/dashboard" className="back">
        <ArrowLeft size={16} /> Applications
      </Link>

      <header className="detail-head">
        <div className="detail-head__id">
          <span className="app-mark app-mark--lg">{app.name.slice(0, 2)}</span>
          <div>
            <div className="detail-head__title">
              <h1 className="page-title">{app.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <a
              className="detail-head__repo"
              href={"https://github.com/" + app.repo}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={14} /> {app.repo} <GitBranch size={13} /> {app.branch}
            </a>
          </div>
        </div>
        <div className="detail-head__actions">
          {app.url && (
            <a className="btn btn--ghost" href={app.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Open app
            </a>
          )}
          {app.status === "RUNNING" && <button className="btn btn--danger" disabled={busy} onClick={() => lifecycleAction("stop")}><Power size={16} /> Stop</button>}
          {app.status === "STOPPED" && <button className="btn btn--ghost" disabled={busy} onClick={() => lifecycleAction("restart")}><Power size={16} /> Start</button>}
          {app.status === "RUNNING" && <button className="btn btn--ghost" disabled={busy} onClick={() => lifecycleAction("restart")}><RotateCcw size={16} /> Restart</button>}
          <button className="btn btn--primary" disabled={busy} onClick={deploy}>
            <Rocket size={16} /> {app.deployments.length ? "Redeploy" : "Deploy"}
          </button>
          <button
            className="btn btn--danger"
            disabled={app.status === "DELETING"}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </header>

      {error && <p className="alert alert--danger">{error}</p>}
      {saved && <p className="alert alert--ok">{saved}</p>}

      <section className="url-bar">
        <span className="url-bar__label">Public URL</span>
        {app.url ? (
          <a href={app.url} target="_blank" rel="noreferrer" className="url-bar__link">
            {app.url} <ExternalLink size={14} />
          </a>
        ) : (
          <span className="muted">
            {app.status === "STOPPED"
              ? "This application is stopped. Start it to restore its live URL."
              : "Not deployed yet. The URL appears once a deployment is RUNNING."}
          </span>
        )}
      </section>

      <div className="detail-grid">
        <section className="panel">
          {latest ? (
            <Pipeline deployment={latest} />
          ) : (
            <div className="empty empty--inline">
              <Rocket size={20} />
              <p>This app has never been deployed. Press Deploy to queue the first build.</p>
            </div>
          )}
        </section>
        <section className="panel">
          <dl className="meta">
            {meta.map((m) => (
              <div key={m.k} className="meta__row">
                <dt>{m.k}</dt>
                <dd className={m.mono ? "mono" : ""}>{m.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="panel">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={"tab" + (tab === t.id ? " is-on" : "")}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "history" && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Queued</th>
                  <th>Duration</th>
                  <th>Build</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {app.deployments.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td title={fullDate(d.queued_at)}>{timeAgo(d.queued_at)}</td>
                    <td className="mono">{duration(d)}</td>
                    <td>
                      {d.run_url ? (
                        <a href={d.run_url} target="_blank" rel="noreferrer" className="link">
                          run ↗
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="table__detail">
                      {d.error ? (
                        <span className="text-danger">{d.error.split("\n")[0]}</span>
                      ) : (
                        <code>{d.image || "-"}</code>
                      )}
                    </td>
                  </tr>
                ))}
                {app.deployments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      No deployments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === "pods" && <PodsPanel id={id} />}
        {tab === "logs" && <LogsPanel id={id} />}
        {tab === "config" && config && (
          <form className="config-form" onSubmit={saveConfig}>
            <div className="config-form__intro"><div><h3>Build and runtime settings</h3><p className="muted">Update the settings used for the next deployment.</p></div><span className="tag">Secrets hidden</span></div>
            <div className="wizard__settings">
              <label className="field"><span className="field__label">Framework</span><input className="input" value={config.framework} onChange={(e) => setConfig({ ...config, framework: e.target.value })} /></label>
              <label className="field"><span className="field__label">Application port</span><input className="input input--mono" inputMode="numeric" value={config.port} onChange={(e) => setConfig({ ...config, port: e.target.value })} /></label>
              <label className="field"><span className="field__label">Build command</span><input className="input input--mono" value={config.build_command} onChange={(e) => setConfig({ ...config, build_command: e.target.value })} placeholder="npm run build" /></label>
              <label className="field"><span className="field__label">Start command</span><input className="input input--mono" value={config.start_command} onChange={(e) => setConfig({ ...config, start_command: e.target.value })} placeholder="npm start" /></label>
            </div>
            <div className="config-secrets"><div><h3>Environment variables</h3><p className="muted">Saved variable names are visible; values are write-only.</p></div>
              {(app.environment_keys || []).map((key) => <span className="tag tag--mono" key={key}>{key} <span aria-label="secret value hidden">••••••••</span></span>)}
              {!(app.environment_keys || []).length && <span className="muted">No environment variables saved.</span>}
            </div>
            <div className="env-list">{secrets.map((item, index) => <div className="env-row" key={index}>
              <label className="field"><span className="field__label">New variable name</span><input className="input input--mono" autoComplete="off" placeholder="API_KEY" value={item.key} onChange={(e) => setSecrets((current) => current.map((entry, i) => i === index ? { ...entry, key: e.target.value.toUpperCase() } : entry))} /></label>
              <label className="field"><span className="field__label">Secret value</span><input className="input input--mono" type="password" autoComplete="new-password" placeholder="Enter a new secret" value={item.value} onChange={(e) => setSecrets((current) => current.map((entry, i) => i === index ? { ...entry, value: e.target.value } : entry))} /></label>
              <button className="icon-btn" type="button" aria-label="Remove variable" onClick={() => setSecrets((current) => current.length === 1 ? [{ key: "", value: "" }] : current.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
            </div>)}</div>
            <button type="button" className="btn btn--ghost" onClick={() => setSecrets((current) => [...current, { key: "", value: "" }])}>Add environment variable</button>
            <div className="form__actions"><button type="submit" className="btn btn--primary" disabled={working || !configValid}><Save size={16} /> Save configuration</button></div>
          </form>
        )}
      </section>

      {confirming && (
        <Modal
          title={"Delete " + app.name + "?"}
          subtitle="This removes the namespace and all of its cluster resources. It cannot be undone."
          onClose={() => setConfirming(false)}
          width={480}
        >
          <div className="form">
            <label className="field">
              <span className="field__label">
                Type <code>{app.name}</code> to confirm
              </span>
              <input
                className="input input--mono"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
              />
            </label>
            <div className="form__actions">
              <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                className="btn btn--danger-solid"
                disabled={typed !== app.name}
                onClick={remove}
              >
                <Trash2 size={16} /> Delete application
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
