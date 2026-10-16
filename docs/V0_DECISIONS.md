# Audioframe v0 Decisions

Status: Locked product decisions, agreed on 12 October 2026; duration extended to fifteen minutes on 16 October 2026.

Audioframe converts an audio file and cover artwork into a video with optional text, lyrics, and audio-reactive visualisations. v0 runs media processing locally in the browser, supports desktop and capable mobile devices, and provides local downloads without application accounts.

These decisions define the target product. As of 16 October 2026, `/create` implements real local-media validation, playback, Classic/Full cover Canvas composition, lyrics, settings, bounded MP4/WebM encoding and generated-video downloads. The historical seven-minute Classic desktop matrix is verified at 320p and 720p; current fifteen-minute production checks cover Spectrum MP4 and Cover WebM at 320p. Full cover has short export evidence at both resolutions; its full-length/pattern/lyric matrix and physical-device benchmarks remain pending. See the [implementation tracker](../TODO.md) and [release validation](RELEASE_VALIDATION.md) for evidence and release gaps.

## User flow

Choose files → pick a layout and visual mode → customise → preview → export → download.

## Stack and hosting

- Use Next.js and TypeScript, hosted on Vercel.
- Process all media in the browser using FFmpeg.wasm.
- Use Canvas for the composition preview.
- Run processing in workers and use bounded processing to avoid accumulating every frame in memory.
- Do not upload input media or generated videos to a server. Do not use server-side media rendering.
- Keep v0 free to users, subject to hosting quotas and applicable hosting plan terms.

The worker strategy and conditional chunking approach are locked in [the browser media pipeline architecture](MEDIA_PIPELINE_ARCHITECTURE.md). The exact rendering bridge, thread settings, and memory budget remain subject to implementation benchmarks.

## Device support

Desktop and modern mobile browsers are in scope. Older or low-spec devices may be unsupported. Check capabilities before conversion and show a clear error when processing cannot run.

Users must keep the app open and in the foreground during export. Mobile compatibility and rendering speed remain release targets until verified on representative devices.

## Inputs

| Input           | v0 support                                       |
| --------------- | ------------------------------------------------ |
| Audio           | MP3, M4A, WAV, and MP4 containing an audio track |
| Cover artwork   | JPG and PNG                                      |
| Optional text   | Song title, album name, artists, and website     |
| Optional lyrics | Timed LRC or plain text                          |

Validate actual media contents, decodability, and duration rather than relying on filenames. Audio duration must not exceed fifteen minutes. MP4 input contributes its audio track only; its video is not used in the composition.

Timed LRC lyrics support synchronised display. Plain lyrics can appear as static text. Automatic transcription and lyric timing are outside v0.

## Visual modes and customisation

Choose **Classic** or **Full cover**. Classic remains the default and offers the existing modes:

| Mode     | Composition                                                |
| -------- | ---------------------------------------------------------- |
| Cover    | Prominent cover artwork with optional text                 |
| Spectrum | Sound bars with a small cover thumbnail                    |
| Lighting | Audio-reactive glow or pulses with a small cover thumbnail |

Classic provides colour, background, sensitivity, and typography controls. Full cover uses the artwork as the background with **Bars** or **None**; Lighting remains in Classic. Bar controls are Thin/Bold/Segmented pattern, Ivory/Accent colour, sensitivity, and maximum height (5–30% of the frame). Fit artwork preserves the whole cover over a softened artwork background; Fill frame crops to fill the video with horizontal/vertical positioning. Bottom fade is adjustable. Each layout retains its own appearance choices when switching.

Full cover shows nonempty song title, artist, album, and website at the top, and plain or timed lyrics above the bars. There is no details visibility toggle; empty fields omit individual details. The shared preview/export painter loads the selected metadata font weights and uses a sharp text shadow. Preview rasterisation follows display width and pixel density, capped at 1920 pixels wide; export resolution remains the selected 320p or 720p.

## Output

- Landscape video at 30 fps, with 320p (568 × 320) as the default and an optional 720p (1280 × 720). Higher resolution takes longer to export.
- Maximum duration of fifteen minutes, matching the input audio duration.
- MP4 with H.264 video and AAC audio.
- WebM with VP8 video and Opus audio.
- Include the original audio content. Audio may be re-encoded for output compatibility.

Both output formats are targets for the shipped FFmpeg build and must pass release verification.

## Processing experience

Allow one export at a time. Show preparation, rendering, and finalisation stages, a percentage where measurable, and an approximate ETA.

Provide cancellation and clear failure messages. Release temporary processing data after completion, cancellation, or failure.

## Downloads and cleanup

Files remain on the user's device. Downloads are local; v0 does not provide hosted or shareable download links.

Keep the generated output available for repeat downloads until the user selects **Clear project**, closes the page, or one hour passes after generation. The one-hour cleanup is best effort while the page runs and does not delete files already downloaded to the device.

Do not use a click on Download as proof that the file was successfully saved. Cleanup must not depend on detecting a successful download.

## Settings import and export

Use a versioned JSON preset containing layout, independent Classic/Full cover appearance choices, text, lyrics, and export preferences. The strict version-1 schema includes output format and resolution; older version-1 presets without layout default to Classic and those without resolution default to 320p. Accept and discard the retired `fullCover.showDetails` boolean; it cannot suppress populated fields and is omitted from new presets. Validate imported presets and reject unsupported values and other unknown keys.

Exclude audio and artwork from presets. Confirm preference replacement when importing; preserve any audio and artwork already selected in the current session. Users must select media again when opening a new session because presets do not contain those files.

## Scope boundaries

v0 excludes all YouTube features, login and signup, cloud storage, saved cloud projects, and exports above 720p.

Future options include direct YouTube uploads, application accounts, AWS rendering, resolutions above 720p, saved projects, and additional effects and customisation.

## Release verification

Release requires evidence of:

- Complete fifteen-minute exports in both MP4 and WebM, with the specified dimensions, frame rate, and codecs, for Classic and Full cover compositions.
- Audio and visual synchronisation throughout the exported video, including timed lyrics when supplied.
- Acceptable memory use and rendering performance on representative desktop, Android, and iPhone browsers.
- Working cancellation, failure handling, and temporary resource cleanup.
- Successful local downloads that play with audio on the tested devices.
- Settings import and export that preserve the supported preferences and reject invalid presets.

These are acceptance requirements, not claims of complete release verification. The input/preview stage currently applies conservative bounds of 128 MiB for audio and 24 MiB, 16 million pixels, and 8192 pixels per side for artwork. The byte guards were doubled on 16 October 2026 with provisional [buffer/heap admission checks](MEDIA_PIPELINE_ARCHITECTURE.md#memory-admission-checks). Earlier desktop boundary evidence predates that change; the supported device baseline, mobile calibration, and complete export memory budget still require benchmarking.
