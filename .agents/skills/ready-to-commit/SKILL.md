---
name: ready-to-commit
description: Check local commit readiness when asked "ready to commit?" or "preflight commit". Run required verification and suggest a commit message without staging, bumping, or committing.
---

# Ready to commit

This command authorizes verification, not a commit. Inspect branch, staged/unstaged changes, and relevant untracked files; preserve all existing work. Respect a named change scope and identify unrelated changes separately.

- Read current package scripts and root verification instructions. Check for accidental generated files, missing companion files, public interface regressions, and obvious secrets. Report secret locations without printing values.
- Run the required checks appropriate to the changes: targeted formatting/link checks for documentation only; the configured full check for code/tooling; production build when bundling, dependencies, configuration, or route rendering is affected. Reuse recent unchanged passing evidence, clearly identifying it.
- Normal verification may generate disposable Next.js route/build artifacts. Inspect status afterward and report unexpected changes. Do not run automatic fixers, lint-staged, pre-commit, or Git hooks to simulate a commit: they can rewrite files, the index, or package versions.
- Do not stage, stash, reset, bump versions, commit, or push. The normal authorized commit workflow owns the automatic semver bump; do not preview it by changing package.json.
- Report readiness as ready, failed, or blocked with supporting checks and remaining runtime gaps. Propose a concise commit message matching the actual change; do not substitute successful compilation for media/device verification.

If the user explicitly requests a commit afterward, follow the repository's normal commit workflow within that authorization. Push and other Git actions still need their own authorization.
