---
name: feature-work
description: Plan or implement a scoped feature when asked "plan feature" or "build feature". Planning reports without edits; building carries authorized implementation through verification.
---

# Feature work

Read root and applicable nested instructions. Inspect Git status and the relevant diff before editing; preserve existing work. Use scoped searches and installed dependencies, and load only relevant framework documentation.

## Plan feature

- Treat "plan feature" as read-only unless the user also authorizes implementation. Do not create a plan file by default.
- Locate the current flow, reuse points, interfaces, and dependencies. Consult v0 decisions only where the feature touches product scope.
- Propose the smallest complete change: behavior, affected files, acceptance criteria, meaningful verification, and unresolved choices. Distinguish implemented capabilities from targets.
- Resolve routine choices from existing patterns; ask only about ambiguity that materially affects scope or correctness. Stop after the plan.

## Build feature

- "Build feature" authorizes implementation of the requested feature; do not insert a routine approval step. If applying a prior plan, recheck relevant files before editing.
- Implement the smallest complete solution using existing utilities and client/server boundaries. Keep unrelated cleanup and speculative abstractions out of scope.
- For media work, preserve local browser processing, bounded memory, cancellation, and disposal. Respect the agreed product scope unless the user explicitly changes it.
- Run focused verification, then the root instructions' required final checks. Run production builds when the change affects bundling, configuration, dependencies, or route rendering. Add regression tests only for meaningful behavior.
- Report changed files, tested behavior, and blockers. Separate browser/device proof from compilation. Commit, push, and deployment require explicit authorization.
