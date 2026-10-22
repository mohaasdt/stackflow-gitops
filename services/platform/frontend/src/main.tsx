import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";
import AnimatedRobotHero from "./AnimatedRobotHero";

type Project = {id: string; repository: string};
type Deployment = {id: string; project_id: string; commit_sha: string; environment: string; status: string; created_at: string};
type Health = {status: string; mode: string; github_connected: boolean};
type IconName = "overview" | "projects" | "rocket" | "activity" | "github" | "arrow" | "refresh" | "shield" | "box" | "check" | "clock" | "external" | "lock" | "sparkle" | "branch" | "chevron" | "layers" | "terminal";

function Icon({name, size = 18}: {name: IconName; size?: number}) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    projects: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></>,
    rocket: <><path d="M4.5 16.5c-1.3 1.1-1.5 4-1.5 4s2.9-.2 4-1.5"/><path d="M12 15l-3 3-3-3 3-3"/><path d="M9 12c2-5.5 6-8.5 12-9-.5 6-3.5 10-9 12"/><circle cx="16" cy="8" r="1.5"/><path d="M9 12H5l-2 4 3 1M12 15v4l-4 2-1-3"/></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4"/></>,
    github: <><path d="M9 19c-4.5 1.4-5-2.3-7-2.5M15 22v-3.5a3 3 0 0 0-.8-2.3c4.3-.5 6.8-2.3 6.8-6.7a5.1 5.1 0 0 0-1.5-3.5 4.6 4.6 0 0 0-.1-3.5s-1.7-.5-3.8 1.4a13 13 0 0 0-7.2 0C6.3 2 4.6 2.5 4.6 2.5a4.6 4.6 0 0 0-.1 3.5A5.1 5.1 0 0 0 3 9.5c0 4.4 2.5 6.2 6.8 6.7A3 3 0 0 0 9 18.5V22"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.8 9A7 7 0 0 1 18.7 7L20 12M4 12l1.3 5A7 7 0 0 0 18.2 15"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    box: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    external: <><path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6H5V5h6"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    sparkle: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/></>,
    branch: <><circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 6v12M6 12c0-4 2-5 10-5"/></>,
    chevron: <><path d="m9 18 6-6-6-6"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const workflowUrl = "https://github.com/mohaasdt/stackflow-gitops/actions";

function WaveBackdrop() {
  return <svg className="wave-backdrop" viewBox="0 0 1150 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="wave-gradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5c1ecb" stopOpacity="0"/><stop offset="28%" stopColor="#863bfa"/><stop offset="64%" stopColor="#fc3ac9"/><stop offset="100%" stopColor="#a347f8" stopOpacity="0"/></linearGradient>
      <linearGradient id="wave-bright" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5e36ff" stopOpacity="0"/><stop offset="52%" stopColor="#d148ff"/><stop offset="80%" stopColor="#f946c7"/><stop offset="100%" stopColor="#b23aff" stopOpacity="0"/></linearGradient>
    </defs>
    {Array.from({length: 20}, (_,i)=><path key={i} d={"M -130 " + (250 + i * 9) + " C 90 " + (65 + i * 5) + ", 245 " + (430 - i * 8) + ", 450 " + (245 + i * 2.6) + " S 800 " + (30 + i * 9) + ", 1210 " + (118 + i * 8)} fill="none" stroke="url(#wave-gradient)" strokeWidth="1.15" opacity={0.09 + i * 0.013}/>)}
    <path d="M -30 330 C 180 150 340 410 545 270 S 910 120 1210 140" fill="none" stroke="url(#wave-bright)" strokeWidth="3" opacity=".67"/>
    <path d="M -30 350 C 160 220 330 435 555 300 S 900 195 1210 180" fill="none" stroke="url(#wave-bright)" strokeWidth="1.6" opacity=".45"/>
  </svg>;
}

function App() {
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [repo, setRepo] = useState("mohaasdt/stackflow-gitops");
  const [sha, setSha] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notice, setNotice] = useState("Connect with your local development token to load project and deployment records.");
  const [noticeKind, setNoticeKind] = useState<"info" | "success" | "error">("info");
  const [busy, setBusy] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/health", {signal: controller.signal})
      .then(response => {if (!response.ok) throw new Error("Health endpoint unavailable"); return response.json();})
      .then((data: Health) => setHealth(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function message(value: string, kind: "info" | "success" | "error" = "info") {
    setNotice(value);
    setNoticeKind(kind);
  }
  async function api(path: string, method = "GET", body?: unknown, extra: Record<string,string> = {}) {
    const response = await fetch(path, {
      method,
      headers: {"Authorization": "Bearer " + token, "Content-Type": "application/json", ...extra},
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(response.status + ": " + detail.slice(0, 240));
    }
    return response.json();
  }
  async function refresh() {
    if (!token.trim()) {message("Enter your local API token before connecting.", "error"); return;}
    setBusy(true);
    try {
      const [p, d, h] = await Promise.all([
        api("/api/projects") as Promise<Project[]>,
        api("/api/deployments") as Promise<Deployment[]>,
        fetch("/health").then(r => {if(!r.ok) throw new Error("Health endpoint unavailable"); return r.json() as Promise<Health>;})
      ]);
      setProjects(p);
      setDeployments(d);
      setHealth(h);
      setProjectId(previous => p.some(project => project.id === previous) ? previous : (p[0]?.id ?? ""));
      message("Workspace synced with the API. Workflow dispatches are not verified Kubernetes deployments.", "success");
    } catch (error) {message(String(error), "error");}
    finally {setBusy(false);}
  }
  async function register() {
    if (!token.trim()) {message("Enter your local API token before registering a project.", "error"); return;}
    setBusy(true);
    try {
      const project: Project = await api("/api/projects", "POST", {repository: repo.trim()});
      setProjectId(project.id);
      setProjects(await api("/api/projects"));
      message("Repository registered: " + project.repository + ".", "success");
    } catch (error) {message(String(error), "error");}
    finally {setBusy(false);}
  }
  async function deploy() {
    if (!projectId) {message("Register a project first.", "error"); return;}
    if (!/^[a-fA-F0-9]{40}$/.test(sha.trim())) {message("Enter a valid 40-character hexadecimal commit SHA.", "error"); return;}
    setBusy(true);
    try {
      const key = crypto.randomUUID();
      const result: {status: string; message: string} = await api(
        "/api/projects/" + encodeURIComponent(projectId) + "/deployments",
        "POST", {commit_sha: sha.trim(), environment: "staging"},
        {"Idempotency-Key": key}
      );
      message(result.status + ": " + result.message, "success");
      setDeployments(await api("/api/deployments"));
    } catch (error) {message(String(error), "error");}
    finally {setBusy(false);}
  }

  const pending = deployments.filter(d => d.status === "workflow_dispatched").length;
  const shaValid = /^[a-fA-F0-9]{40}$/.test(sha.trim());
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" aria-label="StackFlow home"><span className="brand-icon"><Icon name="layers" size={20}/></span><span>stackflow<span className="brand-dot">.</span></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">S</span><span className="workspace-label">Personal workspace<small>Development environment</small></span><Icon name="chevron" size={15}/></div>
      <div className="nav-group-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Primary navigation">
        <a className="nav-link selected" href="#overview"><Icon name="overview"/><span>Overview</span><span className="nav-current"/></a>
        <a className="nav-link" href="#projects"><Icon name="projects"/><span>Projects</span></a>
        <a className="nav-link" href="#deployments"><Icon name="rocket"/><span>Deployments</span></a>
        <a className="nav-link" href="#operations"><Icon name="activity"/><span>Observability</span></a>
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-callout"><span className="callout-symbol"><Icon name="sparkle" size={15}/></span><strong>Built for safer shipping</strong><p>Automated checks. Explicit approval. Git as the source of truth.</p><a href={workflowUrl} target="_blank" rel="noopener noreferrer">View workflows <Icon name="arrow" size={14}/></a></div>
      <div className="sidebar-bottom"><span className="online-pulse"/><span>Local-first prototype<small>StackFlow v0.2</small></span></div>
    </aside>

    <main className="main-area" id="overview">
      <div className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14}/><strong>Overview</strong></div>
        <div className="top-actions"><span className={"api-indicator " + (health?.status === "healthy" ? "connected" : "")}><span className="tiny-pulse"/>{health?.status === "healthy" ? "API online" : "API not verified"}</span><a href={workflowUrl} target="_blank" rel="noopener noreferrer" className="top-github" aria-label="Open GitHub Actions"><Icon name="github" size={19}/></a></div>
      </div>

      <section className="hero-panel" aria-labelledby="hero-heading">
        <WaveBackdrop/>
        <div className="hero-copy"><div className="hero-label"><span className="label-spark"><Icon name="sparkle" size={12}/></span> THE NEXT ERA OF DEVOPS <span className="label-line"/></div>
          <h1 id="hero-heading">Ship with <span className="gradient-text">confidence.</span><br/>Deploy with control.</h1>
          <p>A refined command center for CI/CD and GitOps. Go from commit to reviewed release proposals with visibility at every step.</p>
          <div className="hero-actions"><a className="button button-primary" href="#projects">Open workspace <Icon name="arrow" size={17}/></a><a className="button button-ghost" href="#pipeline">Explore pipeline <Icon name="chevron" size={16}/></a></div>
          <div className="hero-footnote"><span className="footnote-dot"/><span>Designed for GitOps-first delivery</span><span className="footnote-divider"/><span>Human-reviewed production</span></div>
        </div>
        <AnimatedRobotHero/>
      </section>

      <div className="section-title-row"><div><div className="section-kicker">LIVE WORKSPACE</div><h2>At a glance <span className="subtle-heading">/ Your environment</span></h2></div><button className="text-button" type="button" onClick={refresh} disabled={busy}><Icon name="refresh" size={15}/> Refresh data</button></div>
      <section className="metrics" aria-label="Workspace metrics">
        <div className="metric"><div className="metric-head"><span>Projects</span><span className="metric-icon"><Icon name="projects" size={17}/></span></div><div className="metric-value">{projects.length}<span className="metric-unit">registered</span></div><div className="metric-foot"><span className="metric-dot purple"/><span>Allowlisted repositories only</span></div></div>
        <div className="metric"><div className="metric-head"><span>Workflow requests</span><span className="metric-icon"><Icon name="rocket" size={17}/></span></div><div className="metric-value">{deployments.length}<span className="metric-unit">total</span></div><div className="metric-foot"><span className="metric-dot pink"/><span>Recorded by platform API</span></div></div>
        <div className="metric"><div className="metric-head"><span>Awaiting verification</span><span className="metric-icon"><Icon name="clock" size={17}/></span></div><div className="metric-value">{pending}<span className="metric-unit">requests</span></div><div className="metric-foot"><span className="metric-dot amber"/><span>Not confirmed deployed</span></div></div>
        <div className="metric"><div className="metric-head"><span>GitHub integration</span><span className="metric-icon"><Icon name="github" size={17}/></span></div><div className="metric-value metric-connection">{health ? (health.github_connected ? "Configured" : "Not set") : "Unknown"}</div><div className="metric-foot"><span className={"metric-dot " + (health?.github_connected ? "purple" : "muted")}/><span>{health?.github_connected ? "Backend token is present" : "Backend configuration status"}</span></div></div>
      </section>

      <section className="pipeline-card" id="pipeline">
        <div className="panel-heading"><div><div className="section-kicker">DELIVERY ARCHITECTURE</div><h2>One continuous workflow.</h2><p>From a trusted source commit to an explicitly reviewed GitOps change.</p></div><span className="section-pill"><Icon name="branch" size={13}/> GitOps flow</span></div>
        <div className="pipeline-steps">
          <div className="pipeline-step"><span className="step-num">01</span><span className="step-icon"><Icon name="branch" size={22}/></span><strong>Source</strong><small>Approved Git commit</small></div>
          <span className="pipeline-connector" aria-hidden="true"><Icon name="arrow" size={17}/></span>
          <div className="pipeline-step"><span className="step-num">02</span><span className="step-icon"><Icon name="shield" size={22}/></span><strong>Validate</strong><small>Tests & security gates</small></div>
          <span className="pipeline-connector" aria-hidden="true"><Icon name="arrow" size={17}/></span>
          <div className="pipeline-step"><span className="step-num">03</span><span className="step-icon"><Icon name="box" size={22}/></span><strong>Build</strong><small>Image digest & proposal</small></div>
          <span className="pipeline-connector" aria-hidden="true"><Icon name="arrow" size={17}/></span>
          <div className="pipeline-step"><span className="step-num">04</span><span className="step-icon"><Icon name="lock" size={22}/></span><strong>Approve</strong><small>Human-reviewed release</small></div>
        </div>
        <div className="pipeline-caption"><Icon name="shield" size={15}/> Production changes remain behind an explicit approval boundary.</div>
      </section>

      <div className={"notice notice-" + noticeKind} role="status" aria-live="polite"><span className="notice-icon"><Icon name={noticeKind === "success" ? "check" : noticeKind === "error" ? "shield" : "activity"} size={17}/></span><span>{notice}</span></div>

      <div className="section-title-row cards-title"><div><div className="section-kicker">CONTROL CENTER</div><h2>Manage your delivery</h2></div><span className="section-note"><span className="mini-lock"><Icon name="lock" size={13}/></span> Local token · not OAuth</span></div>
      <section className="form-grid">
        <div className="panel form-panel" id="projects">
          <div className="panel-heading compact"><div className="panel-symbol"><Icon name="projects" size={19}/></div><div><h3>Workspace access</h3><p>Connect to the local API and register an approved source repository.</p></div></div>
          <label htmlFor="local-token">Local API token</label><div className="input-row"><input id="local-token" type={showToken ? "text" : "password"} autoComplete="off" spellCheck={false} placeholder="DEV_ADMIN_API_TOKEN" value={token} onChange={event=>setToken(event.target.value)}/><button className="reveal-button" type="button" aria-label={showToken ? "Hide token" : "Show token"} onClick={()=>setShowToken(value=>!value)}>{showToken ? "Hide" : "Show"}</button><button className="button button-primary form-action" type="button" disabled={busy || !token.trim()} onClick={refresh}>Connect</button></div>
          <label htmlFor="repository">Approved repository</label><div className="input-row"><input id="repository" spellCheck={false} value={repo} onChange={event=>setRepo(event.target.value)}/><button className="button button-outline form-action" type="button" disabled={busy || !token.trim() || !repo.trim()} onClick={register}>Register</button></div>
          <div className="registered-list"><div className="list-label">REGISTERED SOURCES <span>{projects.length}</span></div>{projects.length ? projects.map(project=><div className="registered-item" key={project.id}><span className="repo-symbol"><Icon name="github" size={17}/></span><span className="repo-title">{project.repository}<small>Authorized source</small></span><span className="small-badge"><span className="badge-dot"/> Registered</span></div>) : <p className="empty-text">No projects yet. Connect to load your workspace.</p>}</div>
        </div>
        <div className="panel form-panel">
          <div className="panel-heading compact"><div className="panel-symbol violet"><Icon name="rocket" size={19}/></div><div><h3>Request staging deployment</h3><p>Dispatch CI for the latest approved <code>main</code> commit. This does not confirm a live deployment.</p></div></div>
          <label htmlFor="project-select">Target project</label><select id="project-select" value={projectId} onChange={event=>setProjectId(event.target.value)}><option value="">Select a registered project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.repository}</option>)}</select>
          <label htmlFor="commit-sha">Git commit SHA <span className="field-hint">40 hexadecimal characters</span></label><input id="commit-sha" type="text" inputMode="text" autoComplete="off" spellCheck={false} placeholder="e.g. 9c89b75…" value={sha} onChange={event=>setSha(event.target.value)} maxLength={40}/>
          <div className="sha-counter">{sha.trim().length}/40 {sha.length === 40 && !shaValid ? <span>· Invalid hex SHA</span> : null}</div>
          <button className="button button-primary deploy-button" type="button" disabled={busy || !projectId || !shaValid} onClick={deploy}><Icon name="rocket" size={18}/> {busy ? "Processing…" : "Request staging build"} <Icon name="arrow" size={17}/></button>
          <div className="secure-hint"><Icon name="lock" size={14}/> Production promotion requires a reviewed GitOps PR. No direct cluster mutations.</div>
        </div>
      </section>

      <section className="panel deployments-panel" id="deployments">
        <div className="panel-heading history-heading"><div><div className="section-kicker">AUDIT TRAIL</div><h2>Deployment requests</h2><p>Dispatch records only. Verify GitHub Actions and cluster health separately.</p></div><button className="button button-outline refresh-small" type="button" disabled={busy} onClick={refresh}><Icon name="refresh" size={15}/> Refresh</button></div>
        <div className="history-table" role="table" aria-label="Deployment requests">
          <div className="history-row history-header" role="row"><span role="columnheader">COMMIT</span><span role="columnheader">ENVIRONMENT</span><span role="columnheader">WORKFLOW STATUS</span><span role="columnheader">REQUESTED</span></div>
          {deployments.length ? deployments.map(deployment=><div className="history-row" role="row" key={deployment.id}><span role="cell" className="sha-text"><Icon name="branch" size={14}/>{deployment.commit_sha.slice(0,10)}</span><span role="cell"><span className="env-badge">{deployment.environment}</span></span><span role="cell"><span className="status-badge"><span className="status-dot"/>{deployment.status === "workflow_dispatched" ? "Dispatched · unverified" : deployment.status.replaceAll("_", " ")}</span></span><span role="cell">{new Date(deployment.created_at).toLocaleString()}</span></div>) : <div className="history-empty"><span className="history-empty-icon"><Icon name="layers" size={22}/></span><strong>No deployment requests yet</strong><p>Once a workflow is dispatched, its record will appear here.</p></div>}
        </div>
      </section>

      <section className="operations-panel" id="operations"><div className="operations-copy"><span className="ops-icon"><Icon name="activity" size={21}/></span><div><div className="section-kicker">OPERATIONS & VISIBILITY</div><h2>Keep an eye on every release.</h2><p>Prometheus and Grafana are available via the optional local monitoring profile. Live cluster verification is a separate step.</p></div></div><a className="button button-outline ops-action" href={workflowUrl} target="_blank" rel="noopener noreferrer">Open GitHub Actions <Icon name="external" size={16}/></a></section>

      <footer><span><span className="footer-brand">stackflow<span className="brand-dot">.</span></span> © 2026 · GitOps-first delivery</span><span>Local-first MVP <span className="footer-sep">·</span> Production requires human approval</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
