# Dependency and agent workflow guide

Read only the sections needed for the current task. The root [AGENTS.md](../AGENTS.md) supplies shared rules; [v0 decisions](V0_DECISIONS.md) define product scope. `package.json` and `bun.lock` remain the source of truth when dependencies change.

## Dependency inventory

Snapshot: 12 October 2026. Versions below are declared requirements from `package.json`, not claims that all packages are used by the starter application.

| Package                            | Declared version | Guidance for this repository                                                                                               |
| ---------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `next`                             | `16.4.0`         | App Router; read installed framework docs before changing routing, caching, or configuration.                              |
| `react`, `react-dom`               | `19.3.0` each    | Reuse React state and composition patterns; keep rapidly changing media data outside renders.                              |
| `@base-ui/react`                   | `^1.9.0`         | Reuse existing accessible primitives and the Base UI component style already used by the button.                           |
| `shadcn`                           | `^4.21.4`        | Component tooling; follow `components.json` aliases, Base UI style, CSS tokens, and icon selection.                        |
| `@phosphor-icons/react`            | `^2.1.10`        | Default for new icons because `components.json` selects Phosphor. Use named imports.                                       |
| `lucide-react`                     | `^1.55.0`        | Already installed; preserve existing usage, but avoid mixing icon families in new UI.                                      |
| `class-variance-authority`         | `^0.7.1`         | Follow the existing button variant pattern rather than inventing another variant system.                                   |
| `cn`                               | `^0.4.0`         | Reuse the existing utility exported through `@/lib/utils`.                                                                 |
| `framer-motion`                    | `^14.1.0`        | Optional interface animation; respect reduced motion. Do not use it as the export frame clock.                             |
| `tw-animate-css`                   | `^1.4.0`         | Reuse existing CSS animations for simple interface transitions.                                                            |
| `@uidotdev/usehooks`               | `^2.4.1`         | Check a hook's installed API and browser assumptions before reuse. Keep browser access in client code.                     |
| `react-h5-audio-player`            | `^3.10.2`        | Optional playback controls; integrate behind a client boundary and inspect required styles. It is not an encoder.          |
| `zod`                              | `^4.6.6`         | Prefer for runtime validation of imported settings and structured user input. File metadata alone is not media validation. |
| `tailwindcss`                      | `^4`             | Use existing CSS variables and utilities. Do not introduce a Tailwind v3 configuration pattern.                            |
| `@tailwindcss/turbopack`           | `^4`             | Already configured for CSS in `next.config.ts`; preserve the setup unless the task requires changing it.                   |
| `typescript`                       | `^5`             | Strict typing; use the existing no-emit check and avoid weakening compiler options.                                        |
| `@types/node`                      | `^20`            | Node typings for tooling; availability of a type does not make an API available in a browser.                              |
| `@types/react`, `@types/react-dom` | `^19` each       | Match the installed React type APIs; do not copy older component signatures blindly.                                       |
| `eslint`                           | `^9`             | Flat configuration in `eslint.config.mjs`; warnings fail the checks.                                                       |
| `eslint-config-next`               | `16.4.0`         | Core Web Vitals and TypeScript rules matching Next.js.                                                                     |
| `eslint-config-prettier`           | `^10.1.8`        | Disables conflicting formatting rules; Prettier owns formatting.                                                           |
| `prettier`                         | `^3.9.10`        | Follow `.prettierrc` and `.prettierignore`; format only files changed for the task.                                        |
| `husky`                            | `^9.1.7`         | Uses `.husky/pre-commit` and `.husky/pre-push`; `bun run prepare` installs hooks.                                          |
| `lint-staged`                      | `^17.6.0`        | Fixes supported staged files before commit; do not invoke it merely to inspect an unrelated dirty index.                   |

The `semver` development dependency (`^7.8.5`) supplies standard version validation and increments for commit tooling.

Bun is pinned by `packageManager` to `bun@1.4.0`. Browser media dependencies are `@ffmpeg/ffmpeg` (`^0.12.15`), `@ffmpeg/core` (`^0.12.10`, single-threaded), and `@ffmpeg/util` (`^0.12.2`). Use the shared [FFmpeg wrapper and hook](FFMPEG.md); do not create engines in individual components. `bun run test:media` covers its lifecycle with mocks. The full media pipeline and automated browser suite remain implementation work. Commit tooling has a separate regression suite, `bun run test:hooks`.

## Local documentation lookup

Next.js ships version-matched docs in `node_modules/next/dist/docs/`. Find a relevant path before reading it:

```bash
rg --files node_modules/next/dist/docs/01-app | rg 'server-and-client|lazy-loading|cache-components'
rg -n 'specific API or error' node_modules/next/dist/docs/01-app/02-guides
```

Read the matching section and its necessary references. Avoid `.next-docs` duplication, whole-tree dumps, and `llms-full.txt` as default context. For other dependencies, inspect their installed types and existing usage first, then consult official documentation when needed.

## Selected project skill

[Vercel React Best Practices](../.agents/skills/vercel-react-best-practices/SKILL.md) is installed locally for React and Next.js performance work. Start with its index and open only applicable rule files. Its full compiled guide is optional reference material, not startup context.

The skill comes from [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices), pinned to commit `063bee94c3f4df8453406c830b0a7df0f2860278`, under its MIT license. Keep upstream content intact; application linting and formatting exclude the vendored skill directory. Update deliberately and record the new revision here. This installation does not add application dependencies or configure global agent tools.

Best of JS links to this upstream collection. Deployment, React Native, and other unrelated skills are not needed for v0. Skills supply task workflows and performance guidance; installed Next.js docs supply framework API details.

## Command workflows

Use these phrases in chat, adding the feature, bug, or scope when needed. The linked repo-local skills provide the workflow; they are not shell commands. Explicitly naming a skill also makes the intended workflow clear. Load only the matching skill.

| Phrase                   | Skill                                                               | Default behavior                                                     |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| "Plan feature: …"        | [feature-work](../.agents/skills/feature-work/SKILL.md)             | Inspect and propose a scoped plan; no edits.                         |
| "Build feature: …"       | [feature-work](../.agents/skills/feature-work/SKILL.md)             | Implement the requested scope and verify it.                         |
| "Trace bug: …"           | [trace-bug](../.agents/skills/trace-bug/SKILL.md)                   | Diagnose with evidence; "fix it" authorizes the proposed fix.        |
| "Review my changes"      | [review-changes](../.agents/skills/review-changes/SKILL.md)         | Review the local diff and report actionable findings.                |
| "Check media pipeline"   | [check-media](../.agents/skills/check-media/SKILL.md)               | Audit decoding, composition, encoding, synchronization, and cleanup. |
| "Check mobile readiness" | [check-mobile](../.agents/skills/check-mobile/SKILL.md)             | Audit capabilities, resources, controls, export, and downloads.      |
| "Check dependencies"     | [check-dependencies](../.agents/skills/check-dependencies/SKILL.md) | Propose evidence-backed dependency changes before applying them.     |
| "Ready to commit?"       | [ready-to-commit](../.agents/skills/ready-to-commit/SKILL.md)       | Run appropriate checks and suggest a message; no staging or commit.  |
| "Where are we?"          | [project-status](../.agents/skills/project-status/SKILL.md)         | Summarize implementation, verification, blockers, and next tasks.    |
| "Prepare handoff"        | [prepare-handoff](../.agents/skills/prepare-handoff/SKILL.md)       | Produce a continuation brief in chat; save/send only when requested. |
| "Update docs"            | [docs-sync](../.agents/skills/docs-sync/SKILL.md)                   | Audit and propose exact corrections; "OK update" applies them.       |

Read-only workflows do not authorize automatic fixes or Git index changes. Explicit requests to implement or apply a proposal authorize the stated edits; committing, pushing, deployment, and external messaging remain separately authorized actions. All workflows use scoped searches and distinguish static evidence from runtime/device verification.

## Runtime inspection

Reuse an existing development server when possible. Inspect `.next/dev/lock` to locate its URL and PID; do not kill a user's server or start competing processes unnecessarily.

When a compatible Next.js MCP client is available, use `compile_route`, `get_compilation_issues`, and `get_errors` to inspect affected routes. The dev server exposes `/_next/mcp`; a client bridge is a separate tool configuration. No MCP bridge or browser automation CLI is installed by this repository setup. Without those tools, inspect dev-server output and use an available browser to verify the changed flow.

Existing `experimental.agentFeedback` is enabled in `next.config.ts`. Preserve the framework-managed instruction blocks. No feedback is submitted automatically; never include private project data in a report or submit one without user authorization.

## Verification loop

1. Inspect the changed area, relevant docs, and current diff.
2. Make a bounded change and run the smallest check that verifies it.
3. For UI or media behavior, verify the affected browser flow and inspect runtime errors.
4. Run `bun run check` once on the final integrated code. Run `bun run build` when production compilation is affected.
5. Report what changed, checks that actually ran, and remaining limits.

Use `bun run lint`, `bun run format:check`, `bun run typecheck`, and `bun run test:hooks` independently during editing. Type checking generates route declarations and runs `tsc --noEmit --incremental false`; it does not generate application JavaScript or prove runtime correctness. Git hooks enforce staged checks and an automatic version bump before commit, and the full check before push.

For media work, use the release criteria in `V0_DECISIONS.md`: complete exports, synchronisation, playback, cancellation, cleanup, and representative mobile devices. Mocked output, a working preview, and a successful type check do not prove those results.

## Sources

- [Next.js AI coding agents](https://nextjs.org/docs/app/guides/ai-agents)
- [Next.js MCP guide](https://nextjs.org/docs/app/guides/mcp)
- [Best of JS agent skills listing](https://bestofjs.org/projects/agent-skills)
- [Vercel agent skills source](https://github.com/vercel-labs/agent-skills)

This setup reduces repeated context loading through scoped lookups and progressive disclosure. Token savings are not benchmarked and depend on the agent and task.
