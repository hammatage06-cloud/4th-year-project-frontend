function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

function timeAgo(value) {
  if (!value) return "-";
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1e3);
  if (s < 5) return "just now";
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}

function fullDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function duration(d) {
  if (!d.started_at) return "-";
  const end = d.finished_at ? new Date(d.finished_at).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - new Date(d.started_at).getTime()) / 1e3));
  if (s < 60) return s + " s";
  return Math.floor(s / 60) + "m " + (s % 60) + "s";
}

const ACTIVE = ["QUEUED", "BUILDING", "DEPLOYING", "CLONING", "ANALYZING", "HEALTH_CHECK"];

const BUSY = ["QUEUED", "BUILDING", "DEPLOYING", "CLONING", "ANALYZING", "HEALTH_CHECK", "STOPPING", "DELETING"];

export { ACTIVE, BUSY, duration, errorMessage, fullDate, timeAgo };
