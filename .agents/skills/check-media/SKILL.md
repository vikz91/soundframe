---
name: check-media
description: Audit the browser audio-to-video pipeline when asked "check media pipeline" or "audit export". Examine decoding, composition, encoding, synchronization, cancellation, and cleanup.
---

# Check media pipeline

Audit and report; do not edit the repository or install tools unless fixes are explicitly authorized. Read the relevant v0 decisions and media architecture, then inspect only implemented paths. If the pipeline is absent, report the gap rather than treating a design as implementation.

Trace file selection through validation, decoding, canvas composition, worker processing, muxing, local download, and disposal:

- Verify content/decodability and duration validation, MP4 audio-track handling, and the seven-minute limit.
- Inspect frame/audio clocks, timed lyrics, frame counts, chunk boundaries, and timestamp continuity. Confirm the export uses the intended composition rather than assuming preview fidelity.
- Check intended 568 × 320, 30 fps exports: MP4 H.264/AAC and WebM VP8/Opus. Verify actual shipped codec availability; package declarations do not prove encoder support.
- Inspect worker ownership, bounded frame buffering, temporary files, audio resources, and one-export-at-a-time behavior. Follow cancellation, failure, retry, and disposal paths.
- Check progress/ETA against actual stages, output URL lifetime, repeat downloads, and best-effort cleanup. A download click does not prove a saved playable file.

Use an existing server and supplied or existing fixtures for browser verification when available; keep media local. Report exactly which inputs, formats, durations, and environments were exercised. Short fixtures do not establish seven-minute behavior.

Return prioritized findings with source evidence, tested results, and blocked release checks. Mark static inspection, observed playback, and measured memory separately. Do not claim synchronization, output validity, or mobile support from compilation alone.
