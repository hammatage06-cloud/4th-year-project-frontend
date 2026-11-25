import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, getToken, setToken, setUser } from "../api";
import { DEMO } from "../config";
import { errorMessage } from "../format";
import Logo from "../components/Logo";

const DEMO_USERS = [
  { email: "student@example.com", password: "student123", role: "user" },
  { email: "admin@example.com", password: "admin123", role: "admin" },
];

const FEED = [
  { s: "QUEUED", t: "deployment #42 queued for hello-web" },
  { s: "BUILDING", t: "workflow_dispatch build-app \u2192 run 11904205754" },
  { s: "BUILDING", t: "pushed ghcr.io/deployhub-lab/dh-hello-web:42" },
  { s: "DEPLOYING", t: "kubectl apply -n dh-hello-web (4 objects)" },
  { s: "DEPLOYING", t: "rollout status deployment/hello-web ... 1/1" },
  { s: "RUNNING", t: "http://hello-web.192.168.56.10.nip.io" },
];

export default function Login({ signup = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const oauthAttempted = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (getToken()) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oauth_code");
    const oauthError = params.get("oauth_error");
    if (oauthError) {
      const messages = {
        account_conflict: "This email is already connected to another Google account.",
        invalid_state: "Google sign-in expired. Please try again.",
        not_configured: "Google sign-in is not configured yet.",
        provider_error: "Google sign-in failed. Please try again.",
      };
      setError(messages[oauthError] || "Google sign-in failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (code && !oauthAttempted.current) {
      oauthAttempted.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      setBusy(true);
      api("/auth/google/exchange", { method: "POST", body: { code } })
        .then((data) => {
          setToken(data.token);
          setUser(data.user);
          navigate("/dashboard", { replace: true });
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setBusy(false));
    }
    const t = setInterval(() => setTick((n) => (n + 1) % (FEED.length + 3)), 1100);
    return () => clearInterval(t);
  }, [navigate]);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api(signup ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function googleSignIn() {
    if (!DEMO) {
      window.location.assign("/api/auth/google");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/google", { method: "POST", body: {} });
      setToken(data.token);
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login__hero">
        <div className="login__brand">
          <Logo size={34} />
          <span>DeployHub</span>
        </div>
        <div className="login__pitch">
          <span className="eyebrow eyebrow--accent">Self-service deployment platform</span>
          <h1>
            From GitHub repo
            <br />
            to live URL in <em>one click.</em>
          </h1>
          <p>
            Register a repository, press deploy, and watch it build, roll out to Kubernetes and go
            live.
          </p>
        </div>
        <div className="feed" aria-hidden="true">
          <div className="feed__bar">
            <span />
            <span />
            <span />
            <code>deployhub worker</code>
          </div>
          <div className="feed__body">
            {FEED.slice(0, Math.min(tick + 1, FEED.length)).map((f, i) => (
              <div key={i} className="feed__line">
                <span className={"feed__tag feed__tag--" + f.s.toLowerCase()}>{f.s}</span>
                <span>{f.t}</span>
              </div>
            ))}
            <span className="caret" />
          </div>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={submit}>
          <h2>{signup ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">{signup ? "Start deploying your applications in minutes." : "Sign in to pick up where you left off."}</p>

          <button type="button" className="btn btn--ghost btn--lg btn--block auth-google" onClick={googleSignIn} disabled={busy}>
            <span className="google-mark">G</span> Continue with Google
          </button>
          <div className="auth-divider"><span>or continue with email</span></div>

          <label className="field">
            <span className="field__label">Email</span>
            <div className="input-icon">
              <Mail size={16} />
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>
          <label className="field">
            <span className="field__label">Password</span>
            <div className="input-icon">
              <Lock size={16} />
              <input
                className="input"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={signup ? 8 : undefined}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          {error && <p className="alert alert--danger">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={busy || !email || !password}
          >
            {busy ? (signup ? "Creating account..." : "Signing in...") : (signup ? "Create account" : "Sign in")} <ArrowRight size={17} />
          </button>

          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to DeployHub?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link>
          </p>

          {!signup && DEMO && (
            <div className="demo-accounts">
              <span className="eyebrow">Demo accounts</span>
              {DEMO_USERS.map((u) => (
                <button
                  type="button"
                  key={u.email}
                  className="demo-accounts__item"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                  }}
                >
                  <code>{u.email}</code>
                  <span className="tag">{u.role}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
