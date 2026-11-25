import { useState } from "react";
import { Server, Layers, Cpu, MemoryStick, ShieldAlert } from "lucide-react";
import { api } from "../api";
import { usePolling } from "../usePolling";
import { errorMessage, fullDate, timeAgo } from "../format";
import StatusBadge from "../components/StatusBadge";

function parseUsage(usage) {
  return usage
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", cpu = "", cpuPct = "", mem = "", memPct = ""] = line.trim().split(/\s+/);
      return {
        name,
        cpu,
        cpuPct: parseInt(cpuPct, 10) || 0,
        mem,
        memPct: parseInt(memPct, 10) || 0,
      };
    });
}

function Meter({ value }) {
  const tone = value > 85 ? "danger" : value > 65 ? "warn" : "ok";
  return (
    <div className={"meter meter--" + tone}>
      <span style={{ width: Math.min(100, value) + "%" }} />
    </div>
  );
}

export default function Admin() {
  const [cluster, setCluster] = useState(null);
  const [deps, setDeps] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  usePolling(() => {
    api("/admin/cluster")
      .then((c) => {
        setCluster(c);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
    api("/admin/deployments")
      .then(setDeps)
      .catch(() => {});
    api("/admin/audit")
      .then(setAudit)
      .catch(() => {});
  }, 1e4);
  const usage = cluster ? parseUsage(cluster.usage) : [];
  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Administration</span>
          <h1 className="page-title">Cluster admin</h1>
          <p className="muted">
            Node health, every deployment on the platform and the audit trail.
          </p>
        </div>
      </header>

      {error && (
        <p className="alert alert--danger">
          <ShieldAlert size={16} /> {error}
        </p>
      )}

      <section className="admin-grid">
        <div className="panel">
          <div className="panel__title">
            <Server size={16} /> Nodes
          </div>
          {cluster ? (
            cluster.nodes.map((n) => (
              <div key={n.name} className="node">
                <span className={"pod__light" + (n.ready ? " is-ok" : "")} />
                <div>
                  <strong className="mono">{n.name}</strong>
                  <span className="muted">{n.version}</span>
                </div>
                <span className={"tag" + (n.ready ? " tag--ok" : " tag--danger")}>
                  {n.ready ? "Ready" : "NOT READY"}
                </span>
              </div>
            ))
          ) : (
            <div className="skeleton skeleton--row" />
          )}
        </div>

        <div className="panel panel--center">
          <div className="panel__title">
            <Layers size={16} /> Managed namespaces
          </div>
          <span className="big-number">{cluster ? cluster.managedNamespaces : "\u2013"}</span>
          <span className="muted">labelled app.kubernetes.io/managed-by=deployhub</span>
        </div>

        <div className="panel">
          <div className="panel__title">
            <Cpu size={16} /> Node usage
          </div>
          {usage.length === 0 && <p className="muted">No node metrics.</p>}
          {usage.map((u) => (
            <div key={u.name} className="usage">
              <div className="usage__row">
                <span>
                  <Cpu size={14} /> CPU <code>{u.cpu}</code>
                </span>
                <strong>{u.cpuPct}%</strong>
              </div>
              <Meter value={u.cpuPct} />
              <div className="usage__row">
                <span>
                  <MemoryStick size={14} /> Memory <code>{u.mem}</code>
                </span>
                <strong>{u.memPct}%</strong>
              </div>
              <Meter value={u.memPct} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__title">Recent deployments</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>App</th>
                <th>Status</th>
                <th>Queued</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {deps.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.id}</td>
                  <td className="mono">{d.name}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td title={fullDate(d.queued_at)}>{timeAgo(d.queued_at)}</td>
                  <td className="table__detail text-danger">
                    {d.error ? d.error.split("\n")[0] : ""}
                  </td>
                </tr>
              ))}
              {deps.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No deployments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__title">Audit log</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={i}>
                  <td title={fullDate(a.at)}>{timeAgo(a.at)}</td>
                  <td className="mono">#{a.user_id ?? "-"}</td>
                  <td>
                    <span className="tag tag--mono">{a.action}</span>
                  </td>
                  <td className="mono">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
