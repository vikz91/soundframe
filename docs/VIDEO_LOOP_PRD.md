# Audioframe video background loops PRD

Status: Planned feature; not implemented or runtime-verified. Drafted on 12 October 2026 from the video-loop brainstorm. Defaults below are the proposed initial product contract.

Related: [v0 product decisions](V0_DECISIONS.md), [media pipeline architecture](MEDIA_PIPELINE_ARCHITECTURE.md), [implementation tracker](../TODO.md#planned-video-background-loops), and [lyrics plan](LYRICS_SYNC_PLAN.md).

## Problem and outcome

Creators need moving backgrounds without assembling a full-length music video manually. Keep cover art and song information as usual, but allow a short video to repeat behind them or an opening, repeating middle, and closing sequence to fill the song automatically.

Success means the user selects local clips, sees the complete song timeline in preview, and exports a video whose background timing, overlays, and opening/closing fades match that preview. The soundtrack remains the selected song.

## Scope and existing behavior

This extends the local converter; it does not change the seven-minute audio limit, default 320p or optional 720p resolution, 30 fps output, MP4/WebM downloads, or local-only processing. Existing artwork-based projects remain the default.

The current [composition painter](../lib/editor/composition.ts) draws artwork and overlays from an absolute frame index. The [encoder](../lib/editor/encode.ts) synchronously paints bounded frame batches before sequential encoding. Video backgrounds require a new prepared-frame source; existing MP4 audio input does not supply background video automatically.

Background choice is independent of layout and visualisation. Retain the existing Classic and Full-cover layout preferences. In video modes, replace the artwork-derived backdrop with video while retaining foreground artwork, song details, lyrics, and visualisations according to the selected layout and visibility controls. For Full-cover, retain the artwork placement and fit/fill treatment above the video; any background darkening treatment applies to the video. Layout changes must not change clip timing or silently switch background mode.

## Background modes

| Mode         | Required media                         | Playback                                                                                       |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Artwork      | Existing cover artwork                 | Existing static or reactive treatment.                                                         |
| Single video | One accepted local video segment       | Repeat from its selected in-point to out-point throughout the song; trim the final repetition. |
| Three clips  | Accepted Start, Loop, and End segments | Play Start once, repeat Loop for the remaining middle, then play End once.                     |

The existing audio and artwork requirements remain. A background video does not replace cover art or supply song metadata. A single file may be reused in multiple slots with independent trim ranges.

For Three clips, each selected segment must be **5–10 seconds inclusive**. A longer source file is allowed within validated input limits, with a trim selector choosing the segment. Sources shorter than five seconds cannot fill these slots. Default to the first five seconds, allowing adjustment up to ten seconds.

Single video may use a positive-duration segment within validated input limits; the Three clips 5–10-second constraint does not apply to it. If the segment exceeds the song duration, play only the portion needed. Input byte, duration, dimension, and frame-rate limits must be established during the feasibility phase before this mode ships.

## Timeline contract

Let `T` be song duration and `S`, `L`, and `E` be selected Start, Loop, and End durations:

```text
M = T - S - E
complete middle repetitions = floor(M / L)
partial middle duration = M - complete middle repetitions * L
output = Start + Loop repeated/trimmed to M + End
```

Three clips requires `T > S + E` and at least one output frame for the middle. If the song is too short, explain the issue, block export in that mode, and offer Single video or shorter valid Start/End trims. Do not automatically stretch, shorten below five seconds, or remove selected segments.

The End segment is anchored to the song's end. A partial final Loop repetition starts at the loop in-point and may be shorter than five seconds; segment selection limits do not impose a minimum on that remainder. An exact multiple has no extra repetition. A middle shorter than `L` plays only the necessary opening portion of Loop.

Example: a 222-second song with `S = 8`, `L = 6`, and `E = 8` gives `M = 206`:

| Song interval   | Background                                                |
| --------------- | --------------------------------------------------------- |
| 0–8 seconds     | Start once.                                               |
| 8–214 seconds   | 34 complete Loop repetitions, then its first two seconds. |
| 214–222 seconds | End once.                                                 |

Use the existing 30 fps absolute frame timeline for preview and export. Resolve trim boundaries onto that grid and display the effective durations. With `N = ceil(T * 30)`, and validated segment lengths `Ns`, `Nl`, and `Ne` in output frames:

```text
Single video: local frame = song frame % Nl
Three clips:
  song frame < Ns           -> Start local frame = song frame
  song frame < N - Ne       -> Loop local frame = (song frame - Ns) % Nl
  otherwise                -> End local frame = song frame - (N - Ne)
source time = selected in-point + local frame / 30
```

Clamp source sampling to the selected half-open interval; never sample the out-point or past decoded media. Support different source frame rates by sampling their timestamps at normal speed. Derive boundaries from the absolute clock rather than accumulated playback or rounded repeat durations. Non-integral song durations retain the existing maximum one-frame video timing tolerance; do not pad or retime the song to fit clips.

## Fades, cuts, and soundtrack

- Default to a one-second visual fade in from black at the song's beginning and one-second visual fade out to black at its end, in both video modes.
- Apply fades to the entire composition, including artwork, details, lyrics, and visualisations. Provide separate Fade in and Fade out controls from zero to two seconds; zero disables that fade.
- Fades occur inside the allocated timeline and add no duration. Limit each fade to half its opening/closing segment, or half the song duration for Single video. Show any effective duration adjustment for a short song.
- Use direct cuts at Start → Loop, loop repetitions, and Loop → End. Do not fade on every repetition. Source footage determines whether a direct loop looks seamless; provide a loop-boundary preview without promising automatic seam repair.
- Keep the selected song as the only soundtrack, aligned from time zero and encoded/muxed once through the existing pipeline. Ignore every clip's embedded audio; visual fades do not change song volume.
- Crossfades, speed changes, beat matching, reverse/ping-pong loops, and automatic seam repair are outside the initial feature.

## Editor workflow and controls

Keep the feature within `/create`; no separate route is required. In the Style inspector, add **Background: Artwork / Single video / Three clips** using the existing controls and design tokens.

1. Select the song and artwork as usual, then choose a video background mode.
2. Show one video slot or three labelled **Start**, **Loop**, and **End**. Each has file selection, thumbnail, source duration, in/out trimming, effective segment duration, replace/remove, and inline validation.
3. Provide video Fit/Fill and positioning controls independently from foreground artwork framing. Fit uses the existing background colour for uncovered regions. Add a background dimming control for text readability.
4. Show a compact song timeline with Start/middle/End durations, full repeat count, partial remainder, and the End start time. With no song loaded, allow clip selection but explain that timing needs a song.
5. Use the existing song playback and seek controls. Include actions to preview a loop seam and the opening/closing transitions; these must stop on pause, mode change, media replacement, clear, or disposal.
6. Gate export on accepted media, valid trims, valid timeline, and verified decode/export capabilities. Explicitly selected but incomplete video modes must show what is missing rather than silently exporting an artwork background.

Preserve accepted clips and trims while switching background modes in the same session. Revalidate them when audio changes. A rejected or cancelled file replacement preserves the previously accepted asset. Removing a required clip makes the active mode incomplete while preserving the other clips and previous generated output.

Controls must support keyboard trimming through labelled numeric inputs or equivalent accessible controls, 44 px primary touch targets, focus restoration, clear errors, and layouts without horizontal overflow at 320/390 px. Keep video playback muted and tied to explicit song playback. For reduced motion, hold a representative background frame during live playback; seeking updates that still frame. Explain that export retains the selected video motion, consistent with the preview's reduced-motion treatment of existing visualisations.

## Input validation, settings, and resource ownership

The initial input target is MP4 containing H.264 video, subject to real browser and shipped-core validation. MP4 output and MP4 input support are separate capabilities. WebM and other source codecs remain deferred until their decode, seek, and export paths are verified; both existing output formats remain required.

Check actual container/video content, finite positive duration, dimensions, orientation, playable frames, and trim bounds rather than accepting a filename or metadata alone. Reject corrupt, audio-only, unsupported, or over-budget sources with an actionable message. Validate variable-frame-rate timestamps and rotated media before declaring support. Select conservative limits for compressed source bytes per file and total project, source duration/dimensions/frame rate, and working decode buffers using measured evidence; long uploads trimmed to five seconds still retain their source allocation.

Reuse [file picking](../hooks/use-file-picker.ts), [local loading](../hooks/use-local-file.ts), and [local media utilities](../lib/local-media.ts). Keep ownership in the existing editor session; release stale loads, decoded frames, video elements, object URLs, listeners, and temporary files after replacement, clearing, cancellation, failure, and disposal as appropriate. Do not create another song player or competing FFmpeg engine.

Extend the [strict settings schema](../lib/editor/settings.ts) with a documented compatibility strategy. Older presets default to Artwork. Store media-free mode, trim, framing, dimming, and fade preferences; exclude clip bytes, object URLs, local paths, and filenames used as automatic asset identifiers. New sessions require explicit file reselection. Imported video preferences without matching accepted assets display missing-media state and block export; settings import preserves existing media but revalidates every trim against the actual selected slot. Do not claim to restore a clip from preset data.

Freeze accepted clip references, trims, background preferences, timeline, and fade settings at export start. Retain existing cancellation, retry, previous-result preservation, captured download metadata, and one-hour result retention behavior.

## Rendering feasibility and delivery

1. **Feasibility:** prove source decode and timestamp selection in real preview and export, including arbitrary seeks and loop boundaries. Choose a prepared-frame strategy that feeds the shared painter without relying on unsynchronised live video playback. Establish input/decode limits and measure memory, responsiveness, preparation time, and export time on desktop and representative Android/iPhone devices. Unsupported devices receive an actionable capability error.
2. **Single video:** ship validated loading/trimming, repeated-frame selection, video framing/dimming, outer fades, shared preview/export integration, settings compatibility, and lifecycle cleanup after its acceptance checks pass.
3. **Three clips:** add three-slot validation, the absolute-frame timeline, repeat/remainder summary, short-song handling, transition previews, and full three-clip acceptance coverage.

Keep sequential rendering and one shared lazy FFmpeg engine. Decode only bounded working frames; do not cache all three clips as uncompressed frames or the complete song timeline. Await frame preparation before painting each export frame/batch, and share timeline/frame selection with preview. Decode/seek failure must be visible, cancellable, and preserve the previous successful output. Frame selection, lyrics, audio analysis, and fade progress must not reset at encoder batch boundaries.

Do not weaken the existing raw-frame, encoded-parts, or final-output allocation guards to make video tests pass. Profile additional source and decoder memory independently; existing static-artwork desktop evidence does not verify this feature or physical-device safety.

## Acceptance and release requirements

| Area                   | Required evidence                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Segment validation     | Three-clip lengths at exactly 5 and 10 seconds pass; shorter/longer trims fail. Longer valid sources can be trimmed. Invalid/corrupt/audio-only sources and out-of-range trims fail without losing accepted assets.                                                      |
| Timeline               | Pure regression tests cover the 222-second example, exact multiples, partial and sub-loop middles, insufficient duration, grid rounding, source in-points, and non-integral song ends.                                                                                   |
| Real frame selection   | Distinct numbered/coloured Start/Loop/End fixtures verify first/last frames, repetitions, partial middle, outro anchoring, normal speed, backward/late seeking, and batch boundaries in preview and decoded exports.                                                     |
| Fades and overlays     | Check default/disabled/custom fades, short-song limits, black opening/closing endpoints, foreground artwork/details, lyrics, and each existing visualisation/layout. No internal repetition fades or added duration.                                                     |
| Output and audio       | Real saved MP4 and WebM at 320p/720p pass full decode, dimensions/codecs, 30 fps timestamps, expected frame count, duration tolerance, and browser playback/seeking. A distinctive clip audio fixture proves clip sound is absent; song markers stay aligned throughout. |
| Lifecycle and settings | Verify replacement/cancellation/stale loads, mode changes, audio revalidation, clear/disposal, export failure/retry, retained prior result, output expiry, legacy presets, media-free round trips, and missing-media recovery.                                           |
| Browser and privacy    | Check narrow layouts, keyboard/focus controls, reduced motion, no media uploads, decoder capability failures, bounded preparation/export allocations, responsive cancellation, and representative physical devices.                                                      |

Use short targeted fixtures first, then full seven-minute video-background checks for both output formats and resolutions, including recurring loop/lyric/audio markers. Test different source dimensions/frame rates and orientation; support claims require real results, not mocked decoders. Run `bun run check` and `bun run build` after implementation. Extend the existing browser acceptance tooling and record codec/device/limits, measurements, and blockers. Unverified device/codec combinations must remain explicitly unverified or unsupported.

## Deferred work and unresolved calibration

Crossfades, beat-aware transitions, automatic seam repair, additional input formats, clip sound mixing, cloud rendering/uploads, persisted media projects, and exports above 720p need separate scope decisions.

Before shipping, resolve the prepared-frame strategy and numeric input/decode budgets through the feasibility evidence above. These are implementation and release gates, not verified capabilities or permission to increase existing export limits.
