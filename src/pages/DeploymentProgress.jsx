import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Loader2, Rocket } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { usePolling } from "../usePolling";
import { errorMessage } from "../format";
import StatusBadge from "../components/StatusBadge";

const STAGES = [
  { title: "Repository cloned", detail: "Source code is ready for analysis." },
  { title: "Application analyzed", detail: "Framework and build settings are being checked." },
  { title: "Docker image built", detail: "The production image is being created." },
  { title: "Deployment in progress", detail: "Your application is rolling out." },
  { title: "Health check", detail: "Waiting for the app to pass its health check." },
];

function stageIndex(status) {
  if (status === "QUEUED") return 0;
  if (status === "CLONING") return 0;
  if (status === "ANALYZING") return 1;
  if (status === "BUILDING") return 2;
  if (status === "DEPLOYING") return 3;
  if (status === "HEALTH_CHECK") return 4;
  return 5;
}

export default function DeploymentProgress() {
  const { id = "" } = useParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState("");
  usePolling(() => api(`/applications/${id}`).then((result) => {
    setApp(result);
    setError("");
  }).catch((e) => setError(errorMessage(e))), 2500);

  const deployment = app?.deployments?.[0];
  const status = deployment?.status || app?.status || "QUEUED";
  const complete = status === "RUNNING" || status === "SUPERSEDED";
  const failed = status === "FAILED" || status === "CANCELLED";
  const current = failed ? (deployment?.image ? 4 : 2) : stageIndex(status);
  return (
    <>
      <Link to="/dashboard" className="back"><ArrowRight size={16} className="back__reverse" /> Dashboard</Link>
      <section className={"progress-hero" + (failed ? " progress-hero--failed" : complete ? " progress-hero--complete" : "")}>
        <div className="progress-hero__icon">{complete ? <Check size={24} /> : failed ? <CircleAlert size={24} /> : <Rocket size={24} />}</div>
        <span className="eyebrow">{complete ? "DEPLOYMENT COMPLETE" : failed ? "DEPLOYMENT NEEDS ATTENTION" : "DEPLOYMENT IN PROGRESS"}</span>
        <h1 className="page-title">{app ? app.name : "Preparing your deployment"}</h1>
        <p className="muted">{complete ? "Your application is healthy and available." : failed ? "The deployment stopped before your app became healthy." : "We’re building and starting your application. This page updates automatically."}</p>
        {app && <div className="progress-hero__meta"><code>{app.repo}</code><span>·</span><code>{app.branch}</code><StatusBadge status={status} /></div>}
      </section>

      {error && <p className="alert alert--danger">{error}</p>}

      <section className="panel progress-panel">
        <div className="progress-panel__head"><div><span className="eyebrow">LIVE PIPELINE</span><h2>Deployment stages</h2></div><span className={"progress-count" + (complete ? " is-done" : "")}>{complete ? "5 / 5 complete" : failed ? "Deployment failed" : "Updating live"}</span></div>
        <ol className="progress-stages">{STAGES.map((stage, index) => {
          let state = index < current || complete ? "done" : index === current && !failed ? "current" : "pending";
          if (failed && index === Math.min(current, 4)) state = "failed";
          const title =
            index === 0 && (status === "QUEUED" || status === "CLONING")
              ? "Cloning repository"
              : index === 1 && status === "ANALYZING"
                ? "Analyzing application"
                : index === 2 && (status === "BUILDING" || (failed && !deployment?.image))
                ? "Building Docker image"
                : stage.title;
          const detail =
            index === 0 && (status === "QUEUED" || status === "CLONING")
              ? "Checking out the selected branch from GitHub."
              : index === 1 && status === "ANALYZING"
                ? "Inspecting the source and build configuration."
                : index === 2 && (status === "BUILDING" || (failed && !deployment?.image))
                ? "Creating the production image."
                : stage.detail;
          return <li key={stage.title} className={`progress-stage progress-stage--${state}`}>
            <span className="progress-stage__node">{state === "done" ? <Check size={16} /> : state === "current" ? <Loader2 className="spin" size={16} /> : state === "failed" ? <CircleAlert size={16} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</span>
            <div className="progress-stage__copy"><strong>{title}</strong><span>{state === "done" ? "Completed" : state === "current" ? detail : state === "failed" ? "This stage did not complete." : stage.detail}</span></div>
            <span className="progress-stage__status">{state === "done" ? "DONE" : state === "current" ? "IN PROGRESS" : state === "failed" ? "FAILED" : "WAITING"}</span>
          </li>;
        })}</ol>
        {failed && deployment?.error && <div className="alert alert--danger alert--block"><strong>Deployment error</strong><pre>{deployment.error}</pre></div>}
        <div className="progress-panel__footer">
          <span className="muted">{deployment ? `Deployment #${deployment.id}` : "Contacting deployment service..."}</span>
          {app && <Link className="btn btn--ghost" to={`/apps/${app.id}`}>Open application <ArrowRight size={15} /></Link>}
        </div>
      </section>
      {complete && app?.url && <section className="url-bar"><span className="url-bar__label">LIVE APPLICATION</span><a className="url-bar__link" href={app.url} target="_blank" rel="noreferrer">{app.url} <ArrowRight size={14} /></a></section>}
    </>
  );
}
