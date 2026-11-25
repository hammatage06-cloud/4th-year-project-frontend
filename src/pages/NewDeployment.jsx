import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, GitBranch, Github, LockKeyhole,
  Plus, Rocket, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { DEMO } from "../config";
import { errorMessage } from "../format";
import { normaliseRepo, validateForm } from "../validate";

const STEPS = ["Connect repository", "Configure app", "Environment"];
const INITIAL = {
  name: "", repo: "", branch: "main", port: "3000", profile: "small",
  framework: "Auto-detect", build_command: "", start_command: "",
};

function guessProject(repo) {
  const parts = normaliseRepo(repo).split("/");
  return (parts[parts.length - 1] || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
}

async function detectConfiguration(repo, branch) {
  if (!DEMO) {
    const result = await api("/applications/analyze", {
      method: "POST",
      body: { repo, branch },
    });
    return {
      framework: result.framework,
      build_command: result.build_command,
      start_command: result.start_command,
      port: String(result.port),
    };
  }
  const slug = normaliseRepo(repo);
  if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) throw new Error("Enter a valid GitHub repository URL first.");
  const rootUrl = `https://api.github.com/repos/${slug}/contents?ref=${encodeURIComponent(branch)}`;
  const rootResponse = await fetch(rootUrl, { headers: { Accept: "application/vnd.github+json" } });
  if (!rootResponse.ok) throw new Error("Could not inspect this repository. Check that it is public and the branch exists, or enter settings manually.");
  const files = await rootResponse.json();
  const names = files.map((item) => item.name);
  let framework = "Docker";
  let build = "docker build -t app .";
  let start = "docker run -p $PORT:$PORT app";
  let port = "3000";
  if (names.includes("package.json")) {
    const response = await fetch(`https://raw.githubusercontent.com/${slug}/${encodeURIComponent(branch)}/package.json`);
    if (!response.ok) throw new Error("Repository files were found, but package.json could not be read.");
    const pkg = await response.json();
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts || {};
    framework = deps.next ? "Next.js" : deps.vite ? "Vite" : deps.react ? "React" : deps.vue ? "Vue" : deps.express ? "Express" : "Node.js";
    build = scripts.build ? "npm run build" : "npm install";
    start = scripts.start ? "npm start" : deps.vite ? "npm run dev -- --host 0.0.0.0" : "node server.js";
    port = deps.next || deps.vite ? "3000" : "8080";
  } else if (names.includes("requirements.txt") || names.includes("pyproject.toml")) {
    framework = names.includes("manage.py") ? "Django" : "Python";
    build = "pip install -r requirements.txt";
    start = names.includes("manage.py") ? "python manage.py runserver 0.0.0.0:$PORT" : "python app.py";
    port = "8000";
  } else if (names.includes("go.mod")) {
    framework = "Go";
    build = "go build -o app .";
    start = "./app";
    port = "8080";
  }
  return { framework, build_command: build, start_command: start, port };
}

export default function NewDeployment() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const [variables, setVariables] = useState([{ key: "", value: "" }]);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [key]: key === "name" ? value.toLowerCase() : value,
      ...(key === "repo" && !current.name ? { name: guessProject(value) } : {}),
    }));
  };
  const errors = validateForm(form);
  const repoValid = form.name && form.repo && form.branch && !errors.name && !errors.repo && !errors.branch;
  const envValid = variables.every((item) => (!item.key && !item.value) || (/^[A-Z_][A-Z0-9_]*$/.test(item.key) && item.value));

  async function goToConfig() {
    setError("");
    setStep(1);
    setDetecting(true);
    try {
      const result = await detectConfiguration(form.repo, form.branch);
      setForm((current) => ({ ...current, ...result }));
      setDetected(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDetecting(false);
    }
  }

  async function createAndDeploy() {
    setError("");
    setBusy(true);
    const environment = Object.fromEntries(variables.filter((item) => item.key && item.value).map((item) => [item.key, item.value]));
    try {
      const app = await api("/applications", {
        method: "POST",
        body: {
          ...form,
          port: Number(form.port),
          environment,
        },
      });
      await api(`/applications/${app.id}/deploy`, { method: "POST" });
      navigate(`/deploy/${app.id}/progress`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/dashboard" className="back"><ArrowLeft size={16} /> Dashboard</Link>
      <header className="page-head wizard-head">
        <div><span className="eyebrow">New application</span><h1 className="page-title">Let’s get it live.</h1><p className="muted">Connect your code, review the setup, and launch your first deployment.</p></div>
      </header>

      <section className="wizard">
        <aside className="wizard__rail">
          <span className="eyebrow">DEPLOYMENT SETUP</span>
          <ol>{STEPS.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}>
            <span className="wizard__number">{index < step ? <Check size={15} /> : `0${index + 1}`}</span><span><strong>{label}</strong><small>{index === 0 ? "Choose your source" : index === 1 ? "Review build settings" : "Add private values"}</small></span>
          </li>)}</ol>
          <div className="wizard__rail-note"><ShieldCheck size={16} /><span>Your environment values are sent only to the deployment API and are never shown in logs.</span></div>
        </aside>

        <div className="wizard__content">
          {step === 0 && <section className="wizard__step">
            <span className="eyebrow">STEP 01 / 03</span><h2>Connect a GitHub repository</h2><p className="muted">Start with the repository you want to ship.</p>
            <label className="field"><span className="field__label">GitHub repository URL</span><div className="input-icon"><Github size={16} /><input className="input" placeholder="https://github.com/acme/my-app" value={form.repo} onChange={field("repo")} autoFocus /></div>{errors.repo && <span className="field__error">{errors.repo}</span>}<span className="field__hint">Public repositories can be analyzed automatically. Private repo access depends on your GitHub integration.</span></label>
            <div className="form__row wizard__repo-row">
              <label className="field"><span className="field__label">Project name</span><input className="input" placeholder="my-app" value={form.name} onChange={field("name")} />{errors.name && <span className="field__error">{errors.name}</span>}</label>
              <label className="field"><span className="field__label">Branch</span><div className="input-icon"><GitBranch size={16} /><input className="input" value={form.branch} onChange={field("branch")} /></div>{errors.branch && <span className="field__error">{errors.branch}</span>}</label>
            </div>
            <div className="wizard__actions"><span className="muted">Step 1 of 3</span><button className="btn btn--primary" disabled={!repoValid} onClick={goToConfig}>Continue <ArrowRight size={16} /></button></div>
          </section>}

          {step === 1 && <section className="wizard__step">
            <span className="eyebrow">STEP 02 / 03</span><h2>Configure your application</h2><p className="muted">Review detected settings and override anything that needs adjusting.</p>
            {detecting && <p className="wizard__detect"><span className="spin-mark" /> Inspecting repository files...</p>}
            {detected && <div className="wizard__detected"><Sparkles size={16} /> Configuration detected from your repository. You can edit any value.</div>}
            {error && <p className="alert alert--danger">{error}</p>}
            <div className="wizard__settings">
              <label className="field"><span className="field__label">Framework</span><select className="input" value={form.framework} onChange={field("framework")}><option>Auto-detect</option><option>Next.js</option><option>React</option><option>Vite</option><option>Vue</option><option>Node.js</option><option>Express</option><option>Python</option><option>Django</option><option>Go</option><option>Docker</option><option>Other</option></select></label>
              <label className="field"><span className="field__label">Application port</span><input className="input input--mono" inputMode="numeric" value={form.port} onChange={field("port")} />{errors.port && <span className="field__error">{errors.port}</span>}</label>
              <label className="field"><span className="field__label">Build command</span><input className="input input--mono" placeholder="npm run build" value={form.build_command} onChange={field("build_command")} /></label>
              <label className="field"><span className="field__label">Start command</span><input className="input input--mono" placeholder="npm start" value={form.start_command} onChange={field("start_command")} /></label>
            </div>
            <label className="field"><span className="field__label">Resource profile</span><div className="segmented">
              {[{ id: "small", label: "Small", hint: "Static sites and APIs" }, { id: "medium", label: "Medium", hint: "Heavier applications" }].map((item) => <button key={item.id} type="button" className={"segmented__opt" + (form.profile === item.id ? " is-on" : "")} onClick={() => setForm((current) => ({ ...current, profile: item.id }))}><strong>{item.label}</strong><span>{item.hint}</span></button>)}
            </div></label>
            <div className="wizard__actions"><button className="btn btn--ghost" onClick={() => { setError(""); setStep(0); }}><ChevronLeft size={16} /> Back</button><button className="btn btn--primary" disabled={Boolean(errors.port)} onClick={() => { setError(""); setStep(2); }}>Environment variables <ArrowRight size={16} /></button></div>
          </section>}

          {step === 2 && <section className="wizard__step">
            <span className="eyebrow">STEP 03 / 03</span><h2>Add environment variables</h2><p className="muted">Provide runtime values your application needs. Values are write-only here and won’t appear in logs or project details.</p>
            <div className="secret-notice"><LockKeyhole size={18} /><div><strong>Keep your secrets secret</strong><span>Use environment variables for credentials like database URLs and API keys. Never put secrets in your source code.</span></div></div>
            <div className="env-list">{variables.map((item, index) => <div className="env-row" key={index}>
              <label className="field"><span className="field__label">Variable name</span><input className="input input--mono" placeholder="DATABASE_URL" autoComplete="off" value={item.key} onChange={(e) => setVariables((current) => current.map((entry, i) => i === index ? { ...entry, key: e.target.value.toUpperCase() } : entry))} /></label>
              <label className="field"><span className="field__label">Value <span className="muted">· never displayed later</span></span><input className="input input--mono" type="password" autoComplete="new-password" placeholder="Enter secret value" value={item.value} onChange={(e) => setVariables((current) => current.map((entry, i) => i === index ? { ...entry, value: e.target.value } : entry))} /></label>
              <button className="icon-btn" type="button" aria-label="Remove variable" onClick={() => setVariables((current) => current.length === 1 ? [{ key: "", value: "" }] : current.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
            </div>)}</div>
            <button type="button" className="btn btn--ghost" onClick={() => setVariables((current) => [...current, { key: "", value: "" }])}><Plus size={15} /> Add variable</button>
            {!envValid && <span className="field__error">Use uppercase letters, numbers, and underscores for names, and provide a value for each one.</span>}
            <div className="wizard__actions"><button className="btn btn--ghost" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button><button className="btn btn--primary" disabled={busy || !envValid} onClick={createAndDeploy}><Rocket size={16} /> {busy ? "Starting deployment..." : "Deploy application"}</button></div>
            <p className="wizard__security"><ShieldCheck size={14} /> Environment values are sent with the deployment request and never included in the UI after submission.</p>
          </section>}
        </div>
      </section>
    </>
  );
}
