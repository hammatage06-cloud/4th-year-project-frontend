// In-browser stand-in for the DeployHub Express API, used only in demo mode (npm run demo).
// Same routes, status codes and lifecycle as the handbook backend:
// QUEUED -> BUILDING -> DEPLOYING -> RUNNING or FAILED, DELETING -> DELETED.
import { APP_NAME_RE, BRANCH_RE, REPO_RE, normaliseRepo } from "./validate";

const KEY = "dh_demo_state_v1";

const VM_IP = "192.168.56.10";

const GH_OWNER = "deployhub-lab";

const T_BUILD = 2500;

const T_DEPLOY = 11e3;

const T_RUNNING = 16e3;

const T_BUILD_FAIL = 7e3;

const T_DEPLOY_FAIL = 15e3;

const T_DELETE = 3500;

const iso = (ms) => new Date(ms).toISOString();

const imageFor = (name, id) => `ghcr.io/${GH_OWNER}/dh-${name}:${id}`;

const runFor = (id) =>
  `https://github.com/${GH_OWNER}/deployhub/actions/runs/${119042e5 + id * 137}`;

const urlFor = (name) => `http://${name}.${VM_IP}.nip.io`;

function seed() {
  const now = Date.now();
  const h = 36e5;
  const app = (a) => ({
    repo: "demo-user/" + a.name,
    branch: "main",
    port: 3e3,
    profile: "small",
    framework: "Node.js",
    build_command: "npm run build",
    start_command: "npm start",
    environment_keys: [],
    stopped: false,
    status: "RUNNING",
    url: urlFor(a.name),
    created_at: iso(now - 30 * h),
    deleted_at: null,
    delete_requested: null,
    ...a,
  });
  const dep = (id, appId, name, status, agoMs, secs, error = null) => ({
    id,
    application_id: appId,
    status,
    image: status === "FAILED" && error?.startsWith("Build") ? null : imageFor(name, id),
    run_url: runFor(id),
    error,
    queued_at: iso(now - agoMs),
    started_at: iso(now - agoMs + 2500),
    finished_at: iso(now - agoMs + 2500 + secs * 1e3),
    fail_at: null,
    fail_error: null,
  });
  return {
    users: [
      { id: 1, email: "admin@example.com", password: "admin123", role: "admin" },
      { id: 2, email: "student@example.com", password: "student123", role: "user" },
    ],
    apps: [
      app({ id: 1, name: "hello-web", owner_id: 2, created_at: iso(now - 50 * h) }),
      app({
        id: 2,
        name: "todo-api",
        owner_id: 2,
        port: 8080,
        profile: "medium",
        created_at: iso(now - 26 * h),
      }),
      app({ id: 3, name: "metrics-demo", owner_id: 1, created_at: iso(now - 20 * h) }),
      app({
        id: 4,
        name: "legacy-site",
        owner_id: 1,
        repo: "demo-user/legacy-site-no-dockerfile",
        status: "FAILED",
        url: null,
        created_at: iso(now - 4 * h),
      }),
    ],
    deps: [
      dep(1, 1, "hello-web", "SUPERSEDED", 48 * h, 52),
      dep(2, 3, "metrics-demo", "RUNNING", 19 * h, 61),
      dep(3, 2, "todo-api", "RUNNING", 25 * h, 74),
      dep(4, 1, "hello-web", "RUNNING", 2 * h, 47),
      dep(
        5,
        4,
        "legacy-site",
        "FAILED",
        3.5 * h,
        19,
        "Build failed: no Dockerfile found in the repository root. Open the workflow run for the full log.",
      ),
    ],
    audit: [
      { user_id: 1, action: "app.deploy", detail: "legacy-site", at: iso(now - 3.5 * h) },
      { user_id: 1, action: "app.create", detail: "legacy-site", at: iso(now - 4 * h) },
      { user_id: 2, action: "app.deploy", detail: "hello-web", at: iso(now - 2 * h) },
      { user_id: 2, action: "app.deploy", detail: "todo-api", at: iso(now - 25 * h) },
      { user_id: 2, action: "app.create", detail: "todo-api", at: iso(now - 26 * h) },
      { user_id: 1, action: "app.create", detail: "metrics-demo", at: iso(now - 20 * h) },
      { user_id: 2, action: "app.create", detail: "hello-web", at: iso(now - 50 * h) },
      { user_id: 1, action: "auth.login", detail: "admin@example.com", at: iso(now - 51 * h) },
    ],
    seq: { app: 4, dep: 5 },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}

function save(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function resetDemo() {
  localStorage.removeItem(KEY);
}

function advance(s) {
  const now = Date.now();
  for (const d of s.deps) {
    if (!["QUEUED", "BUILDING", "DEPLOYING"].includes(d.status)) continue;
    const app = s.apps.find((a) => a.id === d.application_id);
    if (!app) continue;
    const q = Date.parse(d.queued_at);
    const t = now - q;
    if (t >= T_BUILD) {
      d.started_at = iso(q + T_BUILD);
      d.run_url = runFor(d.id);
    }
    if (d.fail_at === "build" && t >= T_BUILD_FAIL) {
      d.status = "FAILED";
      d.finished_at = iso(q + T_BUILD_FAIL);
      d.error = d.fail_error;
    } else if (d.fail_at === "deploy" && t >= T_DEPLOY_FAIL) {
      d.status = "FAILED";
      d.finished_at = iso(q + T_DEPLOY_FAIL);
      d.error = d.fail_error;
    } else if (!d.fail_at && t >= T_RUNNING) {
      d.status = "RUNNING";
      d.finished_at = iso(q + T_RUNNING);
      for (const o of s.deps) {
        if (o.application_id === d.application_id && o.id !== d.id && o.status === "RUNNING") {
          o.status = "SUPERSEDED";
        }
      }
    } else if (t >= T_DEPLOY) {
      d.status = "DEPLOYING";
      d.image = imageFor(app.name, d.id);
    } else if (t >= T_BUILD) {
      d.status = "BUILDING";
    }
  }
  for (const a of s.apps) {
    if (a.deleted_at) continue;
    if (a.status === "DELETING") {
      if (a.delete_requested && now - Date.parse(a.delete_requested) >= T_DELETE) {
        a.status = "DELETED";
        a.deleted_at = iso(now);
        a.url = null;
      }
      continue;
    }
    if (a.stopped) {
      a.status = "STOPPED";
      a.url = null;
      continue;
    }
    const mine = s.deps.filter((d) => d.application_id === a.id).sort((x, y) => y.id - x.id);
    const latest = mine[0];
    if (!latest) {
      a.status = "CREATED";
      continue;
    }
    const running = mine.some((d) => d.status === "RUNNING");
    if (latest.status === "FAILED") a.status = running ? "RUNNING" : "FAILED";
    else a.status = latest.status;
    a.url = running ? urlFor(a.name) : null;
  }
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function podName(app, depId) {
  const a = hash(app.name + depId)
    .toString(36)
    .padEnd(10, "x");
  return `${app.name}-${a.slice(0, 9)}-${a.slice(-5)}`;
}

function nano(ms) {
  return new Date(ms).toISOString().replace("Z", "") + "412871Z";
}

function makeLogs(app, dep, lines) {
  const start = Date.parse(dep.finished_at || dep.queued_at) - 4e3;
  const now = Date.now();
  const out = [
    `${nano(start)} `,
    `${nano(start + 40)} > ${app.name}@1.0.0 start`,
    `${nano(start + 52)} > node server.js`,
    `${nano(start + 61)} `,
    `${nano(start + 310)} [boot] NODE_ENV=production`,
    `${nano(start + 420)} [boot] image ${dep.image}`,
    `${nano(start + 655)} Server listening on 0.0.0.0:${app.port}`,
  ];
  const paths = ["/", "/", "/api/items", "/favicon.ico", "/api/health", "/about", "/api/items/42"];
  let t = start + 3e3;
  let i = 0;
  const from = Math.max(t, now - 1e3 * 60 * 60 * 6);
  t = from;
  while (t < now && out.length < 4e3) {
    const r = hash(app.name + i);
    if (i % 2 === 0) {
      out.push(`${nano(t)} GET /healthz 200 ${1 + (r % 3)}ms - kube-probe/1.31`);
    } else {
      const p = paths[r % paths.length] || "/";
      const code = r % 29 === 0 ? 404 : r % 53 === 0 ? 500 : 200;
      out.push(`${nano(t)} GET ${p} ${code} ${2 + (r % 40)}ms - 10.42.0.${1 + (r % 30)}`);
      if (code === 500)
        out.push(`${nano(t + 3)} Error: upstream timeout while reading /data/items.json`);
    }
    t += 5e3 + (r % 4e3);
    i++;
  }
  return out.slice(-lines).join("\n") + "\n";
}

const json = (status, body) => ({ status, body });

function b64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function userFrom(s, headers) {
  const h = new Headers(headers);
  const auth = h.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  try {
    const p = JSON.parse(atob((token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/")));
    if (p.exp && p.exp * 1e3 < Date.now()) return null;
    return s.users.find((u) => String(u.id) === p.sub) || null;
  } catch {
    return null;
  }
}

function route(s, method, path, query, body, user) {
  const now = Date.now();
  const audit = (action, detail) =>
    s.audit.unshift({ user_id: user ? user.id : null, action, detail, at: iso(now) });
  const authResponse = (found) => {
    const token = [
      b64url({ alg: "HS256", typ: "JWT" }),
      b64url({ sub: String(found.id), role: found.role, exp: Math.floor(now / 1e3) + 8 * 3600 }),
      "demo-signature",
    ].join(".");
    return json(200, { token, user: { id: found.id, email: found.email, role: found.role } });
  };
  if (method === "POST" && path === "/auth/login") {
    const email = String(body["email"] || "");
    const found = s.users.find((u) => u.email === email.trim().toLowerCase());
    if (!email.includes("@") || !body["password"]) return json(400, { error: "Invalid input" });
    if (!found || found.password !== body["password"])
      return json(401, { error: "Invalid credentials" });
    s.audit.unshift({ user_id: found.id, action: "auth.login", detail: found.email, at: iso(now) });
    return authResponse(found);
  }
  if (method === "POST" && path === "/auth/register") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8)
      return json(400, { error: "Enter a valid email and a password with at least 8 characters." });
    if (s.users.some((u) => u.email === email))
      return json(409, { error: "An account with this email already exists." });
    const found = { id: Math.max(...s.users.map((u) => u.id)) + 1, email, password, role: "user" };
    s.users.push(found);
    s.audit.unshift({ user_id: found.id, action: "auth.signup", detail: found.email, at: iso(now) });
    return authResponse(found);
  }
  if (method === "POST" && path === "/auth/google") {
    let found = s.users.find((u) => u.email === "google-demo@example.com");
    if (!found) {
      found = { id: Math.max(...s.users.map((u) => u.id)) + 1, email: "google-demo@example.com", password: "", role: "user" };
      s.users.push(found);
    }
    return authResponse(found);
  }
  if (!user) return json(401, { error: "Unauthorized" });
  const admin = user.role === "admin";
  if (path.startsWith("/admin/")) {
    if (!admin) return json(403, { error: "Forbidden" });
    if (path === "/admin/cluster") {
      const managed = s.apps.filter((a) => !a.deleted_at && a.url).length;
      const cpu = 180 + managed * 37 + (hash(String(Math.floor(now / 1e4))) % 60);
      const mem = 1650 + managed * 96;
      return json(200, {
        nodes: [{ name: "deployhub-lab", ready: true, version: "v1.31.4+k3s1" }],
        usage: `deployhub-lab   ${cpu}m   ${Math.round(cpu / 40)}%   ${mem}Mi   ${Math.round((mem / 7820) * 100)}%`,
        managedNamespaces: managed,
      });
    }
    if (path === "/admin/deployments") {
      const rows = [...s.deps]
        .sort((a, b) => b.id - a.id)
        .slice(0, 50)
        .map((d) => ({
          id: d.id,
          name: s.apps.find((a) => a.id === d.application_id)?.name || "?",
          status: d.status,
          error: d.error,
          queued_at: d.queued_at,
          finished_at: d.finished_at,
        }));
      return json(200, rows);
    }
    if (path === "/admin/audit") return json(200, s.audit.slice(0, 100));
    return json(404, { error: "Not found" });
  }
  const visible = (a) => !a.deleted_at && (admin || a.owner_id === user.id);
  const strip = (a) => ({
    id: a.id,
    name: a.name,
    repo: a.repo,
    branch: a.branch,
    port: a.port,
    profile: a.profile,
    framework: a.framework || "Auto-detect",
    build_command: a.build_command || "",
    start_command: a.start_command || "",
    environment_keys: a.environment_keys || [],
    status: a.status,
    url: a.url,
    created_at: a.created_at,
  });
  if (path === "/applications" && method === "GET") {
    return json(
      200,
      s.apps
        .filter(visible)
        .sort((a, b) => b.id - a.id)
        .map(strip),
    );
  }
  if (path === "/applications" && method === "POST") {
    const details = [];
    const name = String(body["name"] ?? "");
    const repo = normaliseRepo(String(body["repo"] ?? ""));
    const branch = String(body["branch"] || "main");
    const port = body["port"] === void 0 ? 3e3 : Number(body["port"]);
    const profile = String(body["profile"] || "small");
    if (!APP_NAME_RE.test(name)) details.push("name:Invalid");
    if (!REPO_RE.test(repo)) details.push("repo:Invalid");
    if (!BRANCH_RE.test(branch)) details.push("branch:Invalid");
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      details.push("port:Number must be between 1024 and 65535");
    if (!["small", "medium"].includes(profile)) details.push("profile:Invalid enum value");
    if (details.length) return json(400, { error: "Invalid input", details });
    if (!admin && s.apps.filter((a) => !a.deleted_at && a.owner_id === user.id).length >= 3) {
      return json(429, { error: "Application limit reached (3)" });
    }
    if (s.apps.some((a) => !a.deleted_at && a.name === name)) {
      return json(409, { error: "Application name already taken" });
    }
    const created = {
      id: ++s.seq.app,
      owner_id: user.id,
      name,
      repo,
      branch,
      port,
      profile,
      framework: String(body.framework || "Auto-detect"),
      build_command: String(body.build_command || ""),
      start_command: String(body.start_command || ""),
      environment_keys: Object.keys(body.environment || {}),
      stopped: false,
      status: "CREATED",
      url: null,
      created_at: iso(now),
      deleted_at: null,
      delete_requested: null,
    };
    s.apps.push(created);
    audit("app.create", name);
    return json(201, strip(created));
  }
  const m = path.match(/^\/applications\/([^/]+)(?:\/(deploy|restart|stop|config|logs|pods|metrics))?$/);
  if (!m) return json(404, { error: "Not found" });
  const id = Number(m[1]);
  if (!Number.isInteger(id)) return json(400, { error: "Bad id" });
  const app = s.apps.find((a) => a.id === id);
  if (!app || !visible(app)) return json(404, { error: "Not found" });
  const sub = m[2];
  const mine = s.deps.filter((d) => d.application_id === app.id).sort((a, b) => b.id - a.id);
  const strDep = (d) => ({
    id: d.id,
    status: d.status,
    image: d.image,
    run_url: d.run_url,
    error: d.error,
    queued_at: d.queued_at,
    started_at: d.started_at,
    finished_at: d.finished_at,
  });
  if (!sub && method === "GET") {
    return json(200, { ...strip(app), deployments: mine.slice(0, 20).map(strDep) });
  }
  if (sub === "config" && method === "PATCH") {
    const port = Number(body.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      return json(400, { error: "Application port must be between 1024 and 65535." });
    app.framework = String(body.framework || app.framework || "Auto-detect");
    app.build_command = String(body.build_command || "");
    app.start_command = String(body.start_command || "");
    app.port = port;
    app.profile = ["small", "medium"].includes(body.profile) ? body.profile : app.profile;
    app.environment_keys = [...new Set([...(app.environment_keys || []), ...Object.keys(body.environment || {})])];
    audit("app.config", app.name);
    return json(200, strip(app));
  }
  if (sub === "stop" && method === "POST") {
    for (const deployment of mine) {
      if (["QUEUED", "BUILDING", "DEPLOYING"].includes(deployment.status)) {
        deployment.status = "CANCELLED";
        deployment.finished_at = iso(now);
      }
    }
    app.stopped = true;
    app.status = "STOPPED";
    app.url = null;
    audit("app.stop", app.name);
    return json(200, { status: app.status });
  }
  if (sub === "restart" && method === "POST") {
    if (app.status === "DELETING") return json(409, { error: "Application is being deleted" });
    app.stopped = false;
    const deployment = {
      id: ++s.seq.dep,
      application_id: app.id,
      status: "QUEUED",
      image: null,
      run_url: null,
      error: null,
      queued_at: iso(now),
      started_at: null,
      finished_at: null,
      fail_at: null,
      fail_error: null,
    };
    s.deps.push(deployment);
    app.status = "QUEUED";
    audit("app.restart", app.name);
    return json(202, { id: deployment.id, status: "QUEUED" });
  }
  if (!sub && method === "DELETE") {
    if (app.status === "DELETING") return json(409, { error: "Application is being deleted" });
    if (mine.some((d) => ["QUEUED", "BUILDING", "DEPLOYING"].includes(d.status))) {
      for (const d of mine) {
        if (["QUEUED", "BUILDING", "DEPLOYING"].includes(d.status)) {
          d.status = "CANCELLED";
          d.finished_at = iso(now);
        }
      }
    }
    app.status = "DELETING";
    app.delete_requested = iso(now);
    audit("app.delete", app.name);
    return json(202, { status: "DELETING" });
  }
  if (sub === "deploy" && method === "POST") {
    if (app.status === "DELETING") return json(409, { error: "Application is being deleted" });
    if (mine.some((d2) => ["QUEUED", "BUILDING", "DEPLOYING"].includes(d2.status))) {
      return json(409, { error: "A deployment is already in progress" });
    }
    let failAt = null;
    let failError = null;
    if (/no-dockerfile|broken/i.test(app.repo)) {
      failAt = "build";
      failError =
        "Build failed: no Dockerfile found in the repository root. Open the workflow run for the full log.";
    } else if (app.branch === "nope") {
      failAt = "build";
      failError = `Build failed: branch '${app.branch}' was not found in ${app.repo}.`;
    } else if (app.name === "hello-web" && app.port !== 3e3) {
      failAt = "deploy";
      failError = `Rollout timed out after 120s.
Events:
  Warning  Unhealthy  Readiness probe failed: dial tcp 10.42.0.18:${app.port}: connect: connection refused`;
    }
    const d = {
      id: ++s.seq.dep,
      application_id: app.id,
      status: "QUEUED",
      image: null,
      run_url: null,
      error: null,
      queued_at: iso(now),
      started_at: null,
      finished_at: null,
      fail_at: failAt,
      fail_error: failError,
    };
    s.deps.push(d);
    app.status = "QUEUED";
    audit("app.deploy", app.name);
    return json(202, { id: d.id, status: "QUEUED" });
  }
  const live = mine.find((d) => d.status === "RUNNING");
  const latest = mine[0];
  if (sub === "logs") {
    if (!live) return json(404, { error: "No logs available yet" });
    const n = Math.min(Math.max(parseInt(query.get("lines") || "", 10) || 200, 1), 1e3);
    return { status: 200, body: null, text: makeLogs(app, live, n) };
  }
  if (sub === "pods") {
    const pods = [];
    if (live)
      pods.push({
        name: podName(app, live.id),
        phase: "Running",
        ready: true,
        restarts: 0,
        reason: null,
      });
    if (latest && latest !== live) {
      if (latest.status === "DEPLOYING") {
        pods.push({
          name: podName(app, latest.id),
          phase: "Pending",
          ready: false,
          restarts: 0,
          reason: "ContainerCreating",
        });
      } else if (
        latest.status === "FAILED" &&
        latest.image &&
        Date.now() - Date.parse(latest.finished_at || "") < 10 * 6e4
      ) {
        pods.push({
          name: podName(app, latest.id),
          phase: "Running",
          ready: false,
          restarts: 4,
          reason: "CrashLoopBackOff",
        });
      }
    }
    return json(200, pods);
  }
  if (sub === "metrics") {
    if (!live) return json(200, []);
    const r = hash(app.name + Math.floor(now / 5e3));
    const usage = [
      {
        name: podName(app, live.id),
        cpu: 1 + (r % 9) + "m",
        memory: 38 + (r % 24) + (app.profile === "medium" ? 40 : 0) + "Mi",
      },
    ];
    return json(200, usage);
  }
  return json(405, { error: "Method not allowed" });
}

async function mockFetch(path, init) {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
  const s = load();
  advance(s);
  const url = new URL(path, "http://demo.local");
  let body = {};
  try {
    body = init.body ? JSON.parse(String(init.body)) : {};
  } catch {
    body = {};
  }
  const reply = route(
    s,
    (init.method || "GET").toUpperCase(),
    url.pathname,
    url.searchParams,
    body,
    userFrom(s, init.headers),
  );
  advance(s);
  save(s);
  if (reply.text !== void 0) {
    return new Response(reply.text, {
      status: reply.status,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { "Content-Type": "application/json" },
  });
}

export { mockFetch, resetDemo };
