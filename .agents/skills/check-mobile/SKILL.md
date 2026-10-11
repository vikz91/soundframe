---
name: check-mobile
description: Audit mobile readiness when asked "check mobile readiness" or "check mobile support". Examine browser capabilities, resource usage, responsive controls, export, and downloads.
---

# Check mobile readiness

Report findings without editing repository files or installing dependencies. Read relevant v0 device and export requirements, inspect implemented paths, and reuse an existing development server.

- Check worker/WASM loading, relevant browser APIs, and cross-origin isolation if the selected threading mode requires it. Verify capability detection follows actual requirements and produces useful fallback messages.
- Inspect memory growth across input decoding, artwork, frame buffering, encoding, retained output, repeated exports, cancellation, and failures. Avoid claiming a safe budget without measurements.
- Examine foreground-only export messaging, page interruption, orientation changes, touch targets, keyboard/input behavior, small viewports, and overflow.
- Verify local file selection and download/playback behavior where devices and fixtures are available. Evaluate MP4 and WebM separately; one working format or desktop result does not establish the other.
- Distinguish responsive emulation from real-device browser behavior. Record the device/browser, input duration, output format, and observation for each runtime check. Do not describe all modern phones as supported from a small sample.
- Report prioritized defects with file/line evidence, measured results, and a focused remaining device checklist. If runtime tools or devices are unavailable, provide static findings and mark those checks blocked.

Older or low-spec phones may be unsupported under v0; prioritize clear detection and failure behavior over silently expanding the support promise. Apply changes only when the user explicitly requests fixes.
