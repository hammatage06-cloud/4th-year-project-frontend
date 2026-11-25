import { Check, X, Loader2, Clock, Hammer, Ship, Globe } from "lucide-react";
import { duration, fullDate, timeAgo } from "../format";

const STEPS = [
  { id: "QUEUED", label: "Queued", hint: "Waiting for the worker", icon: Clock },
  { id: "BUILDING", label: "Building", hint: "GitHub Actions builds the image", icon: Hammer },
  { id: "DEPLOYING", label: "Deploying", hint: "Applying manifests, rollout", icon: Ship },
  { id: "RUNNING", label: "Running", hint: "Live on its URL", icon: Globe },
];

function stageIndex(status) {
  if (status === "QUEUED") return 0;
  if (["CLONING", "ANALYZING", "BUILDING"].includes(status)) return 1;
  if (status === "DEPLOYING" || status === "HEALTH_CHECK") return 2;
  if (status === "RUNNING" || status === "SUPERSEDED") return 3;
  return 0;
}

function failedStep(d) {
  if (!d.started_at) return 0;
  if (d.image || /rollout|pull|probe|kubectl|namespace/i.test(d.error || "")) return 2;
  return 1;
}

export default function Pipeline({ deployment }) {
  const d = deployment;
  const failed = d.status === "FAILED" || d.status === "CANCELLED";
  const done = d.status === "RUNNING" || d.status === "SUPERSEDED";
  const current = failed
    ? failedStep(d)
    : done
      ? 3
      : stageIndex(d.status);
  return (
    <div className="pipeline">
      <div className="pipeline__head">
        <div>
          <span className="eyebrow">Deployment #{d.id}</span>
          <h3 className="pipeline__title">
            {failed ? "Deployment failed" : done ? "Deployment complete" : "Deployment in progress"}
          </h3>
        </div>
        <dl className="pipeline__meta">
          <div>
            <dt>Queued</dt>
            <dd title={fullDate(d.queued_at)}>{timeAgo(d.queued_at)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{duration(d)}</dd>
          </div>
          {d.run_url && (
            <div>
              <dt>Build</dt>
              <dd>
                <a href={d.run_url} target="_blank" rel="noreferrer">
                  workflow run ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <ol className="steps">
        {STEPS.map((s, i) => {
          let state = "pending";
          if (i < current || (i === current && done)) state = "done";
          else if (i === current) state = failed ? "failed" : "current";
          const Icon =
            state === "done"
              ? Check
              : state === "failed"
                ? X
                : state === "current"
                  ? Loader2
                  : s.icon;
          return (
            <li key={s.id} className={"step step--" + state}>
              <span className="step__node">
                <Icon size={16} className={state === "current" ? "spin" : ""} />
              </span>
              <span className="step__text">
                <strong>{s.label}</strong>
                <span>{state === "failed" ? "Stopped here" : s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {d.error && (
        <div className="alert alert--danger alert--block">
          <strong>What went wrong</strong>
          <pre>{d.error}</pre>
        </div>
      )}
      {d.image && (
        <p className="pipeline__image">
          image <code>{d.image}</code>
        </p>
      )}
    </div>
  );
}
