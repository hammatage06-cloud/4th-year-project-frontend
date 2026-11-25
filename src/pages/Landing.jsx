import { ArrowRight, Check, ChevronRight, Github, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const STEPS = [
  { n: "01", title: "Connect your repo", text: "Paste a GitHub URL. We find your app and its build settings." },
  { n: "02", title: "Configure once", text: "Review detected settings and add secrets without exposing them." },
  { n: "03", title: "Ship with confidence", text: "Follow each build stage until your app is live." },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing__nav">
        <Link to="/" className="landing__brand"><Logo size={32} /><span>DeployHub</span></Link>
        <nav>
          <a href="#how-it-works">How it works</a>
          <Link to="/login" className="landing__signin">Sign in</Link>
          <Link to="/signup" className="btn btn--primary">Get started <ArrowRight size={16} /></Link>
        </nav>
      </header>

      <main>
        <section className="landing__hero">
          <div className="landing__copy">
            <span className="eyebrow eyebrow--accent"><Sparkles size={13} /> DEPLOY WITHOUT THE DEVOPS</span>
            <h1>Your code deserves<br />to be <em>out there.</em></h1>
            <p>Connect a GitHub repository and turn it into a live application. DeployHub handles the build, rollout, and health checks.</p>
            <div className="landing__actions">
              <Link to="/signup" className="btn btn--primary btn--lg">Deploy your first app <ArrowRight size={17} /></Link>
              <Link to="/login" className="landing__text-link">I already have an account <ChevronRight size={15} /></Link>
            </div>
            <div className="landing__trust"><ShieldCheck size={16} /> Secrets stay private. Deployments stay observable.</div>
          </div>

          <div className="landing__preview">
            <div className="preview__top"><span className="preview__lights"><i /><i /><i /></span><span>deployhub / overview</span><span className="tag tag--ok">ALL SYSTEMS GO</span></div>
            <div className="preview__app">
              <span className="app-mark app-mark--lg">AP</span>
              <div><strong>atlas-portal</strong><span>github.com/acme/atlas-portal · main</span></div>
              <span className="badge badge--live badge--ok"><i className="badge__dot" /> RUNNING</span>
            </div>
            <div className="preview__url"><span>LIVE APPLICATION</span><strong>atlas-portal.deployhub.app <ArrowRight size={14} /></strong></div>
            <div className="preview__pipeline">
              <div className="preview__line preview__line--done"><span><Check size={13} /></span><div><strong>Repository cloned</strong><small>main · 8 files</small></div><b>DONE</b></div>
              <div className="preview__line preview__line--done"><span><Check size={13} /></span><div><strong>Application analyzed</strong><small>Next.js · Node 22</small></div><b>DONE</b></div>
              <div className="preview__line preview__line--active"><span className="spin-mark" /><div><strong>Building image</strong><small>Optimizing production build</small></div><b>BUILDING</b></div>
              <div className="preview__line"><span /><div><strong>Health check</strong><small>Waiting for deployment</small></div><b>WAITING</b></div>
            </div>
            <div className="preview__footer"><span><i className="pulse" /> All services operational</span><span>Updated just now</span></div>
          </div>
        </section>

        <section className="landing__proof">
          <div><strong>One workflow</strong><span>From repository to production</span></div>
          <div><strong>Live visibility</strong><span>Progress, logs, and deployment history</span></div>
          <div><strong>Built for builders</strong><span>Spend time shipping, not wiring servers</span></div>
        </section>

        <section id="how-it-works" className="landing__steps">
          <div className="landing__section-head"><span className="eyebrow">A simpler way to ship</span><h2>Three steps. One live app.</h2><p>No infrastructure maze. Just your code, ready for the world.</p></div>
          <div className="landing__step-grid">{STEPS.map((step) => <article key={step.n}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
        </section>

        <section className="landing__cta"><div><span className="eyebrow eyebrow--accent">READY WHEN YOU ARE</span><h2>Let’s get your next idea online.</h2></div><Link to="/signup" className="btn btn--primary btn--lg">Start deploying <ArrowRight size={17} /></Link></section>
      </main>
      <footer className="landing__footer"><span><Logo size={22} /> DeployHub</span><small>Ship faster. Stay in control.</small><a href="https://github.com" target="_blank" rel="noreferrer"><Github size={15} /> Built for GitHub</a></footer>
    </div>
  );
}
