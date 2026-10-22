#!/usr/bin/env python3
"""Pin a validated, immutable GHCR digest in exactly one GitOps environment.

This edits a local overlay file only. A reviewed Git PR is required to deploy.
"""
import argparse
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "ghcr.io/mohaasdt/stackflow-demo-app"
DIGEST_PATTERN = re.compile(r"sha256:[0-9a-f]{64}\Z")


def set_digest(environment: str, digest: str) -> Path:
    if environment not in {"staging", "production"}:
        raise ValueError("unsupported environment")
    if not DIGEST_PATTERN.fullmatch(digest) or digest == "sha256:" + "0" * 64:
        raise ValueError("supply a non-zero sha256:<64 lowercase hexadecimal characters> digest")
    path = ROOT / "apps/demo/overlays" / environment / "kustomization.yaml"
    with path.open(encoding="utf-8") as handle:
        content = yaml.safe_load(handle)
    images = content.get("images", [])
    if len(images) != 1 or images[0].get("name") != IMAGE or images[0].get("newName") != IMAGE:
        raise ValueError("unexpected image configuration; refusing to replace")
    images[0].pop("newTag", None)
    images[0]["digest"] = digest
    path.write_text(yaml.safe_dump(content, sort_keys=False), encoding="utf-8")
    return path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment", required=True, choices=("staging", "production"))
    parser.add_argument("--digest", required=True)
    args = parser.parse_args()
    try:
        result = set_digest(args.environment, args.digest)
        print("Updated " + str(result.relative_to(ROOT)) + " to " + IMAGE + "@" + args.digest)
    except ValueError as exc:
        parser.exit(2, str(exc) + "\n")
