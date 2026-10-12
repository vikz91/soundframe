# Release validation

Validation date: 12 October 2026. The acceptance tools encode synthetic local files in the browser's actual single-thread FFmpeg.wasm engine. Native FFmpeg only generates fixtures and inspects downloaded files. Desktop evidence and viewport emulation do not establish physical Android/iPhone support.

## Repeatable acceptance

Use externally installed Playwright and Chrome; browser tooling is deliberately outside application dependencies. Native `ffmpeg` and `ffprobe` must be on PATH. Build and start the app locally, or use an existing production URL. Set `PLAYWRIGHT_MODULE` to the absolute path of Playwright's `index.mjs` and optionally set `CHROME_PATH` to the Chrome executable.

| Script                                                    | Scope                                                                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [verify-encoding.mjs](../scripts/verify-encoding.mjs)     | All three modes and both formats; complete decoding, every video timestamp, audio markers, playback/seeking, lyric boundary pixels, cancellation, failure/retry, expiry, URL cleanup, no media uploads |
| [verify-release-ui.mjs](../scripts/verify-release-ui.mjs) | Actual invalid files, interrupted loading, settings downloads/imports, capability rejection, responsive themes/modes, reduced motion, keyboard controls, dialog focus                                  |
| [verify-hosting.mjs](../scripts/verify-hosting.mjs)       | Read-only production runtime asset status, MIME types, cache/security headers, SHA-256 comparison with generated local assets                                                                          |

```bash
# Short, non-integral duration verifies the final partial batch at either resolution.
ENCODING_BASE_URL=http://localhost:3010/create \
ENCODING_EVIDENCE_DIR=output/release/short \
node scripts/verify-encoding.mjs

# Seven minutes: 12,600 frames, all three modes, both formats.
ENCODING_DURATION=420 ENCODING_RESOLUTION=320p \
ENCODING_BASE_URL=http://localhost:3010/create \
ENCODING_EVIDENCE_DIR=output/release/320p \
node scripts/verify-encoding.mjs

# Repeat with ENCODING_RESOLUTION=720p and a separate evidence directory.
ENCODING_BASE_URL=http://localhost:3010/create \
node scripts/verify-release-ui.mjs

HOSTING_BASE_URL=https://audioframe.abhishekdeb.com \
node scripts/verify-hosting.mjs
```

The encoder script defaults to 2.35 seconds, 320p, and a one-hour timeout per export; `ENCODING_TIMEOUT_MS` changes the timeout. Seven-minute stereo WAV fixtures use 32 kHz PCM to stay within the 64 MiB input guard. They alternate initial silence and tones every 30 seconds. Short fixtures still exercise partial final chunks. JSON reports, reference/decoded PNGs, and layout screenshots survive the run; synthetic inputs and downloaded videos are temporary. `exports.json` is an incremental checkpoint, so a later failure cannot erase already verified exports. Only a final `verification.json` establishes completion of the lifecycle checks.

For long exports, FFprobe checks every video packet against the absolute 30 fps timeline, not just average frame rate or container duration. Audio silence/tone markers check alignment every 30 seconds. Cover lyric pixels are compared to preview frames immediately before/after cues at 1, 2, 60, 120, 210, 300, and 419 seconds, when present. Browser seeks include late-timeline positions. Reactive-mode checks compare silent and sounding frames; the extended tool samples these every 30 seconds. These checks cover synthetic signal alignment; they are not a subjective music-quality listening evaluation.

## Recorded desktop results

The complete seven-minute default 320p matrix passed on Apple M1, 16 GiB RAM, macOS, Chrome 154.0.8037.98, with core 0.12.10 and one thread. Every saved video had 12,600 frames at 30 fps, correct stereo audio codecs, matching duration within one frame, and passed complete decoding. All 12,600 video packet timestamps matched the absolute timeline, with maximum relative error about 0.000000334 seconds for MP4 and 0.000333334 seconds for WebM. Audio markers remained aligned every 30 seconds, browser seeking reached 419.1 seconds, and Cover lyric boundaries matched preview pixels through 419 seconds.

| Mode     | MP4 seconds | WebM seconds |
| -------- | ----------: | -----------: |
| Cover    |      52.025 |      106.312 |
| Spectrum |      50.762 |      119.698 |
| Lighting |      60.528 |      133.297 |

[Seven-minute evidence](../output/release/320p/verification.json) records 193.1 MiB peak JS heap and 1.48 GiB aggregate browser RSS against a 0.82 GiB baseline. The 50 ms heartbeat had p95 intervals of 51.9–59 ms and maximum 65.6 ms. Cancellation, forced WASM-load failure and retry retained the previous video; expiry and clear left zero tracked URLs. No page errors or media uploads were observed. Additional [short 720p evidence](../output/release/720p-short/verification.json) covers all modes, both formats and partial five-frame batches.

[Final production UI evidence](../output/release/ui-production/verification.json) covers real invalid/overlong files, interrupted loading, strict settings round trips, reduced motion, keyboard seek/volume/tabs/radios, light/dark themes and 320/390/844/1280 px viewports. Narrow-screen navigation spacing was fixed after reproducing overflow at 320 px. The clear dialog passed mobile bounds, focus containment, Escape restoration and confirmed reset. These checks passed against the final local production build; the local navigation fix has not been deployed.

## Compression and follow-up checks

The initial seven-minute 720p Cover MP4 [failed at the 64 MiB encoded-part guard](../output/release/720p-before-fix/failure.json). Five-frame batches create more independent keyframes than the default 30-frame path. The encoder now uses H.264 CRF 28 at 720p, retaining CRF 23 at 320p and all memory guards. This trades some optional high-resolution compression quality for lower encoded storage; it does not guarantee that arbitrary high-detail artwork/text will fit. All six [short 720p reruns](../output/release/720p-short-fixed/verification.json) passed decoded pixels, codecs, audio and lifecycle checks after the change. Full-length follow-up results are recorded separately.

The extended [reactive timeline evidence](../output/release/reactive-timeline/verification.json) checks seven-minute Spectrum and Lighting MP4 outputs with 14 aligned silence/tone visual markers each. The main desktop matrix checks both formats' audio/timestamp continuity, and the short 720p suite checks partial five-frame batches. The final production build and `bun run check` passed with 119 tests; [final UI evidence](../output/release/ui-final/verification.json) repeats the actual-file, settings, keyboard, theme, motion and mobile-layout checks against that build.

Optional `ENCODING_MODES` / `ENCODING_FORMATS` select explicit subsets. `ENCODING_RECOVERY=0` skips only the expensive cancel/failure/full retry sequence for follow-up output matrices; reports set `recoveryChecks: false`. It defaults to enabled. Full-timeline follow-ups reuse recovery proof from the complete short 720p suite and the full 320p lifecycle run; expiry, downloads and clear/URL cleanup still run in every matrix. Subset and recovery-skipped reports must be combined with that evidence, not represented as independent complete lifecycle proof.

## Measurements and interpretation

Reports include CPU, architecture, system RAM, browser, core version/hash, single-thread configuration, output size, timing, sampled preparation/render/finalisation stages, main-thread timer responsiveness, peak JavaScript heap, aggregate browser-process RSS, failures, and upload observations. The main-thread heartbeat requests a callback every 50 ms; p95 and maximum report observed intervals, including scheduling overhead. Stage boundaries are sampled rather than instrumented inside the encoder.

JavaScript heap excludes some WASM/native allocations. Browser RSS includes browser/GPU processes and shared pages; it is an aggregate observation, not exclusive app memory. Neither establishes a hard device memory guarantee. No minimum RAM or phone model can be inferred from the desktop run.

Keep the current single-threaded compatibility path. Adding SharedArrayBuffer, isolation headers, or another Canvas worker requires measured benefit and separate fallback/disposal verification. Capability probes establish available APIs, not safe memory or acceptable export speed.

## Production hosting

The [live site](https://audioframe.abhishekdeb.com/) serves the FFmpeg ESM worker/core assets from the same HTTPS origin. [Asset evidence](../output/release/hosting/verification.json) records response headers, hashes, and byte counts; [live browser evidence](../output/release/vercel/verification.json) records real all-mode exports, disposal, and absence of media uploads. Static responses alone would not prove successful WASM worker execution.

As checked on 12 October 2026, [Vercel limits](https://vercel.com/docs/limits) allow a 45-minute build and a 100 MB source upload for Hobby CLI deployments. Generated runtime assets are ignored in source control and produced during the build. The runtime is about 32.36 MB uncompressed, so cold client loads consume CDN transfer; browser encoding does not use a long-running server function or upload media. The [Hobby plan](https://vercel.com/docs/plans/hobby) includes 100 GB fast data transfer, 10 GB origin transfer and one million CDN requests, and limits Hobby use to personal, non-commercial projects. Actual account plan, current quota consumption, and eligibility were not inspected. Public policy review does not certify the account's remaining allowance.

No release or deployment is performed by these scripts. Changed local UI must be deployed through a separately authorized action before claiming that the live site contains it.

## Outstanding physical-device gates

No Android device was attached to ADB. iPhone device tooling was unavailable. Representative physical Android Chrome and iPhone Safari runs must record actual model, OS/browser, all-mode MP4/WebM seven-minute timing, foreground responsiveness, available memory observations, playback/download success, cancellation/retry, background interruption and repeated exports. Verify both resolution choices and practical artwork/audio limits, including retained output during another export.

The 64 MiB audio, 12 MiB/16-million-pixel/8192-side artwork, 20.80 MiB raw batch, 35.41 MiB offline PCM, 64 MiB encoded-part and 80 MiB output limits remain allocation guards. Retain them until physical-device measurements justify calibration. Phone support and a minimum supported hardware baseline remain release requirements, not completed claims.
