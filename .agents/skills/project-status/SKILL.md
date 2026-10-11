---
name: project-status
description: Summarize verified implementation, unfinished work, blockers, and next steps when asked "where are we?" or "project status". Report in chat without modifying a tracker.
---

# Project status

Provide a concise current-state report without editing files or running generating checks. Start with Git status and scoped source/documentation inventory; use current implementation as evidence and consult product decisions only where needed.

- Distinguish implemented behavior, tested behavior, planned work, and blockers. Documentation claims, dependency installation, and green compilation do not establish working media exports.
- Use available recent verification from the current conversation without rerunning unchanged checks. Label historical or unverified evidence and avoid claiming old results apply to changed code.
- Inspect only the code and configuration needed to confirm the requested area. Expand scope when an inconsistency changes the assessment, not merely to catalogue the repository.
- Summarize what works, what remains, and the next three useful tasks in dependency order, with relevant file references and concrete acceptance outcomes. If fewer tasks remain, list fewer.
- Separate unfinished implementation from external/tool/device blockers and unrelated uncommitted work. Do not mark a feature complete when its acceptance checks remain unproven.
- Keep the result in chat. Updating a tracker, saving a report, or beginning the recommended work requires a request authorizing that action.
