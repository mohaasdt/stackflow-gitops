# StackFlow — Self-Service DevOps Platform

StackFlow is a **local-first, educational cloud-native delivery platform** integrating FastAPI, React, GitHub Actions, Docker, GHCR, Kubernetes, Argo CD, Kustomize, Terraform, Prometheus and Grafana.

> **Scope:** runnable local **MVP**, not yet production-ready or verified end-to-end on a real Kubernetes cluster. The technical specification calls for three repositories, but this repository currently also contains the demo application and portal as separate **temporary monorepo directories**, because only one StackFlow repository has been created.

## Architecture

```text
React portal :5173 --> FastAPI platform API :8001 --> GitHub Actions workflow
         |                    |                              |
      browser             PostgreSQL                    Test + Trivy
                                                             |
                                                         GHCR digest
                                                             |
                                             reviewed PR updates staging overlay
                                                             |
                                              Argo CD --> kind/Kubernetes
                                                             |
                                             Prometheus / Grafana monitoring
```

## Source tree

- `services/demo-app/` — deployable stateless FastAPI demo and tests.
- `services/platform/backend/` — local-first request API with strict allowlist, idempotency, dispatch and audit.
- `services/platform/frontend/` — React + TypeScript control center.
- `apps/demo/base/` and `apps/demo/overlays/{staging,production}/` — Kubernetes desired state.
- `argocd/` — constrained Argo CD project and applications.
- `infra/kind/` and `infra/terraform/` — explicit local cluster and Argo CD bootstrap.
- `monitoring/` — Prometheus scrape config and provisioned Grafana data source.
- `.github/workflows/` — automated tests, image scan/publication and staging PR proposals.

## Start the portal locally

Prerequisites: Docker and Docker Compose. Create a **private** environment file and set a strong random local token:

```bash
cp .env.example .env
# edit .env: DEV_ADMIN_API_TOKEN and GRAFANA_ADMIN_PASSWORD
docker compose up --build
```

Open **http://localhost:5173**. Enter `DEV_ADMIN_API_TOKEN`, choose **Connect**, then register `mohaasdt/stackflow-gitops`. Demo API is `http://localhost:8000/health/ready`.

To enable an actual staging workflow dispatch from the web portal, configure **`GITHUB_API_TOKEN` in the backend environment** with minimal Actions permissions for this exact repository. Use the current 40-character `main` SHA. Never paste GitHub tokens into browser inputs.

Local monitoring:

```bash
docker compose --profile monitoring up --build
```

Prometheus: **http://localhost:9090**. Grafana: **http://localhost:3000**.

## GitOps release

1. GitHub Actions tests demo code and scans the Docker image.
2. On passing security gates, CI publishes the exact image digest to GHCR, then **proposes** a staging PR. GitHub workflow permissions must allow creating PRs.
3. A trusted human reviews and merges staging. Argo CD reconciles approved Git when the local cluster and Argo CD are installed.
4. Production promotion copies **the same tested digest**, but requires staged health confirmation and an administrator-reviewed PR. Production sync is manual.
5. A rollback reverts only the relevant GitOps change; reconfirm running image digest and health.

The initial overlay contains an all-zero digest **placeholder**: **never install the Argo CD Application before publishing and merging a real digest**.

Read [MVP setup and limitations](docs/MONOREPO_MVP.md), [cluster bootstrap](infra/terraform/README.md), [automation boundaries](docs/AUTOMATION.md), and [verification checklist](docs/VERIFICATION.md).

**Security:** Do not commit credentials, Terraform state, `kubeconfig`, logs containing tokens, or unreviewed production changes. GitHub OAuth/RBAC and tested full-cluster deployment are future hardening requirements, not features to claim complete.
