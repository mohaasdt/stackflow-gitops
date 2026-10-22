#!/usr/bin/env python3
"""Static validation of the StackFlow GitOps scaffold.

Does NOT contact GitHub/GHCR, Argo CD, or Kubernetes. Rendering is a separate CI step.
"""
import argparse
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "ghcr.io/mohaasdt/stackflow-demo-app"
REPO = "https://github.com/mohaasdt/stackflow-gitops.git"
ZERO = "sha256:" + "0" * 64
DIGEST = re.compile(r"sha256:[0-9a-f]{64}\Z")


def load(path):
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def validate_environment(environment, deployable=False):
    path = ROOT / "apps/demo/overlays" / environment / "kustomization.yaml"
    config = load(path)
    expected_namespace = "demo-" + environment
    assert config["kind"] == "Kustomization", path
    assert config["namespace"] == expected_namespace, path
    assert set(config["resources"]) == {"../../base", "namespace.yaml"}, path
    assert len(config["images"]) == 1, path
    image = config["images"][0]
    assert image["name"] == IMAGE, path
    assert image["newName"] == IMAGE, path
    assert "newTag" not in image, "mutable tag in " + str(path)
    digest = image.get("digest", "")
    assert DIGEST.fullmatch(digest), "invalid image digest in " + str(path)
    if deployable:
        assert digest != ZERO, "bootstrap digest is not deployable: " + environment

    namespace = load(path.parent / "namespace.yaml")
    assert namespace["kind"] == "Namespace"
    assert namespace["metadata"]["name"] == expected_namespace
    app = load(ROOT / "argocd" / ("demo-" + environment + ".yaml"))
    assert app["kind"] == "Application"
    assert app["spec"]["project"] == "stackflow"
    assert app["spec"]["source"]["repoURL"] == REPO
    assert app["spec"]["source"]["targetRevision"] == "main"
    assert app["spec"]["source"]["path"] == "apps/demo/overlays/" + environment
    assert app["spec"]["destination"]["namespace"] == expected_namespace
    return digest


def validate_common():
    base = load(ROOT / "apps/demo/base/deployment.yaml")
    service = load(ROOT / "apps/demo/base/service.yaml")
    project = load(ROOT / "argocd/project.yaml")
    assert base["kind"] == "Deployment"
    assert service["kind"] == "Service"
    assert service["spec"]["selector"] == base["spec"]["selector"]["matchLabels"]
    assert service["spec"]["ports"][0]["targetPort"] == "http"
    container = base["spec"]["template"]["spec"]["containers"][0]
    assert container["ports"][0]["name"] == "http"
    assert container["readinessProbe"]["httpGet"]["path"] == "/health/ready"
    assert container["livenessProbe"]["httpGet"]["path"] == "/health/live"
    assert container["securityContext"]["allowPrivilegeEscalation"] is False
    assert base["spec"]["template"]["spec"]["securityContext"]["runAsNonRoot"] is True
    assert project["kind"] == "AppProject"
    assert REPO in project["spec"]["sourceRepos"]
    allowed = {item["namespace"] for item in project["spec"]["destinations"]}
    assert allowed == {"demo-staging", "demo-production"}
    prod = load(ROOT / "argocd/demo-production.yaml")
    assert "automated" not in prod["spec"]["syncPolicy"], "production must remain manual"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment", choices=("staging", "production"))
    parser.add_argument("--deployable", action="store_true",
                        help="reject the zero-digest bootstrap placeholder")
    args = parser.parse_args()
    environments = [args.environment] if args.environment else ["staging", "production"]
    try:
        validate_common()
        for environment in environments:
            digest = validate_environment(environment, args.deployable)
            status = "BOOTSTRAP ONLY" if digest == ZERO else "digest pinned"
            print(f"{environment}: valid configuration; {status}")
        print("Static GitOps validation passed")
    except (AssertionError, ValueError, KeyError, TypeError, yaml.YAMLError) as exc:
        parser.exit(1, "GitOps validation failed: " + str(exc) + "\n")


if __name__ == "__main__":
    main()
