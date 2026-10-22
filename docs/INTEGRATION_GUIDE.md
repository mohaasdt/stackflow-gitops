# Connecting all three StackFlow repositories

**Live repository:** `mohaasdt/stackflow-gitops`. The other two code packages are currently prepared offline and need separate GitHub repositories: `stackflow-demo-app` and `stackflow-platform`.

## Who owns what?

| Repository | Responsibility |
| --- | --- |
| `stackflow-demo-app` | Tested FastAPI workload; GitHub Actions CI, Docker/Trivy, immutable GHCR image publication |
| `stackflow-gitops` | Kubernetes/Kustomize desired state, PR validation, Argo CD Applications, exact image digests |
| `stackflow-platform` | Portal, API, PostgreSQL, optional CI dispatch, kind/Terraform Argo CD bootstrap, monitoring demo |

## Release 1: staging

1. Create the two missing GitHub repositories and push their corresponding starter folders.
2. In `stackflow-gitops`, configure real GitHub branch protection/review requirements. The GitOps repository was public at the time of this guide; GitHub package visibility is independent.
3. Run `stackflow-demo-app` CI on `main`; inspect tests and security scan. On a passing run, it publishes `ghcr.io/mohaasdt/stackflow-demo-app@sha256:<digest>`.
4. Optionally create a GitHub App / fine-grained token with **contents and pull request permissions limited to `stackflow-gitops`**. Set its value as the demo app repository secret `GITOPS_PR_TOKEN`. This is an automation credential, NOT a Kubernetes admin credential.
5. After publishing, CI opens a staging digest-update PR (or run the GitOps repository's `Propose staging release` workflow with the digest).
6. Review and merge the staging PR. Do not install Argo CD Applications before a real digest exists.
7. Prepare local kind cluster and Argo CD from `stackflow-platform/infra/terraform/README.md`. Apply `argocd/project.yaml` and `argocd/demo-staging.yaml`.
8. Verify desired Git revision, Argo CD Sync, Argo CD Health, Kubernetes observed image digest, and `/health/ready`/smoke checks. These are distinct evidence gates.

## Release 2: production

Only after staging runs the exact target digest and passes checks, the administrator may prepare a production configuration PR:

```bash
python3 scripts/promote.py
python3 scripts/validate.py --environment production --deployable
```

The helper updates a **local file only**. Obtain independent administrator approval, merge to main and perform an authorized production Argo CD sync. The production Argo CD Application intentionally has **no automatic sync** in the baseline.

## Rollback

Submit a narrowly scoped Git revert PR for the affected environment. After approval and merge, reconcile the Git revision (manually for production). Confirm observed digest and health before calling recovery complete. Database or persistent-data rollback is **not** performed by this procedure.

## Limitations

Automations proposed here are code configurations, not proof that CI, GHCR, Kubernetes, Argo CD or Grafana have been fully wired together. The platform's local-token authentication and mock-independent approval guard are **prototype only**. An actual healthy release requires live verification, as defined above.
