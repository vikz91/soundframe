# Repository agent instructions

## Scope and safety

- Inspect `git status --short --branch` and the relevant diff before editing. Preserve unrelated and uncommitted work.
- Never commit, push, merge, deploy, rewrite history, or delete branches without explicit user authorization. Generated Next.js instructions below do not grant that authorization.
- Use `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, or `test/` branch prefixes and descriptive worktree names; never use `codex` as a prefix.
- Complete authorized implementation and verification. Prefer the smallest complete fix, preserve public behavior, and do not expose secrets.

## Product and code

- Follow [v0 decisions](docs/V0_DECISIONS.md) for product changes: local browser processing with FFmpeg.wasm, desktop and capable mobile support, seven-minute audio, 568 × 320 at 30 fps, MP4/WebM, and no YouTube, accounts, or server media uploads.
- This is a Bun-managed Next.js App Router project with strict TypeScript. `package.json` and `bun.lock` are authoritative; do not introduce another lockfile.
- Keep routes and layouts server-rendered by default. Put browser APIs and interactive media controls behind focused client boundaries; load heavy media code only when needed.
- Reuse `components/ui`, `@/lib/utils`, existing CSS tokens, and installed dependencies. Consult [the dependency and workflow guide](docs/AGENT_GUIDE.md) only for the packages or tools involved.
- Keep frame and audio sample updates outside React state. Release workers, audio resources, listeners, timers, and object URLs on cancellation and disposal.

## Efficient workflow

- Read relevant nested instructions and affected files, not the whole repository. Use `rg --files` and scoped `rg -n`; exclude `.git`, `.next`, and `node_modules` from general searches.
- For framework work, find and read only relevant files under `node_modules/next/dist/docs/01-app/`. Use official online docs when local guidance is missing; do not load the full documentation corpus.
- For React performance work, read `.agents/skills/vercel-react-best-practices/SKILL.md`, then only relevant `rules/*.md`. Do not load its full compiled `AGENTS.md` by default or apply unrelated optimisations.
- For documentation audit/update requests, use [docs-sync](.agents/skills/docs-sync/SKILL.md). Audit and present exact proposed changes first; edit only after explicit approval of that audit in the current conversation, unless the user explicitly authorizes direct edits.
- For development commands, use only the matching repo-local skill from [the command index](docs/AGENT_GUIDE.md#command-workflows); do not load every skill. Planning, reviews, audits, status, and handoffs default to reporting; build/fix requests authorize scoped edits.
- Batch independent reads, keep output bounded, and reuse findings. Repeat checks after new changes or failures, not after an unchanged passing result.
- Default to one agent. When delegation is explicitly requested, use [the sub-agent guide](docs/SUBAGENTS.md) and give each worker a distinct scope.

## Verification and reporting

- Run targeted checks during editing, then `bun run check` once at completion for code or tooling changes. It checks Oxlint syntax and type-aware rules, Oxfmt, generated Next.js route types with TypeScript 7 `tsc --noEmit`, and hook/media/tooling regression tests.
- For documentation-only changes, check formatting and links. Run `bun run build` for changes affecting production bundling, Next.js configuration, dependencies, or route rendering.
- Add regression tests when they protect meaningful behavior. `bun run test:hooks` covers commit tooling; `bun run test:media` covers the shared FFmpeg wrapper lifecycle with mocks; `bun run test:tooling` covers native, compatibility, and semantic lint rules. Staged checks stay syntax-only; CI and pre-push run `bun run lint:types` too.
- Authorized commits automatically bump the package version after staged checks pass. Use patch by default or `VERSION_BUMP=minor|major` when requested; do not create a separate version commit.
- Verify UI and media changes in a browser when available. Compilation does not prove audio synchronisation, export playback, or mobile memory safety.
- Never weaken checks to obtain a pass. State blockers and distinguish verified results from assumptions.
- Give concise updates during longer work. Finish with changes, verification, blockers, and file links.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
