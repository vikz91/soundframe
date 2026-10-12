# Contributing to Audioframe

Focused fixes, accessible UI improvements, documentation, and reproducible media tests are welcome.

## Before you start

- Search [existing issues](https://github.com/vikz91/soundframe/issues) and pull requests before starting work.
- Read the [v0 decisions](docs/V0_DECISIONS.md) and [repository guidance](AGENTS.md). Discuss substantial features or new dependencies in an issue first.
- Keep v0 media processing local to the browser. Default 320p and optional 720p exports are implemented. Accounts, server rendering, resolutions above 720p, and YouTube integration are future scope.
- Use the [bug report](https://github.com/vikz91/soundframe/issues/new?template=bug_report.yml) or [feature request](https://github.com/vikz91/soundframe/issues/new?template=feature_request.yml) form for proposals and reproducible problems.

## Set up your change

Fork the repository if you do not have write access, clone your fork, and follow the [README setup instructions](README.md#get-started). Use the Bun version pinned in `package.json` and keep `bun.lock` as the only package lockfile.

Create a descriptive branch with a `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, or `test/` prefix. Keep each pull request focused on one problem and preserve unrelated work.

```bash
bun install
bun run dev
```

Installation generates local FFmpeg assets and installs Husky hooks. If hooks are missing, run `bun run prepare`.

The compiler is TypeScript **7.0.2**. Use a TypeScript 7-compatible editor language server and read the [upgrade and breaking-change notes](docs/AGENT_GUIDE.md#typescript-7-version-and-upgrade-notes) before adding compiler API tools or language-service plugins.

## Code and media changes

- Reuse existing components, utilities, and dependencies; keep TypeScript strict.
- Keep browser APIs behind client boundaries and load heavy media code only when needed.
- Reuse the FFmpeg engine between jobs and release workers, listeners, timers, and object URLs on cancellation or disposal. See the [wrapper guide](docs/FFMPEG.md) and [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md).
- Add regression tests when they protect changed behaviour. Use synthetic or public-domain media samples; do not commit private recordings or generated exports.

Use `/create` for real media validation/playback/Canvas preview and `/prototype` for the sample-only simulated workflow. Real MP4/WebM export and retained local downloads are implemented. Reuse [the existing input and composition modules](docs/MEDIA_PIPELINE_ARCHITECTURE.md#implemented-input-and-preview-stage), preserve the absolute frame-index timeline, and keep live analysis samples outside React state. Reuse the deterministic offline analysis and bounded Canvas batches in `lib/editor/encode.ts`: at most 30 frames at 320p or five frames at 720p. Await transfer and encoding before producing the next batch; do not accumulate a full raw frame sequence. Preserve the guarded FFmpeg core compatibility patch when changing assets or dependencies. The opt-in `scripts/verify-encoding.mjs` checks real browser exports with external Playwright/Chrome and FFmpeg/FFprobe; see the [wrapper guide](docs/FFMPEG.md#browser-acceptance) for its duration and resolution options. Complete full-length and physical-device release checks remain open.

## Verify your work

```bash
bun run check
bun run build
bun audit
```

`check` runs Oxlint syntax and type-aware checks, Oxfmt, TypeScript 7, commit-hook tests, media validation/lifecycle/composition tests, a real-WASM sequential-command regression, lint-rule regression tests, and sample-prototype tests. Run the build for changes to dependencies, bundling, configuration, or rendering. For documentation-only changes, run Oxfmt on the changed files and check their links.

Use `bun run lint:types`, `bun run test:tooling`, `bun run test:hooks`, `bun run test:media`, or `bun run test:prototype` for focused checks. GitHub CI runs `bun test` to discover the repository's test suites, alongside syntax/type-aware lint, formatting, and TypeScript in one quality job. Locked dependency audits run when `package.json` or `bun.lock` changes, weekly, and on manual runs. Vercel builds and deploys only `main`; PRs have no production build or deployment.

For browser and media changes, describe the devices, browser versions, formats, and flows actually tested. Check audio synchronisation, output playback, progress, cancellation, and cleanup when affected. Builds and mocked tests do not prove mobile performance or complete seven-minute exports. Record failures, checks not run, and reasons in the pull request.

## Commits and pull requests

Local pre-commit hooks run staged checks, then bump and stage the package version in the same commit. Patch is the default; use `VERSION_BUMP=minor` or `VERSION_BUMP=major` for an intentional larger increment. Unstaged changes to `package.json` block the commit. See [versioning details](README.md#git-hooks-and-versioning).

Use a clear commit message that describes the change. Local pre-push hooks run `bun run check`.

Open a pull request against `main` and fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Include the problem, resulting behaviour, related issue, verification results, screenshots for visible changes, and remaining limitations. Remove sections that do not apply and mark checks accurately.

Read CI results in GitHub's checks. Address failures or explain existing blockers; do not weaken checks or suppress advisories to make a pull request pass. Dependabot checks Bun packages and GitHub Actions weekly.

Commit hooks bump the package version, but there is no automated GitHub release workflow. Ordinary commits do not create release tags, and pushing a tag does not publish a GitHub release or trigger a Vercel deployment.
