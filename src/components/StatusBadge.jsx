const TONES = {
  RUNNING: "ok",
  BUILDING: "warn",
  CLONING: "warn",
  ANALYZING: "warn",
  DEPLOYING: "info",
  HEALTH_CHECK: "info",
  QUEUED: "muted",
  CREATED: "muted",
  FAILED: "danger",
  DELETE_FAILED: "danger",
  STOP_FAILED: "danger",
  DELETING: "del",
  SUPERSEDED: "muted",
  CANCELLED: "muted",
  STOPPED: "muted",
};

const LIVE = ["QUEUED", "CLONING", "ANALYZING", "BUILDING", "DEPLOYING", "HEALTH_CHECK", "STOPPING", "DELETING"];

export default function StatusBadge({ status }) {
  const tone = TONES[status] ?? "muted";
  const live = LIVE.includes(status) ? " badge--live" : "";
  return (
    <span className={"badge badge--" + tone + live}>
      <span className="badge__dot" />
      {status}
    </span>
  );
}
