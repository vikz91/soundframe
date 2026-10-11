# Browser FFmpeg wrapper

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

`cancel()` immediately terminates the shared worker and rejects active work. Failures also terminate it. The next job loads a fresh engine. `dispose()` releases an idle engine too; call it when closing/resetting the editor. Unmounting one hook only unsubscribes, so it does not disrupt other consumers. The calling UI owns output Blobs and object URLs.

`progress` is an approximate encoding fraction, rounded to percentage points. Loading/file transfers are represented by status, and progress reaches 1 only after output and cleanup complete. FFmpeg progress is reliable only for matching input/output durations; this wrapper does not calculate an ETA.

Assets are copied from the installed packages to ignored `public/ffmpeg/` during `prepare`, `dev`, and `build`. `bun run ffmpeg:assets` refreshes them manually. The wrapper imports these local ESM modules at runtime to avoid Turbopack's inability to resolve the package's dynamic worker URL. Vercel serves these static assets from the same origin; no CDN or server encoder is required. The single-threaded core needs modern Web Workers and WebAssembly, without SharedArrayBuffer or isolation headers. Keep the page open and foregrounded on mobile.

`bun run test:media` covers lifecycle and cleanup with a mocked engine. Full seven-minute exports, mobile memory/performance, Canvas composition, input validation, and download retention are separate pipeline work; installing this wrapper does not establish those release gates.

API reference: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/).
