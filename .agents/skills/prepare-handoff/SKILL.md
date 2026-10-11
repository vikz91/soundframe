---
name: prepare-handoff
description: Prepare a concise continuation brief when asked "prepare handoff" or "summarize for the next session". Report in chat; save or send only when explicitly requested.
---

# Prepare handoff

Inspect current status and only the files needed to validate the active task's state. Do not modify repository files, create a task, delegate, or message another conversation merely to prepare the brief.

Capture enough for another session to continue without replaying the conversation:

- Objective and authorized scope, including relevant constraints and decisions.
- Current implementation and affected files, distinguishing existing work from the task's changes.
- Checks already run and their outcomes, with remaining runtime/device uncertainty.
- Blockers, unresolved choices, and the next concrete steps in dependency order.
- Commit/branch identity only when relevant; do not include secrets or raw logs.

Use current evidence, identify stale verification, and keep the brief short. Include necessary paths and commands rather than copying full code or loading every skill.

Default output is chat. If saving is explicitly requested, use the requested location or an appropriate repository documentation path, preserve existing content, and check formatting and relative links. Sending the handoff to another task or person requires explicit messaging authorization; preparing or saving it does not grant that permission.
