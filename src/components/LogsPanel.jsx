import { useMemo, useRef, useState, useEffect } from "react";
import { RefreshCw, Copy, Check, Search, ArrowDownToLine } from "lucide-react";
import { apiText } from "../api";
import { errorMessage } from "../format";
import { usePolling } from "../usePolling";

const TS_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s?(.*)$/;

export default function LogsPanel({ id }) {
  const [logs, setLogs] = useState("");
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState(true);
  const [lines, setLines] = useState(200);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const [follow, setFollow] = useState(true);
  const box = useRef(null);
  async function load() {
    try {
      setLogs(await apiText("/applications/" + id + "/logs?lines=" + lines));
      setMsg("");
    } catch (e) {
      setLogs("");
      setMsg(errorMessage(e));
    }
  }
  usePolling(() => {
    if (live) load();
  }, 5e3);
  useEffect(() => {
    load();
  }, [lines]);
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return logs
      .split("\n")
      .filter((l) => l.length > 0)
      .map((l) => {
        const m = l.match(TS_RE);
        return m ? { ts: m[1] || "", text: m[2] || "" } : { ts: "", text: l };
      })
      .filter((r) => !q || r.text.toLowerCase().includes(q));
  }, [logs, filter]);
  useEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [rows, follow]);
  function copy() {
    navigator.clipboard.writeText(logs).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  const tone = (t) =>
    / 5\d\d |error|exception|fatal/i.test(t)
      ? "log--err"
      : / 4\d\d |warn/i.test(t)
        ? "log--warn"
        : "";
  return (
    <div className="terminal">
      <div className="terminal__bar">
        <div className="terminal__dots">
          <span />
          <span />
          <span />
        </div>
        <div className="input-icon input-icon--sm">
          <Search size={14} />
          <input
            className="input input--sm"
            placeholder="Filter lines"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <select
          className="input input--sm select"
          value={lines}
          onChange={(e) => setLines(Number(e.target.value))}
          aria-label="Lines"
        >
          {[100, 200, 500, 1e3].map((n) => (
            <option key={n} value={n}>
              last {n}
            </option>
          ))}
        </select>
        <label className="switch">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span className="switch__track" />
          live
        </label>
        <button
          className={"icon-btn" + (follow ? " is-on" : "")}
          onClick={() => setFollow(!follow)}
          title="Follow output"
        >
          <ArrowDownToLine size={15} />
        </button>
        <button className="icon-btn" onClick={load} title="Refresh">
          <RefreshCw size={15} />
        </button>
        <button className="icon-btn" onClick={copy} title="Copy logs" disabled={!logs}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <div className="terminal__body" ref={box}>
        {msg && <p className="terminal__msg">{msg}</p>}
        {!msg && rows.length === 0 && <p className="terminal__msg">No log output.</p>}
        {rows.map((r, i) => (
          <div key={i} className={"log " + tone(r.text)}>
            <span className="log__ts">{r.ts ? r.ts.slice(11, 23) : ""}</span>
            <span className="log__text">{r.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
