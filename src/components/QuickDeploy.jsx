import { useState } from "react";
import { Rocket, Plus, GitBranch, Github, Info } from "lucide-react";
import Modal from "./Modal";
import { api } from "../api";
import { errorMessage } from "../format";
import { validateForm } from "../validate";

const EMPTY = { name: "", repo: "", branch: "main", port: "3000", profile: "small" };

export default function QuickDeploy({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errors = validateForm(form);
  const complete = form.name && form.repo && form.branch && form.port;
  const valid = complete && Object.keys(errors).length === 0;
  const field = (k) => (e) =>
    setForm({ ...form, [k]: k === "name" ? e.target.value.toLowerCase() : e.target.value });
  async function create(deployNow) {
    setBusy(true);
    setError("");
    try {
      const app = await api("/applications", {
        method: "POST",
        body: { ...form, port: Number(form.port) },
      });
      if (deployNow) await api("/applications/" + app.id + "/deploy", { method: "POST" });
      onCreated(app, deployNow);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Quick deploy"
      subtitle="Register a GitHub repository and ship it to the cluster."
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) create(true);
        }}
      >
        <label className="field">
          <span className="field__label">Application name</span>
          <input
            className="input"
            placeholder="hello-web"
            value={form.name}
            onChange={field("name")}
            autoFocus
          />
          {errors["name"] ? (
            <span className="field__error">{errors["name"]}</span>
          ) : (
            <span className="field__hint">
              Namespace <code>dh-{form.name || "<app>"}</code> · URL{" "}
              <code>{form.name || "<app>"}.&lt;VM_IP&gt;.nip.io</code>
            </span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Repository</span>
          <div className="input-icon">
            <Github size={16} />
            <input
              className="input"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={form.repo}
              onChange={field("repo")}
            />
          </div>
          {errors["repo"] && <span className="field__error">{errors["repo"]}</span>}
        </label>

        <div className="form__row">
          <label className="field">
            <span className="field__label">Branch</span>
            <div className="input-icon">
              <GitBranch size={16} />
              <input className="input" value={form.branch} onChange={field("branch")} />
            </div>
            {errors["branch"] && <span className="field__error">{errors["branch"]}</span>}
          </label>
          <label className="field">
            <span className="field__label">Container port</span>
            <input
              className="input input--mono"
              inputMode="numeric"
              value={form.port}
              onChange={field("port")}
            />
            {errors["port"] && <span className="field__error">{errors["port"]}</span>}
          </label>
        </div>

        <div className="field">
          <span className="field__label">Resource profile</span>
          <div className="segmented" role="radiogroup">
            {[
              { id: "small", label: "Small", hint: "Static sites, small APIs" },
              { id: "medium", label: "Medium", hint: "Heavier Node or Python apps" },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                role="radio"
                aria-checked={form.profile === p.id}
                className={"segmented__opt" + (form.profile === p.id ? " is-on" : "")}
                onClick={() => setForm({ ...form, profile: p.id })}
              >
                <strong>{p.label}</strong>
                <span>{p.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="callout">
          <Info size={16} />
          <p>
            The repo must be public, have a <code>Dockerfile</code> in its root, and the app must
            listen on the port above.
          </p>
        </div>

        {error && <p className="alert alert--danger">{error}</p>}

        <div className="form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy || !valid}
            onClick={() => create(false)}
          >
            <Plus size={16} /> Create only
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
            <Rocket size={16} /> {busy ? "Working..." : "Create and deploy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
