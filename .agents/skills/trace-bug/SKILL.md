---
name: trace-bug
description: Diagnose a reported failure when asked "trace bug" or "find the root cause", then apply the scoped fix when explicitly requested, including a follow-up "fix it".
---

# Trace bug

Default to diagnosis without repository edits. A request to fix the bug also authorizes implementation; honor existing authorization without asking again.

- Read applicable instructions, inspect Git status and the relevant diff, and follow the reported input through the smallest relevant code path.
- Reproduce with available, appropriate tools when possible. Reuse an existing server and relevant fixtures; do not install tools, rewrite files, or run index-changing hooks during diagnosis.
- Use errors, source references, and focused observations to identify the cause. Separate confirmed cause from hypotheses, and identify the next discriminating check when reproduction is blocked. Do not treat a compile failure elsewhere as proof of this bug.
- Report the symptom, causal evidence with file/line references, user impact, and the smallest proposed fix and regression check. If only diagnosis was requested, stop after the report.
- A clear "fix it" referring to this diagnosis authorizes the proposed fix in the current conversation. Recheck affected files, preserve concurrent work, and stay within that scope.
- Carry authorized fixes through focused regression verification and required repository checks. Do not mask errors, weaken checks, or add unrelated refactors. Report remaining runtime or device uncertainty; committing and pushing require separate authorization.
