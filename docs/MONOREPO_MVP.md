# StackFlow runnable MVP — single-repository development

## Why there is application code here

The original technical specification calls for **three repositories**: application source, GitOps desired state and platform. At this stage, only `mohaasdt/stackflow-gitops` exists. To make meaningful progress without waiting for other repositories, this branch also includes `services/demo-app` and `services/platform` as **temporary, logically isolated subdirectories**. The monorepo is a development compromise, **not** a claim that the required three-repository isolation has been achieved.

## What is implemented

- FastAPI demo workload with health/metrics endpoints and tests.
- Test, lint, container build, Trivy scan and immutable GHCR image publication with GitHub Actions.
- Automatic **staging pull request proposal** with the released digest. There is no direct push deployment.
- Separate GitOps base and staging/production overlays, Argo CD manifests, production manual sync.
- Local operator API with strict single-repository allowlist, database-backed project catalog, dispatch request history, idempotency and an audit event.
- React control-center dashboard, local PostgreSQL, Prometheus and Grafana Compose profile.

## Local run (requires Docker)

1. Clone the repository and copy `.env.example` to `.env`. Set a strong random `DEV_ADMIN_API_TOKEN`, and `GRAFANA_ADMIN_PASSWORD`. Do not commit `.env`.
2. Run `docker compose up --build`.
3. Open the web portal at `http://localhost:5173`; enter the local API token. Register `mohaasdt/stackflow-gitops`.
4. Demo workload: `http://localhost:8000/health/ready`. Backend health: `http://localhost:8001/health`.
5. Optional local monitoring: `docker compose --profile monitoring up --build`. Prometheus is on localhost:9090; Grafana on localhost:3000.

For **real workflow dispatch from the portal**, also set `GITHUB_API_TOKEN` **server-side** to a narrowly-scoped GitHub token with permission to run Actions workflows on the trusted repo. Never put it in the browser. Backend verifies the commit is the latest `main` SHA. The response status `workflow_dispatched` is **not** proof CI, Argo CD, Kubernetes or health completed.

## First GitOps staging deployment

1. Confirm GitHub workflow permissions permit GitHub Actions to push branches and create PRs; enforce independent human review for `main`.
2. Check the `Demo App - Test Scan Build and Propose` action. Successful CI publishes GHCR image with immutable SHA/digest and proposes staging PR. If the image security gate fails, **do not disable it just to ship**; update dependencies/base images and investigate.
3. Verify staging PR's exact digest and merge after review. Protect GitOps `main`; token-created PRs may not invoke a separate PR workflow.
4. Prepare a local kind cluster and install Argo CD with approved bootstrap; **not provided automatically by this repo**. Install `argocd/project.yaml`, then `argocd/demo-staging.yaml` only after real GHCR image exists and is pullable.
5. Confirm Argo CD Synced and Healthy, actual image digest, readiness/smoke checks.
6. After that, prepare a reviewed production overlay change with `python3 scripts/promote.py`. Require admin approval and explicit manual production sync. For rollback, revert only the affected GitOps change.

## Current limitations (explicit)

- No connected local cluster or verified live end-to-end GitOps deployment in this workspace.
- GitHub OAuth, role-based multi-user permissions, production approval UI, webhook correlation, automated health verification, Terraform infrastructure bootstrap, log streaming and tested rollback **remain to be implemented**.
- SQLite auto table creation for local tests; PostgreSQL used in Compose. Database migrations and proper access/session management are future hardening tasks.
- GitHub Actions publishes CI artifacts, but external GHCR permissions, package visibility and repository protections depend on the account and must be validated.
- `on:workflow_dispatch` with `requested_sha` checks an exact SHA match; changing `main` between API verification and execution will cause a safe CI failure.

## How to split later

Move `services/demo-app/*` into `stackflow-demo-app` and `services/platform/*` with root Compose/monitoring into `stackflow-platform`. Adapt CI working directories, the fixed dispatch workflow path, GitHub App permissions and GHCR package ownership; keep `apps/`, `argocd/`, `scripts/` and associated config validation in `stackflow-gitops`.
