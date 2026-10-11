---
name: docs-sync
description: Audit README and repository docs against code, package.json, and tooling when asked to update docs, check documentation, or sync README. Propose exact corrections first, then apply approved documentation changes.
---

# Docs sync

Use two phases: a read-only audit, then approved documentation edits. If the user explicitly authorizes direct edits or waives the review step, follow that authorization within its stated scope.

## Audit

1. Read applicable `AGENTS.md` instructions and inspect Git status and the relevant diff. Preserve existing work. Do not edit files, save reports, install dependencies, or run commands that rewrite files or the Git index during the audit.
2. Inventory `README.md`, `docs/`, and other maintained project documentation with scoped searches. Read `package.json`, relevant configuration and source, and the documentation sections they affect. Exclude `.git`, `.next`, `node_modules`, generated output, and vendored skills. Open only files needed to substantiate findings; reuse evidence rather than dumping the repository.
3. Compare documented commands, dependencies, setup, behavior, limitations, and architecture with the implementation. Treat `package.json` and `bun.lock` as dependency evidence, not proof a feature is implemented. Distinguish current behavior from the plans in `docs/V0_DECISIONS.md` and architecture documents; do not silently change product decisions to match incomplete code. Check local documentation links.
4. Present each proposed change with the document path and section, stale statement or missing information, supporting source path and line, and exact replacement text or a small proposed patch. Label uncertain claims and blockers instead of inventing behavior. Propose new documents only when existing sections cannot reasonably cover the information.
5. If no changes are needed, report that and stop. Otherwise, finish the audit in chat and wait for approval before writing. Explain that "OK update" or "apply these changes" will apply the listed documentation changes.

## Apply approved changes

- A clear affirmative referring to the presented audit in the current conversation authorizes its proposed edits. Honor partial approval. If the reply is ambiguous or no audit is available in this conversation, clarify the scope before writing; do not reuse approval from another conversation.
- Recheck Git status, the relevant diff, and the affected documentation and source before editing. Preserve concurrent changes. If new evidence materially changes the proposal, present the revised part for approval; an unchanged approved proposal needs no additional confirmation.
- Apply only the approved documentation edits. Do not change application code, dependencies, configuration, or product scope as part of a docs approval. Commit, push, and deployment require separate authorization.
- Check formatting for changed files and verify relative links and referenced commands against current files. Use the installed Prettier directly on those paths; do not run a repository-wide formatter or checks that generate application files merely for documentation changes. Report unavailable checks rather than claiming they passed.
- Finish with the changed files, verification results, and any remaining uncertainties or blockers.
