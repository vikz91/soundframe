<div align="center">

# Audioframe

**Give your audio a frame.**

Turn music, cover art, and lyrics into videos with audio-reactive visuals—right in your browser.

[![Status: In development](https://img.shields.io/badge/status-in_development-f59e0b?style=flat-square)](#project-status)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript 7.0.2](https://img.shields.io/badge/TypeScript-7.0.2-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun 1.4](https://img.shields.io/badge/Bun-1.4-f9f1e1?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![FFmpeg.wasm](https://img.shields.io/badge/FFmpeg-WebAssembly-007808?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpegwasm.netlify.app/)

[Get started](#get-started) · [The workflow](#the-workflow) · [Report an issue](https://github.com/vikz91/soundframe/issues/new/choose) · [Contribute](CONTRIBUTING.md)

</div>

## The idea

A simple way to turn an audio track into a shareable video. Choose your artwork, add a title or lyrics, and pick a visual style. Audioframe is being built for local browser processing: your media stays on your device, with no account or server rendering required.

The v0 goal is a free tool for desktop and capable mobile browsers, hosted on Vercel. Availability remains subject to hosting quotas and device capabilities.

## Project status

**In active development.** The Next.js foundation, development checks, and shared FFmpeg.wasm wrapper/hook are implemented. The complete editor and export experience remain in development.

The features below describe the agreed v0 scope, not a released or fully verified converter. See the [product decisions](docs/V0_DECISIONS.md) and [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md) for the implementation and release criteria.

## The workflow

**Choose files → customise → preview → export → download**

Once the editor is available:

1. Select an audio file up to **seven minutes** long and a JPG or PNG cover image.
2. Choose **Cover**, **Spectrum**, or **Lighting** mode.
3. Add optional song details, plain lyrics, or timed LRC lyrics; adjust colours and typography.
4. Preview the composition, then export **MP4** or **WebM** with the audio included.
5. Download locally. Export settings as JSON to reuse them later.

| Capability      | v0 target                                                          |
| --------------- | ------------------------------------------------------------------ |
| Audio input     | MP3, M4A, WAV, or the audio track from MP4                         |
| Artwork         | JPG or PNG                                                         |
| Visuals         | Cover artwork, sound bars, or audio-reactive lighting              |
| Text            | Song title, album, artists, website, and optional lyrics           |
| Video           | Landscape, **568 × 320**, **30 fps**, up to seven minutes          |
| MP4             | H.264 video with AAC audio                                         |
| WebM            | VP8 video with Opus audio                                          |
| Presets         | Versioned JSON settings; audio and artwork are selected separately |
| Export controls | One export at a time, progress, approximate ETA, and cancellation  |

### Privacy and device support

The planned media pipeline runs locally using FFmpeg.wasm and its built-in worker. Canvas supplies the composition preview. Input media and generated videos are not uploaded to a server, and downloads do not use hosted links.

Generated output remains available for repeat downloads until **Clear project**, page closure, or one hour after generation. The timer is best effort while the page runs; it cannot delete files already downloaded to your device.

Modern desktop and capable mobile browsers are the target. Keep the app open and in the foreground during export. Older or low-spec phones may be unsupported; mobile performance and complete seven-minute exports still require device testing.

## Get started

Install **Bun 1.4.0**, the version pinned in `package.json`, then:

```bash
git clone https://github.com/vikz91/soundframe.git
cd soundframe
bun install
bun run dev
```

Open [localhost:3000](http://localhost:3000). The development server reloads when you edit the application.

To check the production build locally:

```bash
bun run build
bun run start
```

Use Bun for dependency changes and retain `bun.lock` as the project's lockfile.

Install, development, and build scripts copy the installed FFmpeg runtime assets into `public/ffmpeg/` automatically. These generated files are ignored by Git; `bun run ffmpeg:assets` refreshes them manually.

## Development

The stack is **Next.js App Router**, **React 19**, **strict TypeScript 7.0.2**, **Tailwind CSS 4**, and **FFmpeg.wasm**. Browser processing uses a single-threaded core as the compatibility baseline; additional workers or multi-threading require profiling and capability checks.

The TypeScript upgrade required no application-code or strict compiler-option changes. Tooling compatibility changes include the legacy compiler API and editor language-service plugins; Next.js uses the supported compiler CLI. See [TypeScript 7 upgrade notes](docs/AGENT_GUIDE.md#typescript-7-version-and-upgrade-notes) for versions, breaking changes, and editor setup.

| Command                 | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `bun run dev`           | Start the development server                                            |
| `bun run check`         | Run lint, formatting, TypeScript, hook, media, and tooling tests        |
| `bun run lint`          | Check Oxlint rules; warnings fail                                       |
| `bun run lint:types`    | Generate route types, then run type-aware lint with tsgolint            |
| `bun run typecheck`     | Generate route types, then check TypeScript without emitting JavaScript |
| `bun run format:check`  | Check Oxfmt formatting                                                  |
| `bun run test:hooks`    | Test commit tooling in temporary repositories                           |
| `bun run test:media`    | Run media wrapper lifecycle regression tests                            |
| `bun run test:tooling`  | Verify native, compatibility, and semantic lint rules                   |
| `bun run ffmpeg:assets` | Refresh locally served FFmpeg runtime assets                            |
| `bun run lint:fix`      | Apply supported Oxlint fixes                                            |
| `bun run format`        | Format the repository with Oxfmt                                        |
| `bun run build`         | Create a production build                                               |

### Git hooks and versioning

Oxlint uses `.oxlintrc.json`; `.oxlintrc.type-aware.json` adds semantic TypeScript checks through tsgolint. Oxfmt uses `.oxfmtrc.json` and preserves the existing formatting style. Five Next.js/React rules use JavaScript compatibility plugins to retain checks that Oxlint does not implement natively. See the [tooling guide](docs/AGENT_GUIDE.md#linting-and-formatting) for compiler and editor support.

`bun install` installs Husky hooks. If they are missing, run `bun run prepare`. Bun must be on your PATH.

- **Before a commit:** lint-staged fixes and formats supported staged files. Once those checks pass, the hook bumps and stages the package version in the same commit.
- **Before a push:** `bun run check` validates the whole project. A failing check blocks the push.

Normal commits receive a **patch** bump. Select another SemVer increment explicitly when appropriate:

```bash
git commit -m "Fix export cancellation"
VERSION_BUMP=minor git commit -m "Add a visualisation"
VERSION_BUMP=major git commit -m "Introduce a breaking change"
```

<details>
<summary>Version bump behaviour and retries</summary>

The hook does not infer release types from commit messages, create extra version commits, or create Git tags. Only `package.json` is staged automatically; this project's Bun lockfile does not store the root package version.

Unstaged edits to `package.json` block the commit to protect unrelated changes. Stage those edits or set them aside first. A manually staged higher version is kept; invalid or decreasing versions block the commit.

If staged checks fail, there is no bump. If Git cancels later, the bump remains staged; retrying against the same existing HEAD keeps it. The next successful commit cycle bumps again. With no other staged changes, a commit can be version-only. Operations that skip pre-commit hooks, including `--no-verify`, also skip versioning.

Hook tests create commits only inside temporary repositories. They do not stage or commit changes in this checkout.

</details>

## Reporting issues

Search [existing issues](https://github.com/vikz91/soundframe/issues) first, then choose a template:

- [Bug report](https://github.com/vikz91/soundframe/issues/new?template=bug_report.yml) — reproduction steps, expected and actual behaviour, device/browser details, and optional media settings, errors, or screenshots.
- [Feature request](https://github.com/vikz91/soundframe/issues/new?template=feature_request.yml) — the user need, proposed behaviour, alternatives, and how it fits the [v0 scope](docs/V0_DECISIONS.md).

For media failures, include input format, duration, approximate size, visual mode, and output format. Share a small synthetic or public-domain sample where possible; avoid posting private recordings, credentials, or other sensitive data. The [issue chooser](https://github.com/vikz91/soundframe/issues/new/choose) also allows a blank issue for reports that do not fit either template.

## Contributing

Focused fixes, accessible UI improvements, documentation, and reproducible media tests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch conventions, verification, commit versioning, and the pull request process.

Pull requests use a [template](.github/PULL_REQUEST_TEMPLATE.md) covering the problem, resulting behaviour, related issues, verification, and remaining limitations. Run `bun run check` and the relevant build/browser checks, then record the actual results in your PR.

A successful build or type check does not prove audio synchronisation, export playback, cancellation, or mobile memory safety. Include runtime evidence where the change affects those behaviours.

### GitHub automation

The configured [CI workflow](.github/workflows/ci.yml) runs lint, formatting, TypeScript, tests, a production build, and a locked dependency audit on PRs and pushes to `main`. Audits also run weekly. The [PR reporter](.github/workflows/pr-status.yml) updates one comment with the check results, including fork and Dependabot PRs.

[Dependabot](.github/dependabot.yml) checks Bun packages and GitHub Actions weekly. A stable `vX.Y.Z` tag matching the package version triggers the [release workflow](.github/workflows/release.yml), which reruns CI before publishing a GitHub release with a [generated changelog](.github/release.yml). Ordinary commits bump the version locally but do not publish releases.

## Documentation

- [Contribution guide](CONTRIBUTING.md) — setup, checks, versioning, and pull requests.
- [v0 product decisions](docs/V0_DECISIONS.md) — inputs, outputs, privacy, limits, and release requirements.
- [Browser media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md) — worker ownership, encoding paths, memory, and benchmarks.
- [Browser FFmpeg wrapper](docs/FFMPEG.md) — hook usage, worker reuse, cancellation, cleanup, and local WASM assets.
- [Future YouTube integration](docs/YOUTUBE_INTEGRATION_PLAN.md) — proposed uploads, authorization, costs, notifications, and launch requirements beyond v0.
- [Repository instructions](AGENTS.md) — coding conventions, scope, and verification.
- [Dependency and workflow guide](docs/AGENT_GUIDE.md) — package guidance and focused documentation lookup.
- [Sub-agent guide](docs/SUBAGENTS.md) — bounded task ownership when delegation is requested.

## Beyond v0

Possible future work includes higher-resolution exports, more visual effects and customisation, accounts and saved projects, AWS rendering, and direct YouTube uploads. These are future options; v0 focuses on local browser conversion and downloads.
