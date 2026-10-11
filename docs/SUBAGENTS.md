# Sub-agent guide

Use this guide when the user explicitly requests delegation. Default to one agent for small, sequential, or closely coupled work. Shared rules remain in [AGENTS.md](../AGENTS.md); package guidance is available on demand in [AGENT_GUIDE.md](AGENT_GUIDE.md).

## Decide what to delegate

Delegate only an independently verifiable task with a clear result. Begin with at most two workers when supported; use fewer when coordination would exceed the saved effort. Avoid recursive delegation by default.

| Task                | Useful worker scope                                                                    |
| ------------------- | -------------------------------------------------------------------------------------- |
| Editor interface    | Named components, responsive controls, keyboard and touch behavior                     |
| Media processing    | Agreed worker interfaces, audio validation, export, cancellation, and resource cleanup |
| Settings and lyrics | Versioned schemas, preset validation, lyric parsing, and meaningful boundary tests     |
| Review              | Read-only inspection of a named diff for correctness, performance, or accessibility    |

These are possible task boundaries, not directories or features already implemented. Define shared types and contracts before dividing dependent work. Do not send the same investigation to multiple workers without a concrete reason.

## Give a bounded brief

Send the relevant facts and paths instead of the full conversation. Each brief should fit this template:

```text
Goal: One concrete outcome.
Mode: Read-only review or implementation.
Owned files: Exact files or directories the worker may edit.
Inputs: Relevant decisions, types, APIs, and source paths.
Constraints: Scope exclusions, compatibility requirements, and shared-workspace rules.
Acceptance: Observable behavior and required focused verification.
Return: Changed files, result, checks run, blockers, and actionable findings.
```

Include the v0 decisions only when they affect the task. Workers read the root instructions and only relevant package docs or skill rules. Review findings should identify a file and line, concrete impact, and a fix direction; omit speculative style observations.

## Prevent shared-workspace conflicts

- Assign one writer per file. The coordinator owns shared types, dependency changes, lockfiles, root configuration, and final integration unless explicitly reassigned.
- Workers must preserve other agents' and the user's changes. Do not reset, stash, stage, commit, push, or broadly format the shared checkout.
- Use scoped edits and focused checks. Do not run parallel dependency installs, full builds, or competing dev servers.
- If a task needs a file outside its ownership, report the dependency before editing it. Stop and coordinate when edits overlap.
- Workers do not delegate further, message unrelated chats, or submit external reports as part of their brief.

## Integrate and verify

The coordinator reviews every returned diff, resolves interface mismatches, and runs the final integrated checks. Workers supply evidence for their own acceptance criteria; the coordinator does not repeat unchanged, independently verified checks without a reason.

Keep updates and handoffs short. Report command outcomes rather than raw logs, expanding errors only when necessary. Cancel redundant work when new findings make it unnecessary.

The final response must distinguish implemented behavior, tested behavior, and blocked checks. For media work, a worker's successful compile does not establish mobile support or valid exported audio/video.
