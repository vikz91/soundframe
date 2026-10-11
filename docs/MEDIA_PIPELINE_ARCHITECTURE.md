# Audioframe browser media pipeline architecture

Status: Locked architecture direction, agreed on 12 October 2026. Local media validation and Canvas preview are implemented; video encoding integration and device benchmarks remain pending.

The browser owns media validation, composition, encoding, and download. Use one shared, lazy FFmpeg.wasm engine and its built-in worker, reusing it across sequential exports while the editor is open. Remove each job's files after success; terminate the engine on cancellation, failure, or editor disposal. See the [wrapper API](FFMPEG.md). Introduce chunking only when the selected Canvas export path needs bounded frame batches; parallel chunk encoding requires evidence that it improves speed without unacceptable memory use.

Product limits and retention rules remain defined in [v0 decisions](V0_DECISIONS.md): seven-minute audio, 568 × 320 at 30 fps, MP4/WebM output, desktop and capable mobile support, local downloads, and no server media uploads.

## Implemented input and preview stage

The real editor is [MediaWorkspace](../components/editor/workspace.tsx) at `/create`. `/prototype` retains the sample-only workspace and simulated output lifecycle. Real video export is disabled; the preview does not load FFmpeg.

- [Local media validation](../lib/local-media.ts) checks byte limits, container signatures, audio-track presence, browser decode, and finite positive audio duration up to 420 seconds. MP4 duration comes from decoded audio rather than its video; preliminary audio media-header checks allow bounded AAC padding while the decoded-duration limit stays strict. Artwork headers are checked before image decoding, including JPEG orientation-compatible dimensions.
- [Capability checks](../lib/media-capabilities.ts) probe single-thread WASM, a blob worker, local files/blob URLs, Web Audio, Canvas drawing, font loading, and CSS colour support. Passing this gate does not establish encoding speed or mobile memory safety.
- Shared file/playback hooks handle cancellation, replacement, stale-result disposal, seek, volume, and rejected playback. The editor reuses [LocalAudioAnalyser](../app/demo/viz/audio-analysis.ts); frequency and waveform buffers are reused. Samples and frame painting stay outside React state.
- [Composition preparation](../lib/editor/composition.ts) loads selected fonts and freezes preferences, colours, metadata, and parsed cues into a snapshot holding the decoded artwork reference. The caller owns artwork lifetime. `renderComposition` paints 568 × 320 frames from an absolute integer `frameIndex`, with time equal to `frameIndex / 30`. Spectrum consumes frequency samples; Lighting consumes waveform RMS. Live preview analysis is not yet an offline export-analysis implementation.
- [LRC parsing](../lib/editor/lyrics.ts) provides deterministic lookup through forward/backward seeking. [Settings validation](../lib/editor/settings.ts) uses a strict version-1 schema with media-free preferences, confirmed replacement, and local JSON import/export.

Preview and future encoding share the painter contract. Mocked Canvas tests verify identical draw operations for identical snapshots, frame indices, and analysis inputs; they do not prove encoded-pixel or audio/video equivalence. The offline analysis source, bounded frame-to-encoder bridge, and actual export validation remain implementation work.

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

Batch size and the transfer mechanism require a prototype. Do not generate all frames before encoding. If separate encoded chunks are needed, follow the assembly contract below.

## Sequential chunk assembly contract

1. Render video-only chunks with the same codec configuration, dimensions, pixel format, frame rate, and time base. Make each chunk independently decodable at its start.
2. Derive boundaries from integer frame indices. Use the absolute song timeline for visuals and lyrics rather than restarting their time at zero for each chunk.
3. Preserve visual smoothing and other state across boundaries, or use a verified warm-up strategy. Avoid visible resets, missing frames, and duplicate frames.
4. Concatenate compatible chunks using video stream copy where supported, avoiding a second video encoding pass.
5. Encode the audio once for the final soundtrack, or copy it when already compatible, and mux it with the assembled video. Do not independently encode the soundtrack for every chunk.
6. Verify the complete output duration and audio/video alignment, including the final partial chunk.

Incorrect chunk durations can cause timestamp artifacts. Compatible settings are necessary but do not replace playback and boundary verification.

Chunking does not automatically bound total memory. Keeping every encoded chunk alongside the final output in the in-memory filesystem can create a large assembly peak. The implementation must account for input media, frame batches, encoded parts, final output, and copies held in JavaScript. The encoded-chunk storage and assembly strategy remains a benchmark decision and must honour the v0 cleanup rules.

## Memory budget

At 568 × 320 and 30 fps, a seven-minute export contains 12,600 frames. A complete uncompressed RGBA frame sequence would occupy approximately 9.16 GB. Ten seconds of uncompressed RGBA frames occupies approximately 218 MB.

These calculations assume four bytes per pixel and exclude encoder buffers, decoded audio, runtime memory, compressed output, and extra copies. They are sizing examples, not measured browser peaks or recommended batch sizes.

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

Mobile performance, batch sizes, the exact Canvas bridge, thread settings, and assembly memory safety remain unverified until these checks pass. Documentation benchmarks from other workloads do not establish expected performance for Audioframe.

## Sources

- [FFmpeg.wasm architecture](https://ffmpegwasm.netlify.app/docs/overview/): built-in worker, filesystem workflow, and core choices.
- [FFmpeg.wasm usage](https://ffmpegwasm.netlify.app/docs/getting-started/usage/): loading the multi-threaded core and its SharedArrayBuffer requirement.
- [FFmpeg.wasm performance](https://ffmpegwasm.netlify.app/docs/performance/): an illustrative desktop comparison, not an Audioframe benchmark.
- [FFmpeg concatenation](https://ffmpeg.org/ffmpeg-formats.html#concat): compatible streams and duration/timestamp constraints.
- [Browser cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated): COOP/COEP and capability checks.
