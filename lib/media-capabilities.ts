export type MediaCapabilities = { supported: boolean; issues: string[] }

/** Probe the single-thread browser pipeline; shared memory and cross-origin isolation are not required. */
export async function checkMediaCapabilities(signal?: AbortSignal): Promise<MediaCapabilities> {
  signal?.throwIfAborted()
  const issues: string[] = []
  if (typeof FileReader === 'undefined' || typeof Blob === 'undefined' || typeof File === 'undefined')
    issues.push('Local file reading is unavailable. Open this page in a current browser.')
  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof URL.revokeObjectURL !== 'function'
  )
    issues.push('Local media URLs are unavailable. Try a current desktop browser.')
  if (typeof AudioContext === 'undefined')
    issues.push('Web Audio is unavailable. Try a current Chrome, Firefox, or Safari browser.')
  try {
    const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
    if (!context) issues.push('Canvas drawing is unavailable. Enable browser graphics support or try another browser.')
    else if (typeof context.roundRect !== 'function')
      issues.push('Rounded Canvas drawing is unavailable. Update your browser before creating a video.')
  } catch {
    issues.push('Canvas drawing is blocked. Enable browser graphics support or try another browser.')
  }
  if (typeof document === 'undefined' || typeof document.fonts?.load !== 'function')
    issues.push('Browser font loading is unavailable. Update your browser to render the video text.')
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function')
    issues.push('Browser color support detection is unavailable. Update your browser before creating a video.')
  try {
    if (typeof WebAssembly === 'undefined') throw new Error('WebAssembly unavailable')
    await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
  } catch {
    issues.push('WebAssembly is unavailable or blocked. Enable it or try a current desktop browser for conversion.')
  }
  signal?.throwIfAborted()
  if (typeof Worker === 'undefined') issues.push('Web Workers are unavailable. Try a current browser for conversion.')
  else if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined') {
    try {
      await probeWorker(signal)
    } catch (error) {
      signal?.throwIfAborted()
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      issues.push('Background workers are blocked. Allow workers in browser settings or try another browser.')
    }
  }
  signal?.throwIfAborted()
  return { supported: issues.length === 0, issues }
}

function probeWorker(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted()
    let worker: Worker | undefined
    let url: string | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      if (worker) {
        worker.onmessage = null
        worker.onerror = null
        worker.terminate()
      }
      if (url) URL.revokeObjectURL(url)
    }
    const abort = () => {
      cleanup()
      reject(new DOMException('Capability check cancelled.', 'AbortError'))
    }
    try {
      url = URL.createObjectURL(new Blob(['self.postMessage("ready")'], { type: 'text/javascript' }))
      worker = new Worker(url)
      worker.onmessage = (event) => {
        cleanup()
        if (event.data === 'ready') resolve()
        else reject(new Error('Worker probe failed'))
      }
      worker.onerror = () => {
        cleanup()
        reject(new Error('Worker probe failed'))
      }
      signal?.addEventListener('abort', abort, { once: true })
      timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Worker probe timed out'))
      }, 5000)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
