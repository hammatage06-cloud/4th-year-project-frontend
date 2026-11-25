import { useState } from "react";
import { Cpu, MemoryStick, RefreshCcw } from "lucide-react";
import { api } from "../api";
import { usePolling } from "../usePolling";

export default function PodsPanel({ id }) {
  const [pods, setPods] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loaded, setLoaded] = useState(false);
  usePolling(async () => {
    const [p, u] = await Promise.all([
      api("/applications/" + id + "/pods").catch(() => []),
      api("/applications/" + id + "/metrics").catch(() => []),
    ]);
    setPods(p);
    setUsage(u);
    setLoaded(true);
  }, 5e3);
  if (!loaded) return <div className="skeleton skeleton--block" />;
  if (pods.length === 0) {
    return (
      <div className="empty empty--inline">
        <RefreshCcw size={20} />
        <p>No pods yet. They appear once a deployment reaches the cluster.</p>
      </div>
    );
  }
  return (
    <div className="pod-grid">
      {pods.map((p) => {
        const u = usage.find((x) => x.name === p.name);
        const healthy = p.ready && p.phase === "Running";
        return (
          <div key={p.name} className={"pod" + (healthy ? "" : " pod--warn")}>
            <div className="pod__head">
              <span className={"pod__light" + (healthy ? " is-ok" : "")} />
              <code className="pod__name">{p.name}</code>
            </div>
            <dl className="pod__stats">
              <div>
                <dt>Phase</dt>
                <dd>{p.phase}</dd>
              </div>
              <div>
                <dt>Ready</dt>
                <dd>{p.ready ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Restarts</dt>
                <dd>{p.restarts}</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{p.reason || "-"}</dd>
              </div>
            </dl>
            <div className="pod__usage">
              <span>
                <Cpu size={14} /> {u ? u.cpu : "-"}
              </span>
              <span>
                <MemoryStick size={14} /> {u ? u.memory : "-"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
