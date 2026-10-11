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
| `typescript`                       | `^7.0.2`         | Native compiler; strict typing and no-emit checks. Keep Next.js CLI type checking enabled.                                 |
| `@types/node`                      | `^20`            | Node typings for tooling; availability of a type does not make an API available in a browser.                              |
| `@types/react`, `@types/react-dom` | `^19` each       | Match the installed React type APIs; do not copy older component signatures blindly.                                       |
| `oxlint`                           | `^1.87.0`        | Uses `.oxlintrc.json`; warnings fail. Preserve native rules and JavaScript compatibility rules when editing configuration. |
| `oxlint-tsgolint`                  | `^7.0.2004`      | Type-aware backend using TypeScript 7.0.2 semantics; invoked by `bun run lint:types`.                                      |
| `oxfmt`                            | `^0.72.0`        | Uses `.oxfmtrc.json`; preserves the existing style and ignores generated/vendor files. Format only changed files.          |
| `@next/eslint-plugin-next`         | `16.4.0`         | Oxlint compatibility plugin for the internal-navigation rule not yet implemented natively.                                 |
| `eslint-plugin-react`              | `^7.37.5`        | Oxlint compatibility plugin for deprecated React APIs and missing class-component render returns.                          |
| `eslint-plugin-react-hooks`        | `^7.1.1`         | Oxlint compatibility plugin for React Compiler configuration and gating validation.                                        |
| `husky`                            | `^9.1.7`         | Uses `.husky/pre-commit` and `.husky/pre-push`; `bun run prepare` installs hooks.                                          |
| `lint-staged`                      | `^17.6.0`        | Fixes supported staged files before commit; do not invoke it merely to inspect an unrelated dirty index.                   |

The `semver` development dependency (`^7.8.5`) supplies standard version validation and increments for commit tooling.

Bun is pinned by `packageManager` to `bun@1.4.0`. Browser media dependencies are `@ffmpeg/ffmpeg` (`^0.12.15`), `@ffmpeg/core` (`^0.12.10`, single-threaded), and `@ffmpeg/util` (`^0.12.2`). Use the shared [FFmpeg wrapper and hook](FFMPEG.md); do not create engines in individual components. `bun run test:media` covers its lifecycle with mocks. The full media pipeline and automated browser suite remain implementation work. Commit tooling has a separate regression suite, `bun run test:hooks`.

## Linting and formatting

Oxlint replaces the ESLint command, and Oxfmt replaces Prettier. `.oxlintrc.json` preserves the previous Next.js, React Hooks, accessibility, and TypeScript rule severities. The migration enables 79 native rules plus five JavaScript compatibility rules: `next-compat/no-location-assign-relative-destination`, `react-compat/no-deprecated`, `react-compat/require-render-return`, `hooks-compat/config`, and `hooks-compat/gating`. The former JSX usage rules are handled by native JSX-aware unused-variable checks and React's automatic JSX transform.

JavaScript plugin support is currently alpha upstream. Keep these compatibility plugins until native equivalents are verified; do not silently drop rules. Their ESLint peer dependency may remain transitive, but no ESLint CLI or TypeScript ESLint parser is used by the project's lint command. These five checks do not depend on the TypeScript compiler API.

`bun run lint:types` generates Next.js route types and runs `.oxlintrc.type-aware.json`, which extends the syntax configuration and enables tsgolint. Eight semantic rules apply only to `ts`, `tsx`, `mts`, and `cts` files: `no-floating-promises`, `no-misused-promises`, `await-thenable`, and `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return`, `no-unsafe-argument`. JavaScript scripts and test mocks retain syntax checks. The type-aware profile explicitly repeats the React version setting because Oxlint does not inherit it through `extends`; update both configurations when React changes.

TypeScript is upgraded to `^7.0.2`. `bun run typecheck` retains the separate `tsc --noEmit --incremental false` check. Next.js 16.4 uses the compiler CLI by default; do not set `experimental.useTypeScriptCli` to `false`, since TypeScript 7 does not expose the legacy compiler API. No application code or strict compiler options needed changes for this upgrade.

For editor support, use a TypeScript 7-compatible language server. The legacy Next.js TypeScript language-service plugin does not run in the native TypeScript 7 language server; the `plugins` entry in `tsconfig.json` is retained because Next.js manages it. CLI type checks and production builds are verified separately from editor features. See Microsoft's [TypeScript 7 editor and plugin guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#editor-experience); no editor extensions are installed automatically.

`.oxfmtrc.json` retains no semicolons, single quotes, two-space indentation, no trailing commas, and a 120-column width. Package-key sorting is explicitly disabled to preserve existing manifest ordering. Generated assets and vendored skills remain ignored. lint-staged runs Oxlint then Oxfmt for code, and Oxfmt for supported document/config formats. Version bumping formats the manifest through Oxfmt's API before staging it.

CI runs separate syntax and type-aware lint jobs. Pre-push calls `check`, which includes both profiles and the compiler check. Pre-commit keeps fast syntax checks and formatting. `bun run test:tooling` verifies native/compatibility rules, automatic JSX variable usage, all eight semantic rules, and TypeScript 7 diagnostic reporting. Hook tests also exercise real Oxlint/Oxfmt staged checks in temporary Git repositories. For editor diagnostics and formatting, use the [Oxc editor integration](https://oxc.rs/docs/guide/usage/linter/editors.html).

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

Use `bun run lint`, `bun run lint:types`, `bun run format:check`, `bun run typecheck`, and `bun run test:hooks` independently during editing. Type checking generates route declarations and runs TypeScript 7 `tsc --noEmit --incremental false`; it does not generate application JavaScript or prove runtime correctness. Git hooks enforce staged syntax checks and an automatic version bump before commit, and the full check before push.

For media work, use the release criteria in `V0_DECISIONS.md`: complete exports, synchronisation, playback, cancellation, cleanup, and representative mobile devices. Mocked output, a working preview, and a successful type check do not prove those results.

## Sources

- [Next.js AI coding agents](https://nextjs.org/docs/app/guides/ai-agents)
- [Next.js MCP guide](https://nextjs.org/docs/app/guides/mcp)
- [Best of JS agent skills listing](https://bestofjs.org/projects/agent-skills)
- [Vercel agent skills source](https://github.com/vercel-labs/agent-skills)

This setup reduces repeated context loading through scoped lookups and progressive disclosure. Token savings are not benchmarked and depend on the agent and task.
