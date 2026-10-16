# Release validation

Validation dates: 12 and 16 October 2026. The acceptance tools encode synthetic local files in the browser's actual single-thread FFmpeg.wasm engine. Native FFmpeg only generates fixtures and inspects downloaded files. Desktop evidence and viewport emulation do not establish physical Android/iPhone support.

## Repeatable acceptance

Use externally installed Playwright and Chrome; browser tooling is deliberately outside application dependencies. Native `ffmpeg` and `ffprobe` must be on PATH. Build and start the app locally, or use an existing production URL. Set `PLAYWRIGHT_MODULE` to the absolute path of Playwright's `index.mjs` and optionally set `CHROME_PATH` to the Chrome executable.

| Script                                                    | Scope                                                                                                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [verify-encoding.mjs](../scripts/verify-encoding.mjs)     | All three Classic modes and both formats; complete decoding, every video timestamp, audio markers, playback/seeking, lyric boundary pixels, cancellation, failure/retry, expiry, URL cleanup, no media uploads |
| [verify-full-cover.mjs](../scripts/verify-full-cover.mjs) | Fixed 2.35-second Full cover MP4/WebM, layout/framing/details/LRC controls, settings compatibility, preview density, viewport layout, decoded output and reactive bars                                         |
| [verify-release-ui.mjs](../scripts/verify-release-ui.mjs) | Actual invalid files, interrupted loading, settings downloads/imports, capability rejection, responsive themes/modes, reduced motion, keyboard controls, dialog focus                                          |
| [verify-hosting.mjs](../scripts/verify-hosting.mjs)       | Read-only production runtime asset status, MIME types, cache/security headers, SHA-256 comparison with generated local assets                                                                                  |

```bash
# Short, non-integral duration verifies the final partial batch at either resolution.
ENCODING_BASE_URL=http://localhost:3010/create \
ENCODING_EVIDENCE_DIR=output/release/short \
node scripts/verify-encoding.mjs

# Fifteen minutes: 27,000 frames, all three modes, both formats.
ENCODING_DURATION=900 ENCODING_RESOLUTION=320p \
ENCODING_BASE_URL=http://localhost:3010/create \
ENCODING_EVIDENCE_DIR=output/release/15min-320p \
node scripts/verify-encoding.mjs

# Repeat with ENCODING_RESOLUTION=720p and a separate evidence directory.
ENCODING_BASE_URL=http://localhost:3010/create \
node scripts/verify-release-ui.mjs

HOSTING_BASE_URL=https://audioframe.abhishekdeb.com \
node scripts/verify-hosting.mjs
```

The encoder script defaults to 2.35 seconds, 320p, and a one-hour timeout per export; `ENCODING_TIMEOUT_MS` changes the timeout. Seven-minute stereo WAV fixtures retain 32 kHz PCM; longer fixtures use 16 kHz PCM to stay below the current input byte/memory guards. The tool accepts up to 900 seconds. They alternate initial silence and tones every 30 seconds. Short fixtures still exercise partial final chunks. JSON reports, reference/decoded PNGs, and layout screenshots survive the run; synthetic inputs and downloaded videos are temporary. `exports.json` is an incremental checkpoint, so a later failure cannot erase already verified exports. Only a final `verification.json` establishes completion of the lifecycle checks.

For long exports, FFprobe checks every video packet against the absolute 30 fps timeline, not just average frame rate or container duration. Audio silence/tone markers check alignment every 30 seconds. Cover lyric pixels are compared to preview frames immediately before/after cues at 1, 2, 60, 120, 210, 300, 419, 600, 720, and 899 seconds, when present. Browser seeks include late-timeline positions. Reactive-mode checks compare silent and sounding frames; the extended tool samples these every 30 seconds. These checks cover synthetic signal alignment; they are not a subjective music-quality listening evaluation.

## Recorded desktop results

The complete seven-minute Classic default 320p matrix passed on Apple M1, 16 GiB RAM, macOS, Chrome 154.0.8037.98, with core 0.12.10 and one thread. Every saved video had 12,600 frames at 30 fps, correct stereo audio codecs, matching duration within one frame, and passed complete decoding. All 12,600 video packet timestamps matched the absolute timeline, with maximum relative error about 0.000000334 seconds for MP4 and 0.000333334 seconds for WebM. Audio markers remained aligned every 30 seconds, browser seeking reached 419.1 seconds, and Cover lyric boundaries matched preview pixels through 419 seconds.

| Mode     | MP4 seconds | WebM seconds |
| -------- | ----------: | -----------: |
| Cover    |      52.025 |      106.312 |
| Spectrum |      50.762 |      119.698 |
| Lighting |      60.528 |      133.297 |

[Seven-minute evidence](../output/release/320p/verification.json) records 193.1 MiB peak JS heap and 1.48 GiB aggregate browser RSS against a 0.82 GiB baseline. The 50 ms heartbeat had p95 intervals of 51.9–59 ms and maximum 65.6 ms. Cancellation, forced WASM-load failure and retry retained the previous video; expiry and clear left zero tracked URLs. No page errors or media uploads were observed. Additional [short 720p evidence](../output/release/720p-short/verification.json) covers all modes, both formats and partial five-frame batches.

[Final production UI evidence](../output/release/ui-production/verification.json) covers real invalid/overlong files, interrupted loading, strict settings round trips, reduced motion, keyboard seek/volume/tabs/radios, light/dark themes and 320/390/844/1280 px viewports. Narrow-screen navigation spacing was fixed after reproducing overflow at 320 px. The clear dialog passed mobile bounds, focus containment, Escape restoration and confirmed reset. These checks passed against the final local production build; the local navigation fix has not been deployed.

## Compression and follow-up checks

The initial seven-minute 720p Cover MP4 [failed at the 64 MiB encoded-part guard](../output/release/720p-before-fix/failure.json). Five-frame batches create more independent keyframes than the default 30-frame path. The encoder now uses H.264 CRF 30 at 720p, retaining CRF 23 at 320p and all then-current memory guards. CRF 28 was an intermediate adjustment before the final full-length matrices. This trades some optional high-resolution compression quality for lower encoded storage; it does not guarantee that arbitrary high-detail artwork/text will fit. All six [short 720p reruns](../output/release/720p-short-fixed/verification.json) passed decoded pixels, codecs, audio and lifecycle checks after the change. Full-length follow-up results are recorded separately.

The extended [reactive timeline evidence](../output/release/reactive-timeline/verification.json) checks seven-minute Spectrum and Lighting MP4 outputs with 14 aligned silence/tone visual markers each. The main desktop matrix checks both formats' audio/timestamp continuity, and the short 720p suite checks partial five-frame batches. The final production build and `bun run check` passed with 119 tests; [final UI evidence](../output/release/ui-final/verification.json) repeats the actual-file, settings, keyboard, theme, motion and mobile-layout checks against that build.

Optional `ENCODING_MODES` / `ENCODING_FORMATS` select explicit subsets. `ENCODING_RECOVERY=0` skips only the expensive cancel/failure/full retry sequence for follow-up output matrices; reports set `recoveryChecks: false`. It defaults to enabled. Full-timeline follow-ups reuse recovery proof from the complete short 720p suite and the full 320p lifecycle run; expiry, downloads and clear/URL cleanup still run in every matrix. Subset and recovery-skipped reports must be combined with that evidence, not represented as independent complete lifecycle proof.

The subsequent complete seven-minute Classic 720p matrices passed for [MP4](../output/release/720p-mp4/verification.json) and [WebM](../output/release/720p-webm/verification.json), covering Cover, Spectrum, and Lighting with 12,600 frames each. MP4 duration was 420 seconds and WebM 420.004 seconds; maximum video timestamp error remained below 0.001 seconds. All saved outputs passed full decoding, stereo audio markers, playback/seeking, expiry and clear/URL cleanup, with no page errors or media uploads. Spectrum/Lighting included 14 recurring visual/audio markers per output. Recovery scenarios were skipped in these matrices and remain supported by the separate short-run evidence above.

720p MP4 took 287.833–361.935 seconds and WebM 531.862–586.311 seconds. The two matrices overlapped, so these are functional-validation timings, not isolated benchmarks. They sampled up to 179.5 MiB JavaScript heap, 1.40 GiB aggregate browser RSS, and a maximum heartbeat interval of 120.6 ms. These results establish the twelve-output Classic desktop matrix across both resolutions; they do not establish Full cover or physical-device full-length readiness.

## Full cover and preview-density validation

Full cover uses artwork as the background, optional bottom bars, nonempty title/artist/album/website without a visibility toggle, and the shared plain/timed lyric painter. Classic and Full cover retain independent appearance preferences. Preview now follows display width × pixel density (568-pixel minimum, 1920-pixel maximum width), while exports remain 568 × 320 or 1280 × 720. Full cover loads stronger metadata font weights and uses a sharp shadow. Export text is still rasterised at the selected video resolution.

The [Full cover script](../scripts/verify-full-cover.mjs) uses a fixed 2.35-second local soundtrack with initial silence followed by a tone. It runs both MP4 and WebM; `ENCODING_RESOLUTION` chooses 320p/720p, `ARTWORK_PATH` optionally supplies local artwork, and `ENCODING_BASE_URL`/`ENCODING_EVIDENCE_DIR` select the editor and report destination. Use the external tooling described above and [Full cover command/options](FFMPEG.md#full-cover-acceptance). Reports and screenshots remain local under ignored `output/`.

- [Initial 320p evidence](../output/full-cover/observations.json) and [initial 720p evidence](../output/full-cover-720p/observations.json) passed actual browser WASM export, local download, native decoding, browser playback, correct dimensions/30 fps, and bar growth after silence. MP4 duration was 2.366667 seconds and WebM 2.369 seconds. Controls/settings checks covered layout restoration, Fit/Fill/crop, Bars/None, details/LRC, legacy Classic defaults, preset import/export with media preservation, and a 390 px viewport without overflow. These runs predate the final typography/toggle changes.
- [Latest 320p evidence](../output/full-cover-crisp/observations.json) repeated both formats after removing the details toggle and improving text/preview rendering. It also verified a 2× preview backing raster capped at 1920 pixels wide, populated Bengali/Latin song details, and import/discard of an old `showDetails: false` setting. No page errors or media POST/PUT/PATCH requests were observed. `bun run check` and `bun run build` passed for the integrated code; they were not rerun for this documentation update.
- [Classic Cover MP4 regression](../output/crisp-classic-encoding/verification.json) passed a 71-frame short 320p export, decoded audio/playback, and lyric boundaries at frames 30 and 60 after normalising display-density preview references to export dimensions. This targeted run skipped recovery checks; it does not replace the earlier full lifecycle suites.

LRC controls/preview were exercised, and shared renderer regressions cover lyric placement. The saved Full cover fixtures do not establish decoded lyric-cue pixel coverage. Full cover fifteen-minute exports at both resolutions, the complete pattern/framing/Bars/None matrix, latest typography checks at 720p, and physical Android/iPhone readability/memory/performance remain open in the [Full cover tracker](../TODO.md#completed-full-cover-layout-and-sharper-preview). Desktop density and viewport emulation are not physical-device evidence.

## Measurements and interpretation

Reports include CPU, architecture, system RAM, browser, core version/hash, single-thread configuration, output size, timing, sampled preparation/render/finalisation stages, main-thread timer responsiveness, peak JavaScript heap, aggregate browser-process RSS, failures, and upload observations. The main-thread heartbeat requests a callback every 50 ms; p95 and maximum report observed intervals, including scheduling overhead. Stage boundaries are sampled rather than instrumented inside the encoder.

JavaScript heap excludes some WASM/native allocations. Browser RSS includes browser/GPU processes and shared pages; it is an aggregate observation, not exclusive app memory. Neither establishes a hard device memory guarantee. No minimum RAM or phone model can be inferred from the desktop run.

Keep the current single-threaded compatibility path. Adding SharedArrayBuffer, isolation headers, or another Canvas worker requires measured benefit and separate fallback/disposal verification. Capability probes establish available APIs, not safe memory or acceptable export speed.

## Production hosting

The [live site](https://audioframe.abhishekdeb.com/) serves the FFmpeg ESM worker/core assets from the same HTTPS origin. [Asset evidence](../output/release/hosting/verification.json) records response headers, hashes, and byte counts; [live browser evidence](../output/release/vercel/verification.json) records real all-mode exports, disposal, and absence of media uploads. Static responses alone would not prove successful WASM worker execution.

As checked on 12 October 2026, [Vercel limits](https://vercel.com/docs/limits) allow a 45-minute build and a 100 MB source upload for Hobby CLI deployments. Generated runtime assets are ignored in source control and produced during the build. The runtime is about 32.36 MB uncompressed, so cold client loads consume CDN transfer; browser encoding does not use a long-running server function or upload media. The [Hobby plan](https://vercel.com/docs/plans/hobby) includes 100 GB fast data transfer, 10 GB origin transfer and one million CDN requests, and limits Hobby use to personal, non-commercial projects. Actual account plan, current quota consumption, and eligibility were not inspected. Public policy review does not certify the account's remaining allowance.

No release or deployment is performed by these scripts. Changed local UI must be deployed through a separately authorized action before claiming that the live site contains it.

## Outstanding physical-device gates

No Android device was attached to ADB. iPhone device tooling was unavailable. Representative physical Android Chrome and iPhone Safari runs must record actual model, OS/browser, all-mode MP4/WebM fifteen-minute timing, foreground responsiveness, available memory observations, playback/download success, cancellation/retry, background interruption and repeated exports. Verify both resolution choices and practical artwork/audio limits, including retained output during another export.

The 12 October runs used 64 MiB audio, 12 MiB artwork, 64 MiB encoded-part, and 80 MiB output guards. On 16 October 2026 these byte guards were doubled to 128/24/128/160 MiB respectively; LRC/JSON imports now allow 512/256 KiB. At that stage, duration, image dimensions, 20.80 MiB raw batches, and 35.41 MiB offline PCM were unchanged; the later fifteen-minute extension raises only the duration-dependent PCM bound to 75.79 MiB. Provisional [buffer/heap admission checks](MEDIA_PIPELINE_ARCHITECTURE.md#memory-admission-checks) can reject files below these maxima. Earlier runs do not establish larger-file or memory-policy safety. Phone support and a minimum supported hardware baseline remain release requirements, not completed claims.

## Memory guard verification: 16 October 2026

The integrated buffer/heap policy and doubled byte guards passed `bun run check` (142 tests) and `bun run build`. Regression coverage includes concurrent reservations, retained media/results, idle FFmpeg engine ownership, pressure rejection before allocation, cancellation/failure cleanup, and retry. These tests include mocks and do not measure actual native/worker memory.

Final production-browser checks used Apple M1/16 GiB and Chrome 155.0.8059.80 with the single-threaded core 0.12.10:

- All six short Classic mode/format combinations passed at [320p](../output/memory-limits/production-short/verification.json) and [720p](../output/memory-limits/720p/verification.json), including decoding, audio/lyric/visual timing, saved playback, cancellation, forced failure/retry, retained results, expiry, and cleanup. Neither matrix reported page errors or media uploads; clear left zero tracked object URLs.
- Both short [Full cover outputs](../output/memory-limits/full-cover/observations.json) passed real WASM export, native decoding, browser playback, reactive bars, layout/settings checks, and narrow-viewport checks, with no page errors or uploads. Viewport emulation is not physical-device proof.
- One [seven-minute Spectrum MP4 at 320p](../output/memory-limits/production-7min/verification.json) completed in 48.342 seconds with 12,600 frames, full decoding, audio/visual markers, playback/seeking, expiry, and cleanup. Recovery scenarios were skipped in this long run and covered by the short suites. It sampled 171.8 MiB peak JS heap and 1.59 GiB aggregate browser RSS against a 0.85 GiB baseline. RSS includes browser/GPU processes; these are observations rather than a memory cap or portable performance guarantee.
- Native browser [input-loader boundary checks](../output/memory-limits/native-boundaries.json) accepted exact 128 MiB WAV and 24 MiB PNG files and rejected files one byte over. These fixtures used a two-second WAV padded with a JUNK chunk and a tiny PNG with trailing padding; they establish byte-boundary behavior, not maximum decoded-media workload safety. Simulated heap/device pressure rejected safely; retry and missing-memory-API fallback passed.

Evidence remains local under ignored `output/memory-limits/`. The larger byte guards and admission policy have not been deployed. Maximum-size encoded outputs, large real music/artwork combinations, the complete full-length layout/mode/format matrix under this policy, repeated-export memory growth, and physical Android/iPhone calibration remain open under [TODO item 95](../TODO.md#follow-up-larger-files-and-memory-admission).

## Fifteen-minute duration verification: 16 October 2026

The duration limit is now 900 seconds, shared by input validation, export batching, UI hints, and ±900000 ms LRC offsets through [media limits](../lib/media-limits.ts). Offline export PCM is bounded to 901 seconds of mono 22050 Hz float samples (75.79 MiB), including one second of allocation headroom. Input byte limits, raw frame batches, encoded-part/output guards, and buffer/heap admission thresholds remain in effect; individually valid long files can still exceed the memory policy.

Validation requests a 22050 Hz AudioContext to bound duration-check PCM independently of the output device, with a native-rate fallback for NotSupportedError. The decoded data is used only to validate the file; native preview and FFmpeg receive the original source audio. [AudioContext options](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext) describe the requested rate and unsupported-rate error. Fallback behavior has a mocked regression; the browser runs below used the requested 22050 Hz rate.

On Apple M1/16 GiB with Chrome 155.0.8059.80 and single-thread core 0.12.10, the production app passed:

- [Exact-duration UI input checks](../output/duration-15min/input-boundaries.json): a real 900-second AAC/M4A was accepted, a 900.01-second file was rejected, and selecting the valid file again succeeded. Both normal and unavailable device-memory/heap APIs were exercised, with no page errors. The existing loader clears the prior input at replacement start; this check does not claim input preservation after rejection.
- [Fifteen-minute Spectrum MP4 at 320p](../output/duration-15min/spectrum-mp4/verification.json): 27,000 frames, 900 seconds, full decoding, all packet timestamps, 30 recurring audio/visual markers, late playback/seeking, expiry, and clear/URL cleanup. Export took 112.228 seconds and produced 29,559,504 bytes. It sampled 212.6 MiB peak JS heap and 1.87 GiB aggregate browser RSS against a 0.83 GiB baseline.
- [Fifteen-minute Cover WebM at 320p](../output/duration-15min/cover-webm/verification.json): 27,000 frames, 900.004 seconds, full decoding, all packet timestamps, 30 audio markers, lyric-boundary pixels through 899 seconds, playback/seeking, expiry, and clear/URL cleanup. Export took 219.164 seconds and produced 30,798,070 bytes. Neither full-length run reported page errors or media uploads; clear left zero tracked URLs. Recovery scenarios were skipped in these long runs and are checked separately with short fixtures.

These are functional desktop observations, not portable speed/memory guarantees. The browser RSS figures include browser/GPU processes and are not constrained by the application's estimated-buffer admission threshold. Real device memory/heap APIs remain incomplete hints. The complete fifteen-minute all-layout/mode/format matrix at 720p/320p, large-media combinations, and physical Android/iPhone calibration remain open under [TODO item 96](../TODO.md#follow-up-fifteen-minute-duration). Earlier seven-minute evidence does not close these gates.

The browser acceptance tool now supports ENCODING_DURATION=900, includes late cues at 600/720/899 seconds, uses 16 kHz stereo WAV fixtures for longer runs, and derives its native decoded-PCM capture allowance from the requested duration. It still verifies the complete audio/video timeline. Final integrated checks passed 144 tests and the production build passed. The [final short production recovery suite](../output/duration-15min/recovery-short/verification.json) passed all six Classic mode/format exports, cancellation, forced load failure/retry, previous-result retention, expiry, and clear/URL cleanup, with no page errors or media uploads. No deployment was performed.
