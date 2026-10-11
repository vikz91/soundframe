<div align="center">

# Audioframe

**Give your audio a frame.**

Turn music, cover art, and lyrics into videos with audio-reactive visuals—right in your browser.

[![Status: In development](https://img.shields.io/badge/status-in_development-f59e0b?style=flat-square)](#project-status)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun 1.4](https://img.shields.io/badge/Bun-1.4-f9f1e1?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![FFmpeg.wasm](https://img.shields.io/badge/FFmpeg-WebAssembly-007808?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpegwasm.netlify.app/)

[Get started](#get-started) · [The workflow](#the-workflow) · [Report an issue](https://github.com/vikz91/soundframe/issues) · [Contribute](#contributing)

</div>

## The idea

A simple way to turn an audio track into a shareable video. Choose your artwork, add a title or lyrics, and pick a visual style. Audioframe is being built for local browser processing: your media stays on your device, with no account or server rendering required.

The v0 goal is a free tool for desktop and capable mobile browsers, hosted on Vercel. Availability remains subject to hosting quotas and device capabilities.

## Project status

**In active development.** The Next.js foundation, development checks, and FFmpeg.wasm dependencies are in place. The homepage is currently the starter screen; the complete editor and export experience are still being implemented.

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

The stack is **Next.js App Router**, **React 19**, **strict TypeScript**, **Tailwind CSS 4**, and **FFmpeg.wasm**. Browser processing uses a single-threaded core as the compatibility baseline; additional workers or multi-threading require profiling and capability checks.

| Command                 | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `bun run dev`           | Start the development server                                            |
| `bun run check`         | Run lint, formatting, TypeScript, hook tests, and media wrapper tests   |
| `bun run lint`          | Check ESLint rules; warnings fail                                       |
| `bun run typecheck`     | Generate route types, then check TypeScript without emitting JavaScript |
| `bun run format:check`  | Check Prettier formatting                                               |
| `bun run test:hooks`    | Test commit tooling in temporary repositories                           |
| `bun run test:media`    | Run media wrapper lifecycle regression tests                            |
| `bun run ffmpeg:assets` | Refresh locally served FFmpeg runtime assets                            |
| `bun run lint:fix`      | Apply supported ESLint fixes                                            |
| `bun run format`        | Format the repository with Prettier                                     |
| `bun run build`         | Create a production build                                               |

### Git hooks and versioning

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

[Open an issue](https://github.com/vikz91/soundframe/issues/new) for a bug, usability problem, or feature proposal. For bugs, include:

- A short description, steps to reproduce, and expected versus actual behaviour.
- Your device, operating system, browser version, and project version or commit.
- For media failures: input format, duration, approximate file size, visual mode, and export format.
- Relevant error messages or screenshots, with personal information removed.

For feature proposals, explain the use case and how it fits the [v0 scope](docs/V0_DECISIONS.md). Share a small synthetic or public-domain sample where possible; avoid posting private recordings, credentials, or other sensitive data.

## Contributing

Focused fixes, accessible UI improvements, documentation, and reproducible media tests are welcome.

1. Read the [product decisions](docs/V0_DECISIONS.md) and [repository guidance](AGENTS.md). Discuss substantial scope changes in an issue first.
2. Create a descriptive branch such as `feat/export-controls`, `fix/cancellation`, or `docs/setup`.
3. Keep changes focused and reuse existing components and dependencies.
4. Run `bun run check`. Run `bun run build` when changing dependencies, bundling, configuration, or rendering.
5. For media changes, verify the affected browser flow and report the devices and formats actually tested.
6. [Open a pull request](https://github.com/vikz91/soundframe/compare) describing the problem, change, verification, and remaining limitations.

A successful build or type check does not prove audio synchronisation, export playback, cancellation, or mobile memory safety. Include runtime evidence where the change affects those behaviours.

## Documentation

- [v0 product decisions](docs/V0_DECISIONS.md) — inputs, outputs, privacy, limits, and release requirements.
- [Browser media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md) — worker ownership, encoding paths, memory, and benchmarks.
- [Repository instructions](AGENTS.md) — coding conventions, scope, and verification.
- [Dependency and workflow guide](docs/AGENT_GUIDE.md) — package guidance and focused documentation lookup.
- [Sub-agent guide](docs/SUBAGENTS.md) — bounded task ownership when delegation is requested.

## Beyond v0

Possible future work includes higher-resolution exports, more visual effects and customisation, accounts and saved projects, AWS rendering, and direct YouTube uploads. These are future options; v0 focuses on local browser conversion and downloads.
