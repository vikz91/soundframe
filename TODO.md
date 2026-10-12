# Audioframe TODO

Updated: 12 October 2026.

The visual prototype, real local-media input/composition stage, and real encoding/output lifecycle are implemented. The complete seven-minute desktop matrix is verified at both 320p and 720p for all three modes and both formats. Physical-device validation, a supported device/memory baseline, and authenticated hosting allowances remain pending. Checked items below describe implemented or tested work; desktop and viewport evidence do not establish mobile release readiness.

## Completed foundations

1. [x] Define v0 inputs, output formats, privacy, limits, and release requirements in [product decisions](docs/V0_DECISIONS.md).
2. [x] Define the single-engine worker strategy and conditional bounded Canvas export path in [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md).
3. [x] Create Audioframe branding, concept references, and screen/action designs. See the [concept gallery](output/concepts/audioframe-v0-2026-10-12/index.html).
4. [x] Create shared semantic design tokens, shadcn/Base UI atoms, and reusable Audioframe controls. See [tokens](app/design-tokens.css) and the [design-system showcase](app/demo/design-system/showcase.tsx).
5. [x] Establish Bun, strict TypeScript, linting, formatting, and hook/media/tooling checks.
6. [x] Implement a shared lazy FFmpeg.wasm wrapper with sequential worker reuse, overlap protection, cancellation, failure recovery, and temporary-file cleanup. Wrapper lifecycle tests use a mocked engine; a separate regression executes the real WASM core, and short real-output acceptance is recorded below. See [wrapper](lib/ffmpeg.ts) and [usage](docs/FFMPEG.md).
7. [x] Add reusable hooks for file picking/loading, native audio playback, animation, and local downloads. See the reuse table in [repository instructions](AGENTS.md#shared-browser-hooks-and-wrappers).
8. [x] Retain the existing cover-art and visualisation demos separately from the prototype.

## Completed visual prototype

Implementation: [sample workspace](components/prototype/workspace.tsx) at `/prototype`, [session controller](lib/prototype/controller.ts), and [fixtures](lib/prototype/fixtures.ts). The current Home promotes the real local-media editor at `/create`, with local-processing Help and a separate, clearly identified sample-prototype entry.

9. [x] Implement server-rendered Home and workspace route wrappers. The sample-only workspace lives at `/prototype`; `/create` opens the real editor with working video export and downloads.
10. [x] Add Home composition, workflow explanation, supported formats/resolutions, local-processing Help, demo links, a primary Create a video action, and a separate sample-prototype entry.
11. [x] Keep Files, Create, Export, and Download in one mounted client workspace; selections and preferences survive view changes and reset on reload.
12. [x] Gate Create/Export until valid sample audio and artwork are selected; visibly disable unavailable steps.
13. [x] Implement sample selection, replacement, removal, simulated checking, inline errors, and settings import.
14. [x] Implement Cover/Spectrum/Lighting, accent/background/sensitivity/typography controls, and Style/Text/Lyrics inspectors.
15. [x] Reuse one composition across Home, editor, expanded preview, export, and result screens.
16. [x] Implement simulated play/pause, seeking, and volume; reduced motion disables the animated visual treatment.
17. [x] Display predefined LRC cues against the sample clock; display arbitrary edited lyrics statically with clear guidance.
18. [x] Implement MP4/WebM settings at fixed 568 × 320 / 30 fps, approximately eight-second simulated exports, staged progress, cancellation, and retry.
19. [x] Add valid/invalid audio, artwork, preset, and LRC choices; the export-failure sample fails once and succeeds on retry.
20. [x] Implement result details, simulated download/settings actions, Back to editing, Clear project, retention countdown, and expired-result recovery.
21. [x] Preserve the previous result through editing, cancellation, and failure until another successful export replaces it.
22. [x] Anchor one-hour retention to successful completion; download clicks do not extend availability.
23. [x] Implement Clear project, Cancel export, Replace settings, Help, expanded preview, and reusable sample-chooser dialogs.
24. [x] Add safe confirmation focus, focus containment/restoration, Escape handling, and restrained status announcements.
25. [x] Guard and dispose timers on cancellation, clearing, replacement, and unmount so stale callbacks cannot update a newer session.
26. [x] Keep prototype actions free of native file selection, real media playback, FFmpeg, downloads, and uploads; preserve native behavior in shared controls when overrides are absent.

## Prototype verification completed

These historical results were obtained during the sample-prototype implementation, before the real local-media stage. Its workspace has since moved from `/create` to `/prototype`.

27. [x] `bun run check` passed with 76 tests across the configured suites; focused controller and picker-override tests run through `bun run test:prototype`.
28. [x] `bun run build` passed, including `/`, `/create`, and existing demo routes.
29. [x] Browser-check the empty-to-result journey, invalid samples, customisation, settings replacement, clearing, cancellation, failure/retry, and retained previous output.
30. [x] Verify one-hour expiry, download-independent retention, background expiry refresh, and stale callback rejection with controlled-clock tests.
31. [x] Check desktop and 390 px mobile layouts, preview-first ordering, primary touch targets, and horizontal overflow.
32. [x] Check light/dark themes, reduced motion, keyboard tabs/radios/sliders, and dialog focus behavior.
33. [x] Confirm the production prototype has no native file inputs or audio/video elements and no browser warnings/errors in the checked journey.
34. [x] Save screenshots of pages, mobile layouts, and modal/recovery states in [output/prototype](output/prototype/).

## Completed: real media inputs and composition

Implementation: [local editor](components/editor/workspace.tsx), [media validation](lib/local-media.ts), [composition](lib/editor/composition.ts), [LRC parser](lib/editor/lyrics.ts), and [settings](lib/editor/settings.ts). The sample-only prototype remains separate. At completion of this input stage, video export was still disabled; the encoding stage below now enables it.

35. [x] Connect production file selection and drag/drop to the shared loading lifecycle; preserve cancellation, replacement, and stale-result cleanup.
36. [x] Validate real MP3, M4A, WAV, and MP4 audio contents, browser decodability, finite audio duration, and the seven-minute limit; MP4 contributes audio only.
37. [x] Validate/decode JPG and PNG artwork, including rotated JPEG dimensions. Apply conservative 12 MiB, 16-million-pixel, and 8192-pixel-side limits before decoding. Desktop boundary fixtures passed; mobile calibration remains a release gate under items 58–59.
38. [x] Probe single-thread WASM/workers, local files/blob URLs, Web Audio, Canvas, font loading, and colour support; show actionable errors before proceeding.
39. [x] Connect actual audio playback, seek, and volume through `useAudioPlayback`; handle rejection, replacement, end-of-audio, and React ref reattachment.
40. [x] Share one deterministic 568 × 320 logical Canvas composition at 30 fps, with an absolute frame-index timeline and explicit assets/audio samples for preview and encoding. The painter scales to the selected 320p or 720p Canvas dimensions.
41. [x] Drive Spectrum from frequency samples and Lighting from waveform RMS; reuse analysis buffers and paint outside React state.
42. [x] Parse and validate real LRC with repeated timestamps, up to three fractional digits, signed millisecond offset, stable equal-time ordering, empty cues, and seek lookup. Keep plain lyrics static; reject enhanced word timing.
43. [x] Freeze loaded fonts, decoded artwork references, semantic colours, metadata, and lyric cues into a composition snapshot. Tests confirm identical preview/export draw operations for identical inputs; short encoded-video verification is recorded below; full-timeline/device synchronisation remains pending under item 57.
44. [x] Validate strict version-1 JSON settings, confirm replacement, import/export local files, and test round trips. Media references, credential keys, unsupported versions, and unknown fields are rejected.

Verification for this stage on 12 October 2026: `bun run check` passed with 104 tests, and `bun run build` passed, including `/create` and `/prototype`. Desktop browser checks covered all four audio formats, both artwork formats, real playback, seeking to LRC cues, volume controls, settings download/import, invalid replacements, video-only MP4, renamed text, and overlong audio. Exact seven-minute MP3 and AAC/M4A fixtures passed; MP4 with longer video and shorter audio used the audio duration. Artwork acceptance/rejection was checked at 12 MiB and 16 million pixels. A 390 px viewport had no horizontal overflow. Screenshots are in [output/media-inputs](output/media-inputs/). Cancellation/resource tests and renderer equivalence tests use mocks; physical mobile performance, actual encoding, and exported-video synchronisation remain unverified.

## Completed: real encoding and output lifecycle

Implementation: [bounded encoder](lib/editor/encode.ts), [offline analysis](lib/editor/offline-analysis.ts), [output controller](lib/editor/export-controller.ts), and the [real editor](components/editor/workspace.tsx). See the [encoding evidence](output/encoding/verification.json) and [repeatable browser acceptance script](scripts/verify-encoding.mjs).

45. [x] Probe the shipped WASM build for filters and codecs; verify H.264/AAC and VP8/Opus exports. Canvas supplies the loaded fonts/composition. The installed core traps on stereo `libopus`; use its native Opus encoder with explicit 48 kHz stereo instead. See the [upstream stack issue](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/591).
46. [x] Prove a short real export in both MP4 and WebM with audio, 568 × 320 dimensions, and 30 fps.
47. [x] Select sequential Canvas batches for all three modes to preserve the existing painter, fonts, text wrapping, clipping, semantic colours, and gradients. Available FFmpeg filters would require a second composition implementation; a continuous graph is deferred until equivalence is demonstrated.
48. [x] Bound raw batches to 30 frames at 320p (20.80 MiB) or five frames at 720p (17.58 MiB), offline mono PCM to 35.41 MiB, encoded parts to 64 MiB, and final output to 80 MiB. Await transfer/encoding before producing the next batch; use FFmpeg file-size guards and reject oversized results. Desktop heap/RSS observations are recorded below; total memory and safe mobile limits remain release gates.
49. [x] If sequential chunks are necessary, implement frame-index boundaries, state continuity, compatible concatenation, and a single final soundtrack; verify the final partial chunk and assembly memory peak.
50. [x] Connect real preparation/rendering/finalisation progress and approximate ETA to measured work, retaining one active export and one engine.
51. [x] Implement production cancellation/retry and cleanup of workers, audio resources, buffers, virtual files, listeners, timers, and object URLs.
52. [x] Preserve editable inputs/preferences after cancellation or failure and retain the previous successful output until a new result replaces it.
53. [x] Connect download actions to real output Blobs using `useDownload`; verify that saved videos play with audio.
54. [x] Apply one-hour output retention to real Blobs/object URLs; release resources on expiry, clear, replacement, and disposal. Download clicks must not reset the timer.
55. [x] Keep processing local and lazy-load heavy media code; verify that input and output media are never uploaded.

- [x] Restore the entry WASM stack after each synchronous core command, preventing cumulative stack exhaustion during sequential exports. Asset generation rejects changed upstream bindings; the real-core regression executes 420 video commands, probing, a failed command, and recovery. See the [compatibility patch](scripts/patch-ffmpeg-core.mjs) and [regression](scripts/ffmpeg-core.test.mjs).
- [x] Add default 320p and optional 720p selection for both formats, scale the shared painter, keep raw batches within the existing byte budget, preserve exact concat timing, retain captured-result dimensions, and support legacy version-1 settings. Resolution verification is recorded under [release gates](#release-gates).

Verification on 12 October 2026 used headless Chrome 154.0.8037.98 on an Apple M1 with 16 GiB RAM. Six 2.35-second stereo exports (Cover/Spectrum/Lighting × MP4/WebM) passed FFprobe codec, 568 × 320, 30 fps, 71-frame, stereo/audio inclusion, and duration checks. Outputs were within one frame of the soundtrack duration; native Opus adds small container padding. Saved videos played and sought in Chrome; decoded audio retained silence before 0.5 seconds and sound after it. Cover lyrics changed on frames 30 and 60, checked against preview pixels on both sides of chunk boundaries; reactive effect pixels changed with the signal. Cancellation and a forced WASM-load failure preserved the previous result; retry succeeded. Background expiry removed the Blob/video/download URLs; Clear project left no tracked URLs. No media POST/PUT/PATCH requests or page errors were observed. Desktop and 390 px result screenshots are in [output/encoding](output/encoding/). `bun run check` passed with 113 tests and `bun run build` passed. The same acceptance suite also passed against the production build on a separate local server; see [production evidence](output/encoding/production/verification.json).

The first cold MP4 export took about 1.3 seconds; subsequent short exports took about 0.4–0.9 seconds in the initial measurement. That run observed about 121 MiB peak JavaScript heap and 1.36 GiB aggregate browser-process RSS versus a 0.85 GiB baseline. RSS includes browser/GPU processes and shared pages; heap excludes some native/WASM allocations. These are sampled observations, not hard browser-memory guarantees or seven-minute/mobile performance claims. [Latest repeatable measurements](output/encoding/verification.json) include timing and memory values. These initial short-run observations are superseded by the full-length and live-host evidence below. Representative music-quality review and physical Android/iPhone validation remain open.

## Release gates

Resolution selection added on 12 October 2026: 320p (568 × 320) remains the default; 720p (1280 × 720) is available for both formats at 30 fps. Short Spectrum exports at 720p passed codec, audio, 71-frame, final-partial-batch, and full-decode checks for MP4 and WebM; a 320p MP4 regression also passed. A four-minute synthetic Spectrum MP4 at 720p completed with exactly 7,200 frames, 30 fps, and matching 240-second video/stereo AAC audio; the saved file passed complete decoding. Concat durations derive from absolute frame boundaries to prevent timing drift from container rounding. The selector and captured-result labels, native preview dimensions, legacy settings default, 720p settings round trip, and 390 px layout were browser-checked. `bun run check` passed with 119 tests and `bun run build` passed. The subsequent seven-minute/all-mode desktop runs at both resolutions passed; physical-device release gates below remain open.

56. [x] Complete seven-minute MP4 and WebM exports for Cover, Spectrum, and Lighting at both 568 × 320 and 1280 × 720; all twelve passed codecs, 30 fps, 12,600 frames, duration, stereo audio, complete decoding, and saved playback/seeking. The 720p H.264 path uses CRF 30 after earlier settings hit the encoded-parts allocation guard; allocation guards remain unchanged.
57. [x] Verify desktop audio/visual/lyric synchronisation: all video packet timestamps, audio markers every 30 seconds, forward/late seeking through 419.1 seconds and Cover lyric pixels before/after boundaries through 419 seconds. Extended seven-minute Spectrum/Lighting checks passed all 14 recurring visual/audio markers, including both formats at 720p. All six short 720p checks cover partial five-frame chunks. Physical-device validation remains under items 58–59.
58. [ ] Benchmark representative desktop, Android, and iPhone browsers; desktop M1/16 GiB Chrome 154 timing, engine/hash, responsiveness and sampled memory are recorded. Physical Android/iPhone runs are blocked: no attached Android device or available iPhone tooling.
59. [ ] Establish the supported device baseline and practical input/memory limits; the tested desktop configuration is recorded, and full-length 720p exports passed, but minimum hardware/mobile limits and representative music-quality review remain unproven. Retain the current allocation guards and single-threaded compatibility path.
60. [x] Review profiling before introducing multi-threading or another Canvas worker. Seven-minute desktop runs retained a responsive 50 ms heartbeat (p95 51.9–59 ms, maximum 65.6 ms); no additional worker is justified by these observations. The single-thread path passed without SharedArrayBuffer/isolation; cancellation/failure/retry/disposal are covered. Alternate cores remain deferred, with no alternate path to fall back from.
61. [x] Browser-test real invalid files, delayed native file-read cancellation, export cancellation/failure/retry, repeated exports, completion-anchored expiry, playable downloads and strict JSON settings round trips. Desktop production and live Vercel evidence are linked below. A separate 720p check also passed cancellation after rendering reached at least 10%, failure/retry, expiry, and cleanup; full-length 720p matrices skipped repeated recovery scenarios.
62. [x] Recheck real-media layouts at 320, 390, 844 and 1280 px, portrait/landscape, light/dark, all modes, reduced motion, keyboard tabs/radios/seek/volume, 44 px primary targets and mobile dialog focus/Escape/reset. Fix narrow-screen workflow navigation overflow; emulation is not physical-device evidence.
63. [x] Add focused regression coverage plus an opt-in real browser/FFprobe acceptance script for both formats, all modes, partial chunks, audio onset, lyric boundary pixels, cancellation, failure/retry, expiry, and cleanup. Complete-device release evidence is still required.
64. [ ] Run `bun run check`, `bun run build`, and integrated browser/device checks after production integration; local production browser evidence/screenshots and build pass are retained. Physical-device integration remains blocked under item 58; final quality results are recorded in the validation report.
65. [x] Update README status/workflow and developer documentation for the completed sample prototype and real input/preview stage, conservative input limits, recorded verification, and pending production release gates. Keep them current as encoding and device validation progress.
66. [ ] Verify Vercel production asset loading, capability behavior, and hosting allowances before an explicitly authorized release/deployment. The supplied live URL passed all six short real exports, asset MIME/security/cache/hash checks, single-thread capability behavior, cancellation/retry and cleanup. Public hosting limits were reviewed; account plan, eligibility and remaining quotas require authenticated Vercel access, unavailable here. No deployment was performed.

Release validation on 12 October 2026: [seven-minute 320p evidence](output/release/320p/verification.json), [seven-minute 720p MP4 evidence](output/release/720p-mp4/verification.json), [seven-minute 720p WebM evidence](output/release/720p-webm/verification.json), [all-mode short 720p evidence](output/release/720p-short-final/verification.json), [mid-render cancellation evidence](output/release/mid-render-cancel/verification.json), [production UI checks/screenshots](output/release/ui-final/verification.json), [live Vercel browser evidence](output/release/vercel/verification.json), and [hosting assets](output/release/hosting/verification.json). See [release validation](docs/RELEASE_VALIDATION.md) for measured timing, memory limits, reproducible commands and remaining gates. Evidence stays local under the ignored `output/` directory. Seven-minute synthetic 320p outputs took 50.762–60.528 seconds for MP4 and 106.312–133.297 seconds for WebM. The run sampled 193.1 MiB peak JavaScript heap and 1.48 GiB aggregate browser RSS versus a 0.82 GiB baseline, with no page errors, media uploads or tracked URLs remaining after clear. These are observations on one desktop, not mobile memory guarantees.

The completed 720p runs took 287.833–361.935 seconds for MP4 and 531.862–586.311 seconds for WebM. The two format matrices overlapped, so these are functional-validation timings rather than isolated performance benchmarks. They observed up to 179.5 MiB JavaScript heap and 1.40 GiB aggregate browser RSS, a maximum heartbeat interval of 120.6 ms, no page errors or media uploads, and no tracked URLs after clear. MP4 duration was 420 seconds; WebM duration was 420.004 seconds, with maximum video timestamp error below 0.001 seconds. Full-length matrices checked expiry and cleanup; recovery scenarios passed separately in the short 720p suite. The local encoder changes have not been deployed to the supplied live URL.

## Beyond v0

These are optional future work, not blockers for the local converter.

67. [ ] Evaluate the separate [YouTube integration plan](docs/YOUTUBE_INTEGRATION_PLAN.md) after local rendering/download release gates pass; its connection, upload, and launch requirements are still planned.
68. [ ] Revisit resolutions above 720p, additional effects, accounts/saved projects, cloud storage, and server rendering only through separate product decisions.
