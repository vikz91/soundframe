---
name: review-changes
description: Review the current local diff for actionable defects when asked "review my changes" or "review this diff". Report findings without editing or committing.
---

# Review changes

Keep the repository and Git index unchanged. Read applicable instructions and inspect staged, unstaged, and relevant untracked changes. Respect a user-specified diff or file scope instead of expanding to the whole repository.

- Read changed code and only the callers, contracts, configuration, and tests needed to understand its effect. Preserve the difference between unrelated existing work and the requested review.
- Look for concrete correctness failures, regressions, asynchronous races, cleanup errors, browser/server boundary mistakes, performance costs, accessibility failures, and meaningful verification gaps.
- Evaluate media work against relevant v0 decisions. Installed dependencies or a preview do not establish valid exported audio/video or mobile compatibility.
- Use non-mutating focused checks where useful. Do not invoke auto-fix, lint-staged, hooks, builds, or type-generation commands as part of a read-only review.
- Report actionable findings by severity, with file/line, trigger, impact, causal evidence, and fix direction. Omit speculative style preferences and unsupported warnings.
- If no actionable issues are found, say so and identify unverified behavior or blocked checks. A review request does not authorize fixes, staging, commits, or pushes; a subsequent explicit fix request does.
