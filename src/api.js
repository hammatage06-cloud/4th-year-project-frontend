// API helper (Parts 8.2 and 10.4). In demo mode requests go to src/mock.js instead of /api.
import { DEMO } from "./config";
import { mockFetch } from "./mock";

const TOKEN_KEY = "dh_token";

const USER_KEY = "dh_user";

const getToken = () =>
  typeof localStorage === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

function setUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function signOut() {
  setToken(null);
  setUser(null);
}

function send(path, options) {
  const token = getToken();
  const init = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: options.body !== void 0 ? JSON.stringify(options.body) : null,
  };
  return DEMO ? mockFetch(path, init) : fetch("/api" + path, init);
}

function expired(res) {
  if (res.status === 401 && getToken()) {
    signOut();
    window.location.assign("/login");
    throw new Error("Session expired");
  }
}

async function api(path, options = {}) {
  const res = await send(path, options);
  expired(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data.details && data.details.join("; ")) || data.error || "Request failed");
  }
  return data;
}

async function apiText(path) {
  const res = await send(path, {});
  expired(res);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Request failed");
  }
  return res.text();
}

function isAdmin() {
  try {
    const token = getToken();
    if (!token) return false;
    const payload = token.split(".")[1] || "";
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role === "admin";
  } catch {
    return false;
  }
}

export { api, apiText, getToken, getUser, isAdmin, setToken, setUser, signOut };
