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

A simple way to turn an audio track into a shareable video. Choose your artwork, add a title or lyrics, and pick a visual style. Audioframe processes media locally in your browser: your media stays on your device, with no account or server rendering required.

The v0 goal is a free tool for desktop and capable mobile browsers, hosted on Vercel. Availability remains subject to hosting quotas and device capabilities.

## Project status

**Local media preview, video encoding, and output downloads are implemented.** Both `/` and `/create` open the real editor, which accepts real audio and artwork, offers Classic (Cover/Spectrum/Lighting) and Full cover (Bars/None) layouts with song details and plain or timed LRC lyrics, imports/exports JSON settings, and generates MP4 or WebM videos locally.

Encoding uses one lazy FFmpeg.wasm worker with bounded Canvas batches. The editor reports progress and approximate ETA, supports cancellation/retry, and retains the previous successful video until replacement or expiry. See the [TODO tracker](TODO.md), [product decisions](docs/V0_DECISIONS.md), and [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md) for implementation and remaining release gates.

Initial encoding verification on 12 October 2026 recorded `bun run check` passing with 113 tests and `bun run build` passing. Six short desktop exports passed codec, 568 × 320 / 30 fps, audio, playback, seeking, partial-chunk, and lyric-boundary checks. The acceptance suite passed against development and production builds. Browser checks also covered cancellation, forced failure/retry, expiry, URL cleanup, and a 390 px result layout. These are historical results for that stage; see [encoding evidence](TODO.md#completed-real-encoding-and-output-lifecycle) for the checks and remaining release gates.

The later resolution update adds default 320p and optional 720p for both formats. Short 720p Spectrum exports passed codec/audio/full-decode checks, and a four-minute 720p Spectrum MP4 passed exact frame-count, 30 fps, matching audio/video duration, and complete decoding checks. Settings compatibility and a 390 px layout were verified; checks passed with 119 tests and the production build passed. See the [resolution verification and remaining release gates](TODO.md#release-gates).

Recorded release validation on 12 October 2026 completed all twelve seven-minute **Classic** exports across 320p/720p, Cover/Spectrum/Lighting, and MP4/WebM, each with 12,600 frames, correct stereo codecs, full decoding, timeline timestamp checks, and audio markers every 30 seconds. All-mode short 720p exports, local production UI checks, and real exports on the supplied Vercel URL also passed. The 320 px navigation overflow was fixed locally. [Release validation](docs/RELEASE_VALIDATION.md) records evidence, repeatable tools, memory observations and blocked physical-device/account-quota gates.

Full cover has short MP4/WebM export evidence at both resolutions. After removing the details visibility toggle and improving preview density and metadata typography, the 320p Full cover suite and a Classic Cover MP4 regression passed again; `bun run check` and `bun run build` also passed. The current duration limit is fifteen minutes; the full-length all-layout/mode/format matrix and physical-device validation remain open. See the [Full cover tracker](TODO.md#completed-full-cover-layout-and-sharper-preview).

## The workflow

**Choose files → customise → preview → export → download**

Available now at `/create`:

1. Select or drop an audio file up to **fifteen minutes** long and a JPG or PNG cover image.
2. Choose **Classic** (Cover, Spectrum, or Lighting) or **Full cover** (Bars or None). Switching layouts restores each layout's appearance choices.
3. Add optional song details, plain lyrics, or timed LRC lyrics; adjust colours and typography. Full cover retains song details and lyrics; leave individual detail fields empty to omit them.
4. Play, pause, seek, and adjust volume while previewing the composition.
5. Choose **320p** or **720p** in Output preferences, select **MP4** or **WebM**, export, preview the generated video, and download it locally. Both resolutions use **30 fps**; 320p is the default and exports faster.
6. Export settings as JSON to reuse them later. Importing settings requires confirmation and preserves the selected audio and artwork.

| Capability       | Current implementation or remaining target                                              |
| ---------------- | --------------------------------------------------------------------------------------- |
| Audio input      | MP3, M4A, WAV, or the audio track from MP4; actual contents/decode validated            |
| Artwork          | JPG or PNG; actual dimensions/decode validated                                          |
| Visuals          | Classic: Cover, Spectrum, Lighting. Full cover: artwork background with Bars or None    |
| Text             | Song title, album, artist, website, static lyrics, and timed LRC                        |
| Canvas preview   | Display-density Canvas, capped at 1920 pixels wide, using the shared 30 fps composition |
| Video resolution | **320p (568 × 320)** by default or **720p (1280 × 720)**, both at **30 fps**            |
| Presets          | Strict version-1 JSON settings; media files are selected separately                     |
| MP4 output       | H.264 video with AAC stereo audio                                                       |
| WebM output      | VP8 video with Opus stereo audio                                                        |
| Export lifecycle | Up to fifteen minutes, one export at a time, progress, ETA, and cancellation            |

### Layouts and song details

Full cover offers **Thin**, **Bold**, or **Segmented** bottom bars, **Ivory** or **Accent** colour, sensitivity, maximum bar height (5–30% of the frame), and an adjustable bottom fade. **Fit artwork** keeps the whole cover over a softened artwork background; **Fill frame** crops to fill the video and provides horizontal/vertical positioning. Lighting is available in Classic. Title, artist, album, and website appear above the artwork; lyrics remain above the bars. Full cover uses stronger metadata weights and a sharp shadow, while the preview adapts to display width and pixel density. Export text is still rasterised at the selected video resolution.

### Input limits and lyrics

The duration cap is **15 minutes**. Production-browser verification passed a full-length Spectrum MP4 and Cover WebM at 320p, each with 27,000 frames. See [fifteen-minute verification](docs/RELEASE_VALIDATION.md#fifteen-minute-duration-verification-16-october-2026) for exact scope and remaining device/matrix gates.

Files below the size limits can still be rejected when estimated buffers or available JavaScript heap lack headroom. The provisional buffer budget is 25% of reported device RAM, capped at 1 GiB, or 768 MiB when unavailable. Accounting includes 128 MiB runtime headroom and a 256 MiB allowance for the loaded FFmpeg engine. When heap readings are available, current heap plus the next estimated allocation must stay within 80% of the reported limit. These estimates are admission checks, not a hard cap on browser memory. Encoded video parts are capped at **128 MiB** and the final video at **160 MiB**. See [memory admission checks](docs/MEDIA_PIPELINE_ARCHITECTURE.md#memory-admission-checks) for the provisional policy and browser limitations.

Audio must be non-empty, at most **128 MiB**, browser-decodable, and have a finite positive duration of at most **900 seconds**. MP4 video is ignored; validation and preview use the audio duration even when the video is longer.

Artwork must be non-empty and at most **24 MiB**, **16 million pixels**, and **8192 pixels per side**. JPEG orientation can swap decoded dimensions. The byte limits were doubled on 16 October 2026; the 12 October desktop release evidence predates that change. Later boundary and fifteen-minute checks are recorded in [release validation](docs/RELEASE_VALIDATION.md). Physical-device calibration remains pending.

Plain and timed lyrics are limited to **20,000 characters**. LRC accepts timestamps such as `[00:03]` or `[00:03.125]`, repeated timestamps on a line, metadata tags, and one signed millisecond offset between -900000 and 900000. Positive offset advances cues; equal timestamps use the last source occurrence. Empty timed cues clear the text. Enhanced word timing is unsupported. Imported `.lrc` files must be non-empty and at most **512 KiB**.

JSON settings must be non-empty and at most **256 KiB**, with the shape `{ "version": 1, "preferences": { ... } }`. Preferences include layout, independent Classic/Full cover appearance choices, output format, and resolution. Older version-1 presets without layout import as **Classic**, and those without resolution import as **320p**; unsupported values are rejected. The retired `fullCover.showDetails` boolean is accepted and discarded, so it cannot hide populated fields and is omitted from new presets. The strict schema rejects unsupported versions, other unknown keys, media references, and credentials. Song-detail fields are limited to **200 characters** each. See the [settings schema](lib/editor/settings.ts) for supported values.

### Privacy and device support

The current editor reads and decodes selected media locally using browser APIs. Web Audio drives the visual effects, Canvas paints the preview, and JSON settings download locally. The encoder uses FFmpeg.wasm and its built-in worker, loaded only when export starts; preview does not load the engine. Server media uploads and hosted video links remain outside v0.

Generated video Blobs and URLs remain available for repeat downloads until **Clear project**, page closure, or one hour after successful generation. Downloads do not extend retention; successful replacement releases the old output, while editing, cancellation, and failure preserve it. The timer is best effort while the page runs; it cannot delete files already downloaded to your device.

Download names use the song title and optional artist, for example `Morning Light - River - audioframe.mp4`. An empty title becomes `Untitled track`. Unsafe filename characters are removed or replaced, and names are limited to 255 UTF-8 bytes. The result keeps the filename, format, and resolution captured at export start; later preference edits do not relabel an existing video.

Modern desktop and capable mobile browsers are the target. Keep the app open and in the foreground during export. Historical seven-minute Classic exports have desktop evidence in every mode and both formats at 320p and 720p. Current fifteen-minute production checks cover Spectrum MP4 and Cover WebM at 320p. Older or low-spec phones may be unsupported; physical mobile performance, practical device limits and Full cover full-length validation still require testing.

## Get started

Install **Bun 1.4.0**, the version pinned in `package.json`, then:

```bash
git clone https://github.com/vikz91/soundframe.git
cd soundframe
bun install
bun run dev
```

Open [localhost:3000](http://localhost:3000) or [the editor at /create](http://localhost:3000/create). The development server reloads when you edit the application.

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

| Command                 | Purpose                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `bun run dev`           | Start the development server                                                       |
| `bun run check`         | Run lint, formatting, TypeScript, hook, media, and tooling tests                   |
| `bun run lint`          | Check Oxlint rules; warnings fail                                                  |
| `bun run lint:types`    | Generate route types, then run type-aware lint with tsgolint                       |
| `bun run typecheck`     | Generate route types, then check TypeScript without emitting JavaScript            |
| `bun run format:check`  | Check Oxfmt formatting                                                             |
| `bun run test:hooks`    | Test commit tooling in temporary repositories                                      |
| `bun run test:media`    | Test media validation, lifecycles, capabilities, composition, lyrics, and settings |
| `bun run test:tooling`  | Verify native, compatibility, and semantic lint rules                              |
| `bun run ffmpeg:assets` | Refresh locally served FFmpeg runtime assets                                       |
| `bun run lint:fix`      | Apply supported Oxlint fixes                                                       |
| `bun run format`        | Format the repository with Oxfmt                                                   |
| `bun run build`         | Create a production build                                                          |

### Git hooks and versioning

Oxlint uses `.oxlintrc.json`; `.oxlintrc.type-aware.json` adds semantic TypeScript checks through tsgolint, including deprecated APIs. React and Hooks checks use native rules; a dependency-free [local rule](scripts/lint-plugin.mjs) retains the Next.js internal-navigation check. Oxfmt uses `.oxfmtrc.json` and preserves the existing formatting style. See the [tooling guide](docs/AGENT_GUIDE.md#linting-and-formatting) for coverage and compiler/editor support.

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

For media failures, include input format, duration, approximate size, visual mode, output format, and resolution. Share a small synthetic or public-domain sample where possible; avoid posting private recordings, credentials, or other sensitive data. The [issue chooser](https://github.com/vikz91/soundframe/issues/new/choose) also allows a blank issue for reports that do not fit either template.

## Contributing

Focused fixes, accessible UI improvements, documentation, and reproducible media tests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch conventions, verification, commit versioning, and the pull request process.

Pull requests use a [template](.github/PULL_REQUEST_TEMPLATE.md) covering the problem, resulting behaviour, related issues, verification, and remaining limitations. Run `bun run check` and the relevant build/browser checks, then record the actual results in your PR.

A successful build or type check does not prove audio synchronisation, export playback, cancellation, or mobile memory safety. Include runtime evidence where the change affects those behaviours.

### GitHub automation

The [CI workflow](.github/workflows/ci.yml) runs syntax/type-aware lint, formatting, TypeScript, and tests in one quality job on PRs and pushes to `main`. Locked dependency audits run when `package.json` or `bun.lock` changes, weekly, and on manual runs. Results appear in GitHub's checks; no separate PR status comment is posted.

[Vercel configuration](vercel.json) enables automatic builds and deployments only for `main`, with selected documentation-only changes skipped. PRs run quality checks without a production build or deployment; GitHub Actions does not build or deploy the application. [Dependabot](.github/dependabot.yml) checks Bun packages and GitHub Actions weekly. Commit hooks still bump the package version locally; tags do not automatically publish GitHub releases.

## Documentation

- [TODO tracker](TODO.md) — completed work, verification evidence, and remaining release gates.
- [Contribution guide](CONTRIBUTING.md) — setup, checks, versioning, and pull requests.
- [v0 product decisions](docs/V0_DECISIONS.md) — inputs, outputs, privacy, limits, and release requirements.
- [Browser media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md) — worker ownership, encoding paths, memory, and benchmarks.
- [Browser FFmpeg wrapper](docs/FFMPEG.md) — hook usage, worker reuse, cancellation, cleanup, and local WASM assets.
- [Future YouTube integration](docs/YOUTUBE_INTEGRATION_PLAN.md) — proposed uploads, authorization, costs, notifications, and launch requirements beyond v0.
- [Repository instructions](AGENTS.md) — coding conventions, scope, and verification.
- [Dependency and workflow guide](docs/AGENT_GUIDE.md) — package guidance and focused documentation lookup.
- [Sub-agent guide](docs/SUBAGENTS.md) — bounded task ownership when delegation is requested.

## Beyond v0

Possible future work includes resolutions above 720p, more visual effects and customisation, accounts and saved projects, AWS rendering, and direct YouTube uploads. These are future options; v0 focuses on local browser conversion and downloads.
