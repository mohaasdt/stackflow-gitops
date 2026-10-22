"""Local-first StackFlow orchestration API.

Explicitly a single-operator prototype: the bearer token is not GitHub OAuth.
GitHub workflow dispatch needs a separate server-side, fine-grained token.
"""
import hmac
import json
import os
import re
import uuid
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy import DateTime, ForeignKey, String, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.responses import Response

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stackflow.db")
ALLOWED_REPO = os.getenv("ALLOWED_GITHUB_REPO", "mohaasdt/stackflow-gitops").lower()
LOCAL_TOKEN = os.getenv("DEV_ADMIN_API_TOKEN", "")
GITHUB_TOKEN = os.getenv("GITHUB_API_TOKEN", "")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    repository: Mapped[str] = mapped_column(String(200), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Deployment(Base):
    __tablename__ = "deployments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    commit_sha: Mapped[str] = mapped_column(String(40))
    environment: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(40))
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    action: Mapped[str] = mapped_column(String(80))
    deployment_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

Base.metadata.create_all(bind=engine)  # MVP only. Use migrations before multi-user release.
app = FastAPI(title="StackFlow Platform API", version="0.2.0")
requests_total = Counter("stackflow_api_requests_total", "Project/deployment API requests", ["action"])

def db_session():
    with SessionLocal() as session:
        yield session

def authenticate(authorization: str | None = Header(default=None)):
    if not LOCAL_TOKEN:
        raise HTTPException(503, "Set DEV_ADMIN_API_TOKEN in server environment")
    if not authorization or not hmac.compare_digest(authorization, "Bearer " + LOCAL_TOKEN):
        raise HTTPException(401, "Valid local administrator token required")

class NewProject(BaseModel):
    repository: str

class NewDeployment(BaseModel):
    commit_sha: str = Field(pattern=r"^[a-fA-F0-9]{40}$")
    environment: str = "staging"

def github_dispatch(commit_sha: str, request_id: str):
    """Verify requested ref is current main and dispatch only the fixed, approved workflow."""
    if not GITHUB_TOKEN:
        raise HTTPException(503, "GitHub integration not configured: set GITHUB_API_TOKEN on backend")
    if not re.fullmatch(r"[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+", ALLOWED_REPO):
        raise HTTPException(500, "Unsafe allowed GitHub repo configuration")
    base = "https://api.github.com/repos/" + ALLOWED_REPO
    headers = {
        "Authorization": "Bearer " + GITHUB_TOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "stackflow-prototype",
    }

    def fetch_json(url: str, data: dict | None = None):
        req = Request(
            url,
            data=json.dumps(data).encode() if data is not None else None,
            headers={**headers, **({"Content-Type": "application/json"} if data is not None else {})},
            method="POST" if data is not None else "GET",
        )
        try:
            with urlopen(req, timeout=12) as response:
                content = response.read()
                return json.loads(content) if content else None
        except HTTPError as exc:
            # Never include returned upstream body; it may contain integration details.
            raise HTTPException(502, f"GitHub API returned HTTP {exc.code}") from exc
        except (URLError, TimeoutError) as exc:
            raise HTTPException(502, "GitHub is temporarily unreachable") from exc

    branch = fetch_json(base + "/commits/main")
    if not isinstance(branch, dict) or branch.get("sha", "").lower() != commit_sha:
        raise HTTPException(409, "Requested commit must match the latest approved main commit")
    fetch_json(base + "/actions/workflows/build-demo.yml/dispatches",
               {"ref": "main", "inputs": {"requested_sha": commit_sha, "request_id": request_id}})

@app.get("/health")
def health():
    return {"status": "healthy", "mode": "local-prototype", "github_connected": bool(GITHUB_TOKEN)}

@app.get("/metrics", include_in_schema=False)
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/api/projects", dependencies=[Depends(authenticate)])
def list_projects(db: Session = Depends(db_session)):
    requests_total.labels(action="list_projects").inc()
    rows = db.scalars(select(Project).order_by(Project.created_at.desc())).all()
    return [{"id": row.id, "repository": row.repository} for row in rows]

@app.post("/api/projects", status_code=201, dependencies=[Depends(authenticate)])
def create_project(payload: NewProject, db: Session = Depends(db_session)):
    if payload.repository.lower() != ALLOWED_REPO:
        raise HTTPException(403, "Only the explicitly allowed repository can be registered")
    if db.scalar(select(Project).where(Project.repository == ALLOWED_REPO)):
        raise HTTPException(409, "Project already registered")
    record = Project(id=str(uuid.uuid4()), repository=ALLOWED_REPO, created_at=datetime.now(timezone.utc))
    db.add(record)
    db.commit()
    requests_total.labels(action="create_project").inc()
    return {"id": record.id, "repository": record.repository}

@app.get("/api/deployments", dependencies=[Depends(authenticate)])
def list_deployments(db: Session = Depends(db_session)):
    rows = db.scalars(select(Deployment).order_by(Deployment.created_at.desc()).limit(50)).all()
    return [{"id": row.id, "project_id": row.project_id, "commit_sha": row.commit_sha,
             "environment": row.environment, "status": row.status,
             "created_at": row.created_at.isoformat()} for row in rows]

@app.get("/api/deployments/{deployment_id}", dependencies=[Depends(authenticate)])
def deployment_details(deployment_id: str, db: Session = Depends(db_session)):
    row = db.get(Deployment, deployment_id)
    if not row:
        raise HTTPException(404, "Deployment request not found")
    return {"id": row.id, "project_id": row.project_id, "commit_sha": row.commit_sha,
            "environment": row.environment, "status": row.status}

@app.post("/api/projects/{project_id}/deployments", status_code=202, dependencies=[Depends(authenticate)])
def request_deployment(
    project_id: str, payload: NewDeployment, idempotency_key: str | None = Header(default=None),
    db: Session = Depends(db_session),
):
    if payload.environment != "staging":
        raise HTTPException(403, "Production promotion requires a separate reviewed approval")
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not registered")
    if not idempotency_key or not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", idempotency_key):
        raise HTTPException(422, "Idempotency-Key must contain 8-128 safe characters")
    requested_sha = payload.commit_sha.lower()
    existing = db.scalar(select(Deployment).where(Deployment.idempotency_key == idempotency_key))
    if existing:
        if existing.project_id != project_id or existing.commit_sha != requested_sha or existing.environment != payload.environment:
            raise HTTPException(409, "Idempotency key already used for another request")
        return {"id": existing.id, "status": existing.status, "message": "Existing request returned"}
    # Fail closed before persisting: never report a dispatched job when GitHub was not contacted.
    new_id = str(uuid.uuid4())
    github_dispatch(requested_sha, new_id)
    record = Deployment(id=new_id, project_id=project_id, commit_sha=requested_sha,
                        environment="staging", status="workflow_dispatched",
                        idempotency_key=idempotency_key, created_at=datetime.now(timezone.utc))
    db.add(record)
    db.add(AuditEvent(id=str(uuid.uuid4()), action="staging_workflow_dispatched",
                      deployment_id=new_id, created_at=datetime.now(timezone.utc)))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Duplicate request; refresh deployment history") from exc
    requests_total.labels(action="request_deployment").inc()
    return {"id": new_id, "status": "workflow_dispatched",
            "message": "GitHub Actions dispatch accepted; not a confirmed Kubernetes deployment."}

@app.get("/api/events", dependencies=[Depends(authenticate)])
def audit_events(db: Session = Depends(db_session)):
    rows = db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100)).all()
    return [{"action": row.action, "deployment_id": row.deployment_id,
             "created_at": row.created_at.isoformat()} for row in rows]
