# Audioframe TODO

Updated: 12 October 2026.

The visual prototype is complete. The real local-media editor and video export pipeline remain in development. Checked items below describe implemented work; prototype verification does not establish production media readiness.

## Completed foundations

1. [x] Define v0 inputs, output formats, privacy, limits, and release requirements in [product decisions](docs/V0_DECISIONS.md).
2. [x] Define the single-engine worker strategy and conditional bounded Canvas export path in [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md).
3. [x] Create Audioframe branding, concept references, and screen/action designs. See the [concept gallery](output/concepts/audioframe-v0-2026-10-12/index.html).
4. [x] Create shared semantic design tokens, shadcn/Base UI atoms, and reusable Audioframe controls. See [tokens](app/design-tokens.css) and the [design-system showcase](app/demo/design-system/showcase.tsx).
5. [x] Establish Bun, strict TypeScript, linting, formatting, and hook/media/tooling checks.
6. [x] Implement a shared lazy FFmpeg.wasm wrapper with sequential worker reuse, overlap protection, cancellation, failure recovery, and temporary-file cleanup. Lifecycle tests use a mocked engine; real output acceptance remains pending. See [wrapper](lib/ffmpeg.ts) and [usage](docs/FFMPEG.md).
7. [x] Add reusable hooks for file picking/loading, native audio playback, animation, and local downloads. See the reuse table in [repository instructions](AGENTS.md#shared-browser-hooks-and-wrappers).
8. [x] Retain the existing cover-art and visualisation demos separately from the prototype.

## Completed visual prototype

Implementation: [workspace](components/prototype/workspace.tsx), [session controller](lib/prototype/controller.ts), and [fixtures](lib/prototype/fixtures.ts).

9. [x] Implement server-rendered `/` and `/create` route wrappers with the prototype disclosure on both pages.
10. [x] Add Home composition, workflow explanation, intended supported formats, Help, demo links, and the prototype entry action.
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

These results were obtained during the prototype implementation, before this documentation-only update.

27. [x] `bun run check` passed with 76 tests across the configured suites; focused controller and picker-override tests run through `bun run test:prototype`.
28. [x] `bun run build` passed, including `/`, `/create`, and existing demo routes.
29. [x] Browser-check the empty-to-result journey, invalid samples, customisation, settings replacement, clearing, cancellation, failure/retry, and retained previous output.
30. [x] Verify one-hour expiry, download-independent retention, background expiry refresh, and stale callback rejection with controlled-clock tests.
31. [x] Check desktop and 390 px mobile layouts, preview-first ordering, primary touch targets, and horizontal overflow.
32. [x] Check light/dark themes, reduced motion, keyboard tabs/radios/sliders, and dialog focus behavior.
33. [x] Confirm the production prototype has no native file inputs or audio/video elements and no browser warnings/errors in the checked journey.
34. [x] Save screenshots of pages, mobile layouts, and modal/recovery states in [output/prototype](output/prototype/).

## Next: real media inputs and composition

Reuse the existing controls and browser hooks. Preserve an explicit sample-only prototype while real media integration is incomplete.

35. [ ] Connect production file selection and drag/drop to the shared loading lifecycle; preserve cancellation, replacement, and stale-result cleanup.
36. [ ] Validate real MP3, M4A, WAV, and MP4 audio contents, decodability, finite duration, and the seven-minute limit; use only the audio track from MP4.
37. [ ] Validate/decode JPG and PNG artwork; establish practical input-size and image-dimension limits through device testing.
38. [ ] Add browser capability checks and actionable unsupported-device/input errors before conversion.
39. [ ] Connect preview playback, seek, and volume to actual audio through `useAudioPlayback`; handle rejected playback and file replacement.
40. [ ] Build a shared deterministic composition/timeline for Canvas preview and export, preserving the approved hierarchy and controls.
41. [ ] Connect Spectrum and Lighting to real audio analysis, keeping audio samples and frame updates outside React state.
42. [ ] Implement and test real LRC parsing, validation, and synchronised cues; retain static plain lyrics and define supported timestamp behavior.
43. [ ] Ensure fonts, artwork, colours, metadata, and lyrics render consistently in preview and exported frames.
44. [ ] Implement a versioned JSON settings schema with validation, import/export, and round-trip tests; exclude media files and credentials.

## Next: real encoding and output lifecycle

Follow the [media architecture](docs/MEDIA_PIPELINE_ARCHITECTURE.md); choose the rendering bridge and memory budget from measured results.

45. [ ] Confirm the shipped WASM build supports the required composition filters, fonts, H.264/AAC, and VP8/Opus.
46. [ ] Prove a short real export in both MP4 and WebM with audio, 568 × 320 dimensions, and 30 fps.
47. [ ] Select a continuous FFmpeg composition path where suitable; prototype a bounded Canvas-to-encoder bridge for effects that need custom frames.
48. [ ] Establish peak-memory limits and backpressure; never accumulate the full raw frame sequence.
49. [ ] If sequential chunks are necessary, implement frame-index boundaries, state continuity, compatible concatenation, and a single final soundtrack; verify the final partial chunk and assembly memory peak.
50. [ ] Connect real preparation/rendering/finalisation progress and approximate ETA to measured work, retaining one active export and one engine.
51. [ ] Implement production cancellation/retry and cleanup of workers, audio resources, buffers, virtual files, listeners, timers, and object URLs.
52. [ ] Preserve editable inputs/preferences after cancellation or failure and retain the previous successful output until a new result replaces it.
53. [ ] Connect download actions to real output Blobs using `useDownload`; verify that saved videos play with audio.
54. [ ] Apply one-hour output retention to real Blobs/object URLs; release resources on expiry, clear, replacement, and disposal. Download clicks must not reset the timer.
55. [ ] Keep processing local and lazy-load heavy media code; verify that input and output media are never uploaded.

## Release gates

56. [ ] Complete seven-minute MP4 and WebM exports for Cover, Spectrum, and Lighting; verify codecs, dimensions, frame rate, duration, and audio inclusion.
57. [ ] Verify audio/visual/lyric synchronisation through seeking, the complete timeline, and any chunk boundaries.
58. [ ] Benchmark representative desktop, Android, and iPhone browsers; record browser/device, engine version, timing, responsiveness, memory observations, and failures.
59. [ ] Establish the supported device baseline and practical input/memory limits; retain the single-threaded compatibility path.
60. [ ] Introduce multi-threading or an additional Canvas worker only if capabilities and profiling justify it; test fallback and disposal.
61. [ ] Browser-test actual invalid files, interrupted loading, export cancellation/failure, repeated exports, expiry, downloads, and settings round trips.
62. [ ] Recheck mobile layouts, themes, reduced motion, keyboard access, touch targets, and dialogs with real media states.
63. [ ] Add focused regression coverage for the real pipeline; mocks and successful builds alone are insufficient release evidence.
64. [ ] Run `bun run check`, `bun run build`, and integrated browser/device checks after production integration; retain evidence and screenshots.
65. [ ] Update README status/workflow and developer documentation to describe the completed prototype, production readiness, and verified limits. The current README still describes the editor as pending.
66. [ ] Verify Vercel production asset loading, capability behavior, and hosting allowances before an explicitly authorized release/deployment.

## Beyond v0

These are optional future work, not blockers for the local converter.

67. [ ] Evaluate the separate [YouTube integration plan](docs/YOUTUBE_INTEGRATION_PLAN.md) after local rendering/download release gates pass; its connection, upload, and launch requirements are still planned.
68. [ ] Revisit higher resolutions, additional effects, accounts/saved projects, cloud storage, and server rendering only through separate product decisions.
