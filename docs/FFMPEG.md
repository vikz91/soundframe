# Browser FFmpeg wrapper

The shared wrapper powers real `/create` exports with one lazy engine. Preview stays on browser APIs and Canvas; `/prototype` simulates export without loading the engine. See the [media architecture](MEDIA_PIPELINE_ARCHITECTURE.md) and [encoding evidence](../TODO.md#completed-real-encoding-and-output-lifecycle).

Use `useFFmpeg` inside a Client Component. Mounting a hook does not load WASM. `load()` optionally warms the engine; `run()` loads it automatically. All hooks share one lazy single-threaded engine and the same status/progress/error snapshot. Sequential jobs reuse the worker; overlapping jobs reject with a busy error.

```tsx
'use client'

import { useFFmpeg } from '@/hooks/use-ffmpeg'

export function ConvertButton({ audio }: { audio: File }) {
  const { run, status, progress, cancel } = useFFmpeg()

  async function convert() {
    try {
      const output = await run({
        inputs: [{ name: 'input.mp3', data: audio }],
        output: { name: 'output.wav', type: 'audio/wav' },
        args: ({ inputs, output }) => ['-i', inputs[0], output]
      })
      // Pass the Blob to the download UI; revoke any object URL when finished.
      console.log(output.size)
    } catch (error) {
      // Cancellation rejects with AbortError; surface other errors in the UI.
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error)
    }
  }

  const busy = status === 'loading' || status === 'running'
  return (
    <>
      <button onClick={convert} disabled={busy}>
        Convert
      </button>
      <button onClick={cancel} disabled={!busy}>
        Cancel
      </button>
      <progress value={progress} max={1} />
    </>
  )
}
```

Each job gets an isolated virtual directory. Use the provided input/output paths and keep intermediate files inside `directory`; the wrapper removes that directory before returning the output Blob. Filenames must be unique and contain only letters, digits, underscores, hyphens, or dots. Caller-owned byte arrays are copied before transfer.

`run()` also accepts an `FFmpegPipeline`: supply `inputs`, `output`, `maxOutputBytes`, and an async `process(session, paths)` callback instead of `args`. The exclusive session exposes checked job-local `path(name)`, `write(name, bytes)`, `read(name)`, `remove(name)`, and `exec(args, onProgress?)` methods. Each operation rejects after cancellation, and nonzero command exits fail the whole job. This keeps sequential commands and intermediate files in one worker/directory. The final Blob is returned only after directory cleanup. The caller controls backpressure and allocation bounds; do not produce the next raw batch before awaiting its encoding. See [the production pipeline](../lib/editor/encode.ts).

`cancel()` immediately terminates the shared worker and rejects active work. Failures also terminate it. The next job loads a fresh engine. `dispose()` releases an idle engine too; call it when closing/resetting the editor. Unmounting one hook only unsubscribes, so it does not disrupt other consumers. The [output controller](../lib/editor/export-controller.ts) owns the retained result Blob/URL and one-hour completion-anchored expiry, guarded against stale completion and timers. The editor calls `useDownload` for repeat downloads and clears its separate download URL on expiry/clear. Cancellation and failure preserve inputs/preferences and the previous valid output; only successful replacement releases it.

`progress` is an approximate encoding fraction, rounded to percentage points. Loading/file transfers are represented by status, and progress reaches 1 only after output and cleanup complete. FFmpeg progress is reliable only for matching input/output durations; this wrapper does not calculate an ETA.

Assets are copied from the installed packages to ignored `public/ffmpeg/` during `prepare`, `dev`, and `build`. `bun run ffmpeg:assets` refreshes them manually. The wrapper imports these local ESM modules at runtime to avoid Turbopack's inability to resolve the package's dynamic worker URL. Vercel serves these static assets from the same origin; no CDN or server encoder is required. The single-threaded core needs modern Web Workers and WebAssembly, without SharedArrayBuffer or isolation headers. Keep the page open and foregrounded on mobile.

`bun run test:media` covers wrapper lifecycle and cleanup with a mocked engine, plus media validation, capability probes, deterministic Canvas operations, LRC parsing, settings, and audio-analysis lifecycles. Real input validation and Canvas preview also have desktop browser evidence. The opt-in [browser acceptance script](../scripts/verify-encoding.mjs) additionally verifies real short exports in all three modes and both formats, audio onset, lyric boundaries, final partial chunks, saved-video playback/seeking, cancellation, forced failure/retry, expiry, and URL cleanup. Full seven-minute exports and physical-device synchronisation/memory/performance remain release gates.

Run the existing development server, install Playwright/Chrome outside application dependencies, and provide `PLAYWRIGHT_MODULE` (absolute path to its `index.mjs`) and optionally `CHROME_PATH` (browser executable) when running `node scripts/verify-encoding.mjs`. Native `ffmpeg` and `ffprobe` must be on PATH. Optional `ENCODING_BASE_URL` and `ENCODING_EVIDENCE_DIR` select the route URL and evidence destination. Synthetic fixtures and downloaded videos are temporary; JSON observations, reference/decoded-frame PNGs, and desktop/mobile screenshots are retained. The script uses native tools only to generate fixtures and inspect saved results; actual encoding occurs in browser WASM.

API reference: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/).
