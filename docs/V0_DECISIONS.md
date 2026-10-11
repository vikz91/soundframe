# Audio2Video v0 Decisions

Status: Locked product decisions, agreed on 12 October 2026.

Audio2Video converts an audio file and cover artwork into a video with optional text, lyrics, and audio-reactive visualisations. v0 runs media processing locally in the browser, supports desktop and capable mobile devices, and provides local downloads without application accounts.

These decisions define the target product. As of 12 October 2026, `/create` implements real local-media validation, playback, Canvas preview, lyrics, and settings; video export and generated-video downloads remain pending. `/prototype` provides the separate simulated experience. See the [implementation tracker](../TODO.md) for verified results and release gaps.

## User flow

Choose files → pick a visual mode → customise → preview → export → download.

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

Validate actual media contents, decodability, and duration rather than relying on filenames. Audio duration must not exceed seven minutes. MP4 input contributes its audio track only; its video is not used in the composition.

Timed LRC lyrics support synchronised display. Plain lyrics can appear as static text. Automatic transcription and lyric timing are outside v0.

## Visual modes and customisation

| Mode     | Composition                                                |
| -------- | ---------------------------------------------------------- |
| Cover    | Prominent cover artwork with optional text                 |
| Spectrum | Sound bars with a small cover thumbnail                    |
| Lighting | Audio-reactive glow or pulses with a small cover thumbnail |

Provide a small set of controls for colour, background, sensitivity, and typography.

## Output

- Landscape video at 568 × 320 pixels and 30 fps.
- Maximum duration of seven minutes, matching the input audio duration.
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

Use a versioned JSON preset containing layout, appearance, text, lyrics, and export preferences. Validate imported presets.

Exclude audio and artwork from presets. Users must select those files again after importing settings.

## Scope boundaries

v0 excludes all YouTube features, login and signup, cloud storage, saved cloud projects, and higher-resolution exports.

Future options include direct YouTube uploads, application accounts, AWS rendering, higher resolutions, saved projects, and additional effects and customisation.

## Release verification

Release requires evidence of:

- Complete seven-minute exports in both MP4 and WebM, with the specified dimensions, frame rate, and codecs.
- Audio and visual synchronisation throughout the exported video, including timed lyrics when supplied.
- Acceptable memory use and rendering performance on representative desktop, Android, and iPhone browsers.
- Working cancellation, failure handling, and temporary resource cleanup.
- Successful local downloads that play with audio on the tested devices.
- Settings import and export that preserve the supported preferences and reject invalid presets.

These are acceptance requirements, not claims of complete release verification. The input/preview stage currently applies conservative bounds of 64 MiB for audio and 12 MiB, 16 million pixels, and 8192 pixels per side for artwork. Desktop boundary fixtures have been checked; the supported device baseline, mobile calibration, encoding path, and complete export memory budget still require benchmarking.
