# StackFlow GitOps: local bootstrap and release guide

> Status: **scaffold only**. Kubernetes, Argo CD, image publication, and branch protections are **not** set up by committing this repository.

## 1. Separate repositories

- `mohaasdt/stackflow-demo-app`: FastAPI demo source, tests, Dockerfile, CI / GHCR image publication.
- `mohaasdt/stackflow-gitops`: this repository; deployment desired state, not source code.
- `mohaasdt/stackflow-platform`: developer portal, API, and infrastructure bootstrap.

Until the demo-app image exists in GHCR, this repository uses an **all-zero digest placeholder**. It is intentionally not a deployable image. **Do not install the Argo CD Applications yet.**

## 2. Access control (before connecting Argo CD)

1. Configure a reviewed change / administrator approval policy for `main` (branch rulesets if available, or documented enforced approvals in the platform).
2. Do not allow developers to push arbitrary production changes to `main`. This public demo repo is **not an untrusted multi-tenant service**.
3. Keep kubeconfigs, GH tokens, credentials and real secret manifests out of Git.
4. Keep the GitHub Actions token minimal; no workflow here receives kubeconfig or cluster admin access.

**Note:** GitHub repository protections and visibility are account settings and have not been configured by this scaffold. GitHub Actions-created PRs using `GITHUB_TOKEN` do not normally trigger separate PR workflows: the staging proposal workflow runs checks itself; require independent review, and use a narrowly scoped GitHub App token for a stricter status-check-gated flow.

## 3. Local prerequisites

- Docker with a working container runtime
- `kind` and `kubectl`
- Argo CD installed in the `argocd` namespace (bootstrap owned by the **platform/infrastructure** repository, not Terraform managing the same app manifests)
- a trusted `stackflow-demo-app` container published to GHCR with a real immutable `sha256` digest

A single local kind cluster with separate namespaces is an academic demonstration only, not isolated production infrastructure.

## 4. Render and validate locally

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/validate.py
kubectl kustomize apps/demo/overlays/staging
kubectl kustomize apps/demo/overlays/production
```

Use `python3 scripts/validate.py --deployable` to **fail** until both overlays have real digests. For first staging deployment, use `--environment staging --deployable`.

## 5. First staging release

After the app CI has tested, scanned and published the image, use the **full image digest** (not a tag):

```bash
python3 scripts/set-digest.py --environment staging --digest sha256:<64-lowercase-hex-characters>
python3 scripts/validate.py --environment staging --deployable
kubectl kustomize apps/demo/overlays/staging
```

Commit the staging change through a **reviewed PR**. Alternatively, authorized maintainers can run the `Propose staging release` Actions workflow, supplying the image digest; it proposes a PR rather than deploying.

Only **after** the first real staging digest is merged, the cluster is bootstrapped, and repo access is protected:

```bash
kubectl apply -f argocd/project.yaml
kubectl apply -f argocd/demo-staging.yaml
```

Argo CD tracks Git `main`; it must be able to pull the image (public GHCR package, or a namespace-scoped imagePullSecret configured securely outside this repo). Verify Argo CD **Sync** and **Health** separately, then check the app's readiness endpoint.

## 6. Production promotion (separate approval)

Do not rebuild the container. Require (a) successful CI checks, (b) healthy staging with the **observed target digest**, and (c) administrator review.

```bash
python3 scripts/promote.py
python3 scripts/validate.py --environment production --deployable
```

Open a production PR; after approval and merge, install `argocd/demo-production.yaml` if not installed. Production automatic sync is **disabled** in the scaffold: an authorized operator must explicitly sync it after merge. Do not treat a staging image digest alone as proof of healthy staging.

## 7. Rollback

Revert **only the faulty application's overlay change in the affected environment** using a reviewed Git revert PR; merge it. Argo CD restores staging automatically; for production an authorized operator syncs the approved Git revision. Verify the image digest actually running and pass health/smoke checks. This reverts deployment configuration, **not** a database migration or persistent data.

## 8. Next implementation steps

- Complete `stackflow-demo-app` CI: lint, unit tests, Trivy scan, immutable GHCR publication.
- Complete kind + Terraform ownership boundary + Argo CD bootstrap in `stackflow-platform`.
- Add GitHub App / OAuth integration and immutable release tracking to the platform.
- Add Prometheus and Grafana and prove smoke tests, approval, audit, and rollback scenarios.
