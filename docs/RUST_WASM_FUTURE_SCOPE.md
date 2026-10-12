# Future scope: Rust/WASM and browser media efficiency

Date: 12 October 2026.

Status: Analysis backlog. No Rust module, WebCodecs path, or performance improvement is implemented or verified by this document. This evaluation does not replace the [locked media architecture](MEDIA_PIPELINE_ARCHITECTURE.md) or the [v0 product decisions](V0_DECISIONS.md).

## Objective

Identify measured opportunities to reduce export duration, CPU work, and peak memory while retaining local browser processing, seven-minute audio, 320p/720p at 30 fps, MP4/WebM output, deterministic composition timing, and cancellation/cleanup behavior. Evaluate small Rust modules compiled to WASM against simpler TypeScript optimisations and browser-native media APIs before selecting an implementation.

## Current implementation and evidence

- [FFmpeg](../lib/ffmpeg.ts) already runs a lazy, single-threaded WASM core in its built-in worker. Rust orchestration alone would not replace its codec work or establish faster encoding.
- [Offline analysis](../lib/editor/offline-analysis.ts) uses bounded mono 22050 Hz PCM, reusable buffers, a 1024-sample Blackman window, and an absolute-time JavaScript FFT. Analysed seven-minute exports evaluate 12,600 frames. Sine/cosine coefficients are recalculated inside the FFT loops for every frame.
- [Analysis selection](../lib/editor/types.ts) skips analysis for Classic Cover and Full cover None. Classic Lighting requests the same FFT source even though the [painter](../lib/editor/composition.ts) only consumes waveform RMS for that effect. Native preview uses the browser's [Web Audio analyser](../lib/editor/audio-analysis.ts), with reusable sample buffers.
- [Canvas export](../lib/editor/encode.ts) reads each frame with `getImageData`, copies pixels into a batch, transfers through the FFmpeg wrapper, and encodes a separate video part. Seven minutes requires 420 video batches at 320p or 2,520 at 720p; the smaller 720p batches retain the existing raw-byte guard. The wrapper copies caller-owned bytes before worker transfer and the encoder reads each encoded part to account for its size.
- The [release validation report](RELEASE_VALIDATION.md) records seven-minute Classic desktop exports at 50.762–60.528 seconds for 320p MP4 and 106.312–133.297 seconds for 320p WebM. The 720p format matrices overlapped, so their recorded durations are functional-validation observations rather than isolated performance benchmarks. These results do not isolate FFT, Canvas, transfer, or codec cost and do not prove physical-mobile capacity or a Rust speedup.

## Candidate assessment

| Area                                      | Evaluation priority        | Proposed investigation                                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline FFT                               | First Rust candidate       | Compare the existing implementation, optimised TypeScript with precomputed FFT coefficients, and a reusable Rust/WASM FFT plan. Include module load and data-transfer costs.                                                          |
| RMS and spectrum aggregation              | Alongside FFT              | Evaluate calculating waveform energy and bar levels in the same Rust module. Avoid a separate WASM call for each tiny operation. Preserve current quantisation, clamping, sensitivity, and bar mapping.                               |
| Lighting analysis                         | First simpler optimisation | Compare a waveform-only path that avoids frequency computation. Preserve the current waveform-derived RMS behavior before considering a different energy calculation.                                                                 |
| Canvas artwork, text, and gradients       | First simpler optimisation | Profile repeated drawing and text measurement; compare cached static layers and prepared text layouts. Moving Canvas calls into Rust still depends on browser drawing APIs. Preserve Unicode wrapping and preview/export equivalence. |
| Frame transfer and encoding               | Export-pipeline comparison | Measure readbacks, copies, per-batch commands, encoded-part reads, and finalisation. Compare a capability-gated WebCodecs path or continuous FFmpeg filters where the selected composition can be reproduced faithfully.              |
| Live preview analysis                     | Low priority               | Retain native Web Audio unless a measured limitation requires custom DSP. Export and preview currently have different smoothing behavior; changing that is a separate correctness decision.                                           |
| UI, settings, lyrics, and file validation | Low priority               | Retain TypeScript and existing browser utilities. These bounded operations do not currently have evidence justifying Rust integration.                                                                                                |

Future CPU-heavy effects may justify Rust/WASM after profiling. GPU-heavy pixel effects should also be compared with browser GPU rendering rather than assuming a CPU WASM implementation will be faster.

## Possible Rust module boundary

If profiling justifies a prototype, keep it limited to offline numerical analysis:

1. Compile a small Rust library to browser WASM with `wasm-bindgen`; evaluate `wasm-pack` for build/package generation. Select an FFT implementation only after checking WASM target support, licensing, bundle size, and reusable-plan behavior.
2. Lazy-load the module only for exports needing analysis. Keep decoding, Canvas rendering, UI, file ownership, and export lifecycle in the existing TypeScript pipeline.
3. Supply PCM once, retain a reusable FFT plan/window and working buffers, and analyse absolute integer frame indices. Request frequency, waveform, or energy outputs according to the active effect.
4. Return compact typed-array results or carefully scoped views over WASM memory. Account for input copies, output copies, view invalidation after memory growth, and the lifetime of borrowed results. Never retain a view after its buffers are reused or its analysis instance is released.
5. Account for PCM held in both JavaScript and Rust memory; the existing PCM guard is not permission to duplicate that allocation without measuring total peak memory. Release analysis resources on completion, replacement, cancellation, failure, and disposal.
6. Preserve the TypeScript compatibility path while testing loading failures and unsupported capabilities. WASM does not inherently run off the UI thread; use a separate analysis/rendering worker only when profiling justifies it under the existing architecture.

SIMD or threading would be separate benchmark variants, with explicit capability checks and a compatible baseline. Do not assume native Rust library performance transfers unchanged to browser WASM.

## Encoding alternatives to compare

- **WebCodecs:** Evaluate feeding Canvas-derived `VideoFrame` objects to a persistent encoder, limiting the queued frames and closing resources promptly. Probe the exact codec/resolution configuration, measure hardware/software behavior, and design audio encoding and MP4/WebM container assembly. Keep FFmpeg.wasm as a tested fallback; unsupported codecs or device configurations must not break export. This is a separate architecture proposal, not a Rust requirement.
- **Continuous FFmpeg composition:** Evaluate only compositions supported by the shipped filters/codecs/fonts. Prove visual equivalence for artwork cropping, semantic colours, text wrapping, lyrics, gradients, and reactive effects before replacing the shared Canvas painter.
- **Multi-threaded FFmpeg:** Benchmark one engine with internal threads only where cross-origin isolation, SharedArrayBuffer, hosting headers, and asset loading are supported. Include memory cost and physical-device results; do not add parallel engines or raise allocation guards to obtain a faster result.
- **OffscreenCanvas:** Consider worker rendering only if main-thread profiling establishes a problem. Existing desktop responsiveness observations do not justify adding another rendering worker by themselves. Moving work off the main thread is not proof of lower end-to-end duration.

## Analysis and benchmark plan

1. **Attribute cost first.** Record preparation/module loading, audio decode, FFT/waveform/RMS, Canvas painting, pixel readback, batch copying/transfer, per-part encoding/size accounting, and final assembly separately. Use bounded aggregated measurements so instrumentation does not dominate the hot loop.
2. **Compare incremental variants.** Establish the unchanged baseline, then test simpler TypeScript improvements, Rust analysis, and encoding alternatives independently. Define the desired end-to-end improvement and acceptable memory/startup/bundle tradeoffs before interpreting results.
3. **Run isolated workloads.** Use identical settings and fixtures, cold and warm runs, repeated measurements, and no overlapping format matrices. Include short/final-partial exports and seven-minute Classic Cover/Spectrum/Lighting plus Full cover Bars/None, both resolutions and formats. Cover/None provides a control without FFT cost.
4. **Include real devices and music.** Record desktop, representative physical Android Chrome, and iPhone Safari results with device, OS/browser, core/module version, codec settings, thread configuration, and input sizes. Viewport emulation does not close physical-device gates.
5. **Measure total cost.** Report end-to-end duration, per-stage time, UI heartbeat, available heap/WASM/browser memory observations, repeated-export growth, and cold-load download/initialisation cost. Label unavailable measurements and distinguish allocation guards from actual peaks.
6. **Verify correctness and lifecycle.** Check numerical analysis against the current implementation using defined tolerances and silence/impulse/tone/real-music fixtures. Preserve the 22050 Hz source, 1024-sample window alignment, Blackman coefficients, FFT scaling, decibel mapping, waveform quantisation, silence padding, and frame-index clock. Verify decoded frame count/timestamps, audio synchronisation, lyrics, bar/lighting behavior, seek/chunk boundaries, saved playback, local-only processing, cancellation/retry, failed loads, retained previous results, expiry, and resource cleanup.

## Decision and deliverables

The analysis should produce a reproducible benchmark report, a comparison of speed/memory/startup/compatibility/maintenance cost, and a go/no-go recommendation for each candidate. Report kernel speed separately from complete export speed; a faster FFT alone does not establish a worthwhile product improvement.

Adopt a candidate only when its measured benefit meets the agreed target, output/lifecycle checks pass, supported devices retain a safe compatible path, and existing allocation guards remain satisfied. If the benefit is small or absent, retain the simpler implementation. Production integration is a separate scoped implementation task; this backlog item authorises analysis, not changes to product limits or deployment.

If implementation is later selected, run the applicable media regressions, `bun run check`, and `bun run build` for bundling/dependency changes, followed by real browser and physical-device acceptance. Existing release evidence does not validate a new encoder or analysis module.

## References

- [Media pipeline architecture](MEDIA_PIPELINE_ARCHITECTURE.md) and [release validation](RELEASE_VALIDATION.md).
- [FFmpeg.wasm performance](https://ffmpegwasm.netlify.app/docs/performance/): illustrative upstream workload, not an Audioframe speed prediction.
- [wasm-bindgen numeric slices](https://wasm-bindgen.github.io/wasm-bindgen/reference/types/number-slices.html): typed-array interoperability.
- [WebCodecs specification](https://www.w3.org/TR/webcodecs/#hardware-acceleration): codec configuration and device-dependent hardware acceleration.
- [VideoEncoder](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder) and [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas): browser APIs to evaluate against the supported-device baseline.
