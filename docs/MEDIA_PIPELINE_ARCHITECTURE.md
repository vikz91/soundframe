# Audioframe browser media pipeline architecture

Status: Locked architecture direction, agreed on 12 October 2026. Local media validation, Classic/Full cover Canvas preview, bounded video encoding, and output retention are implemented. Seven-minute Classic desktop exports passed every mode/format at 320p and 720p. Full cover has short export evidence at both resolutions; its full-length/pattern/lyric matrix and physical-device benchmarks remain pending. See [release validation](RELEASE_VALIDATION.md).

The browser owns media validation, composition, encoding, and download. Use one shared, lazy FFmpeg.wasm engine and its built-in worker, reusing it across sequential exports while the editor is open. Remove each job's files after success; terminate the engine on cancellation, failure, or editor disposal. See the [wrapper API](FFMPEG.md). Introduce chunking only when the selected Canvas export path needs bounded frame batches; parallel chunk encoding requires evidence that it improves speed without unacceptable memory use.

Product limits and retention rules remain defined in [v0 decisions](V0_DECISIONS.md): seven-minute audio, default 320p (568 × 320) or optional 720p (1280 × 720) at 30 fps, MP4/WebM output, desktop and capable mobile support, local downloads, and no server media uploads.

## Implemented input and preview stage

The real editor is [MediaWorkspace](../components/editor/workspace.tsx) at `/create`. `/prototype` retains the sample-only workspace and simulated output lifecycle. Real MP4/WebM export runs through the bounded pipeline; preview does not load FFmpeg.

- [Local media validation](../lib/local-media.ts) checks byte limits, container signatures, audio-track presence, browser decode, and finite positive audio duration up to 420 seconds. MP4 duration comes from decoded audio rather than its video; preliminary audio media-header checks allow bounded AAC padding while the decoded-duration limit stays strict. Artwork headers are checked before image decoding, including JPEG orientation-compatible dimensions.
- [Capability checks](../lib/media-capabilities.ts) probe single-thread WASM, a blob worker, local files/blob URLs, Web Audio, Canvas drawing, font loading, and CSS colour support. Passing this gate does not establish encoding speed or mobile memory safety.
- Shared file/playback hooks handle cancellation, replacement, stale-result disposal, seek, volume, and rejected playback. The editor reuses [LocalAudioAnalyser](../app/demo/viz/audio-analysis.ts); frequency and waveform buffers are reused. Samples and frame painting stay outside React state.
- [Composition preparation](../lib/editor/composition.ts) loads selected fonts and freezes preferences, including the nested Full cover choices, colours, metadata, and parsed cues into a snapshot holding the decoded artwork reference. The caller owns artwork lifetime. `renderComposition` paints a 568 × 320 logical composition scaled to the target Canvas dimensions, from an absolute integer `frameIndex`, with time equal to `frameIndex / 30`. Classic Spectrum and Full cover bars consume frequency samples; Classic Lighting consumes waveform RMS. [Analysis selection](../lib/editor/types.ts) follows the active layout, so Full cover Bars works even when the retained Classic mode is Cover, while Full cover None skips analysis. Export analysis decodes mono 22050 Hz float PCM once with FFmpeg and uses an absolute-time, buffer-reusing 1024-sample Blackman FFT/RMS source. It has no history to reset at a chunk boundary. Native preview analysis uses the browser analyser and its smoothing, so reactive levels need not be pixel-identical to offline export.
- [Preview sizing](../lib/editor/preview-resolution.ts) rasterises at display width × device pixel ratio, with a 568-pixel minimum and 1920-pixel maximum width (about 2.08 million pixels). [Canvas preview](../components/editor/canvas-preview.tsx) observes element size and display-density changes and releases its observer/listener on disposal. This improves text rasterisation without changing export dimensions: the encoder still paints at the selected 568 × 320 or 1280 × 720. Frame samples and repainting remain outside React state.
- Full cover Fit prepares a 32 × 18 softened artwork background once, then draws the complete artwork centred over it. Fill crops the artwork using horizontal/vertical positions. The shared painter applies bottom fade and optional Thin/Bold/Segmented bars; nonempty title/artist/album/website render without a visibility toggle. Preparation loads the title and metadata font weights, and details use a sharp shadow. Plain/timed lyrics use the same absolute cue clock and sit above the maximum bar height.
- [LRC parsing](../lib/editor/lyrics.ts) provides deterministic lookup through forward/backward seeking. [Settings validation](../lib/editor/settings.ts) uses a strict version-1 schema with media-free preferences, confirmed replacement, and local JSON import/export. Layout, independent appearance choices, output format and resolution are included; legacy presets without layout/resolution default to Classic/320p. The retired `fullCover.showDetails` boolean is accepted and discarded, and omitted from new exports. Import preserves selected media, while a new session requires selecting media separately.

Preview and encoding share the painter contract. Mocked Canvas tests verify identical draw operations for identical snapshots, frame indices, and analysis inputs; they do not prove encoded-pixel or audio/video equivalence. The [offline analysis source](../lib/editor/offline-analysis.ts), [bounded encoder](../lib/editor/encode.ts), and [Classic browser acceptance script](../scripts/verify-encoding.mjs) implement this contract. Pixel comparisons normalise display-density preview references to export dimensions. Short Classic exports verify both output codecs, audio onset, final partial batches and lyric-boundary pixels. The complete seven-minute Classic matrix at both resolutions passes full decoding, all video packet timestamps, recurring audio markers and Cover lyric boundaries through 419 seconds. The [Full cover acceptance script](../scripts/verify-full-cover.mjs) verifies short outputs and layout/preset/density behavior separately; it does not establish Full cover full-length or decoded lyric-cue coverage. Physical devices remain pending; see [release evidence](RELEASE_VALIDATION.md).

Earlier resolution checks verified short Spectrum outputs at 720p in both formats and a four-minute 720p Spectrum MP4 with 7,200 frames at exactly 30 fps, matching 240-second video/stereo audio, and complete saved-file decoding. Settings compatibility, captured-result labels, and a 390 px layout were also checked. Subsequent seven-minute Classic matrices passed at both resolutions; these desktop results do not establish physical-mobile readiness or Full cover full-length validation. See [resolution verification and release gates](../TODO.md#release-gates).

Current bounds are 64 MiB per audio file; 12 MiB, 16 million pixels, and 8192 pixels per side for artwork; 20,000 characters for lyrics; 256 KiB per LRC file; and 128 KiB per JSON preset. These are conservative allocation guards, not measured peak-memory budgets. See [stage verification](../TODO.md#completed-real-media-inputs-and-composition) for desktop browser evidence and remaining device gates.

## Locked decisions

- Allow one active export and one FFmpeg engine at a time. Internal threads of the multi-threaded core belong to that same engine.
- Use FFmpeg.wasm's built-in worker for conversion. Do not wrap it in another worker solely to keep encoding off the UI thread.
- Provide a single-threaded core as the compatibility baseline. Select the multi-threaded core only when browser capabilities and benchmarks justify it.
- Add a separate Canvas rendering worker only if profiling shows main-thread rendering is a bottleneck and the target browser supports the chosen worker rendering API.
- Prefer one continuous encoding pass when FFmpeg filters can render the selected composition.
- Use sequential video chunks when a custom Canvas composition requires bounded batches. Chunking is conditional, not mandatory for every export.
- Keep parallel chunk encoding outside the v0 baseline. Reconsider it only after measuring end-to-end speed, memory, and output correctness.

## Worker responsibilities

| Component                        | Responsibility                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Main thread                      | Editor, preview controls, export orchestration, progress, cancellation, and download            |
| FFmpeg worker                    | Media processing, video encoding, audio encoding where required, and container assembly         |
| Optional Canvas worker           | Custom frame rendering when profiling and browser support justify moving it off the main thread |
| Optional FFmpeg internal workers | Parallel work within the multi-threaded core                                                    |

Moving work into a worker keeps it off the UI thread; it does not inherently reduce encoding time. Multiple independent FFmpeg instances add separate runtime and working-data allocations, so their memory cost must be included in any parallelism benchmark.

Keep frame and audio-sample updates outside React state. Transfer or release buffers promptly and prevent producers from generating more frames than the encoder can consume.

## Export paths

Both paths begin with input validation and a composition timeline, then end with finalisation, local download, and temporary resource cleanup.

### FFmpeg composition

For compositions expressible through the shipped FFmpeg filters, provide the artwork, audio, text, and timing inputs to a filter graph and encode continuously in one engine.

This path avoids storing a complete Canvas frame sequence. Confirm that the shipped build supports the required filters, fonts, and output codecs; native FFmpeg documentation alone does not prove WASM build support.

### Custom Canvas composition

For effects requiring Canvas-rendered frames, implement an explicit bounded input strategy. FFmpeg.wasm's public filesystem workflow does not automatically provide streaming Canvas-to-encoder input.

The implemented bridge renders at most 30 RGBA frames at 320p (one second, 20.80 MiB), or five frames at 720p (17.58 MiB). It awaits the worker filesystem transfer, releases the JavaScript batch, encodes a video-only part, and deletes the raw worker file before producing another batch. The shared painter scales its 568 × 320 logical layout to the chosen Canvas dimensions before drawing. The final partial batch uses the remaining integer frame count. Sequential parts use identical settings and keyframes at the start, then concatenate with video stream copy and one final stereo soundtrack.

Canvas is selected for all Classic modes and Full cover because the shared painter owns fonts, wrapping, clipped artwork, semantic CSS colours, gradients, and cue layout. Recreating that composition in FFmpeg filters would introduce a second renderer. Continuous graphs remain a future optimisation requiring demonstrated visual equivalence. The installed core supports H.264/AAC and VP8; native Opus with `-strict experimental` and explicit 48 kHz stereo avoids the installed `libopus` stack trap described in [upstream issue 591](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/591). Short stereo WebM exports have real codec/playback evidence; music-quality evaluation remains open.

Sequential commands also require restoring the entry WASM stack after core execution. The [asset-generation compatibility patch](../scripts/patch-ffmpeg-core.mjs) adds this restoration to the `exec` and `ffprobe` bindings of core 0.12.10, preventing cumulative stack exhaustion across batches. It checks the upstream binding shape and fails asset generation when compatibility needs review. This is distinct from the native-Opus codec workaround; see [core compatibility](FFMPEG.md#core-compatibility) for upgrade and regression details.

## Sequential chunk assembly contract

1. Render video-only chunks with the same codec configuration, dimensions, pixel format, frame rate, and time base. Make each chunk independently decodable at its start.
2. Derive boundaries from integer frame indices. Use the absolute song timeline for visuals and lyrics rather than restarting their time at zero for each chunk. Supply concat durations from differences between absolute frame boundaries rounded to microseconds, so short-chunk container rounding cannot accumulate timing drift.
3. Preserve visual smoothing and other state across boundaries, or use a verified warm-up strategy. Avoid visible resets, missing frames, and duplicate frames.
4. Concatenate compatible chunks using video stream copy where supported, avoiding a second video encoding pass.
5. Encode the audio once for the final soundtrack, or copy it when already compatible, and mux it with the assembled video. Do not independently encode the soundtrack for every chunk.
6. Verify the complete output duration and audio/video alignment, including the final partial chunk.

Incorrect chunk durations can cause timestamp artifacts. Compatible settings are necessary but do not replace playback and boundary verification.

Chunking does not automatically bound total memory. Keeping every encoded chunk alongside the final output in the in-memory filesystem can create a large assembly peak. The implementation must account for input media, frame batches, encoded parts, final output, and copies held in JavaScript. Encoded parts are capped at 64 MiB and output at 80 MiB using file-size guards plus post-read checks. Assembly can therefore hold up to 144 MiB of encoded files, alongside the input audio (up to 64 MiB), WASM/codec allocations, and output read/Blob copies (up to another 160 MiB). Offline PCM is capped at 35.41 MiB and its analysis reference is released before finalisation; actual reclamation remains subject to garbage collection. These bounds limit application allocations, not total browser RSS.

## Memory budget

At 568 × 320 and 30 fps, a seven-minute export contains 12,600 frames. A complete uncompressed RGBA frame sequence would occupy approximately 9.16 GB. Ten seconds of uncompressed RGBA frames occupies approximately 218 MB.

These calculations assume four bytes per pixel and exclude encoder buffers, decoded audio, runtime memory, compressed output, and extra copies. The default 320p one-second batch uses 20.80 MiB per raw copy: main-thread batch, transfer copy, and virtual filesystem data can briefly coexist (approximately 62.4 MiB plus one Canvas/ImageData frame). At 720p, five-frame batches stay below this raw-copy budget; encoder and Canvas allocations still grow with resolution, and more batches take longer. It never holds the complete raw timeline.

A desktop Apple M1/16 GiB, Chrome 154 acceptance run measured about 121 MiB peak JavaScript heap and 1.36 GiB aggregate browser-process RSS versus a 0.85 GiB baseline for six short sequential exports. The heap omits some native/WASM allocations; sampled RSS includes browser/GPU processes and shared pages. Read [latest observations](../output/encoding/verification.json) for exact values. These measurements validate the short desktop bridge, not seven-minute or mobile memory safety. Mobile capacity limits and total memory remain release gates.

## Multi-thread capability selection

The multi-threaded core requires SharedArrayBuffer. Verify cross-origin isolation and the corresponding COOP/COEP configuration, including asset-loading compatibility, before selecting it.

Capability support does not prove that multi-threading is faster or safe on a device. Choose conservative thread settings through benchmarks and retain the single-threaded fallback. If retrying with a different core, dispose of the previous engine and its working data before loading the replacement.

Users must keep the app open and in the foreground during export. Neither workers nor chunking guarantee background execution on mobile.

## Progress and lifecycle

Report validation/preparation, rendering/encoding, and finalisation separately. Base progress on completed timeline work where measurable, include assembly in the overall estimate, and label ETA as approximate.

On cancellation or failure, stop active work and release the engine, frame buffers, temporary filesystem entries, listeners, timers, and other processing resources. Preserve only the output needed for repeat downloads under the v0 retention policy.

## Benchmark and release gates

Compare single-threaded and multi-threaded continuous exports first. Compare sequential chunks only when required by the Canvas path. Test parallel chunks only if the simpler paths leave a demonstrated performance problem.

Use seven-minute exports in both MP4 and WebM on representative desktop, Android, and iPhone browsers. Record:

- Device, browser, core/build version, thread settings, composition, and output codec settings.
- End-to-end duration, with preparation, encoding, and assembly measured separately.
- Memory observations where available, failures, and UI responsiveness. Identify unavailable memory measurements rather than substituting desktop-only figures.
- Audio synchronisation, expected frame count, lyric timing, chunk boundary continuity, and output playback.
- Cancellation, failed-job cleanup, and repeated-export behaviour.

The bounded Canvas bridge and short desktop assembly have implementation and runtime evidence: 320p uses up to one second per batch, while 720p uses up to five frames. The seven-minute 320p matrix sampled assembly-inclusive session peaks of 193.1 MiB JavaScript heap and 1.48 GiB aggregate browser RSS (0.82 GiB baseline); the primary 50 ms heartbeat had p95 intervals of 51.9–59 ms and a 65.6 ms maximum. These observations do not justify another main-thread rendering worker. The seven-minute Classic 720p matrix also passed; Full cover full-length validation, physical-mobile performance, safe device limits and alternative thread settings remain unverified. Documentation benchmarks from other workloads do not establish expected performance for Audioframe.

## Sources

- [FFmpeg.wasm architecture](https://ffmpegwasm.netlify.app/docs/overview/): built-in worker, filesystem workflow, and core choices.
- [FFmpeg.wasm usage](https://ffmpegwasm.netlify.app/docs/getting-started/usage/): loading the multi-threaded core and its SharedArrayBuffer requirement.
- [FFmpeg.wasm performance](https://ffmpegwasm.netlify.app/docs/performance/): an illustrative desktop comparison, not an Audioframe benchmark.
- [FFmpeg concatenation](https://ffmpeg.org/ffmpeg-formats.html#concat): compatible streams and duration/timestamp constraints.
- [Browser cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated): COOP/COEP and capability checks.
