import { ffmpegClient } from '@/lib/ffmpeg'
import type { EditorPreferences } from './types'
import type { EncodingProgress } from './encode'

export const videoLifetime = 60 * 60 * 1000
export type ExportInput = {
  preferences: EditorPreferences
  artwork: HTMLImageElement
  audioURL: string
  duration: number
}
export type VideoResult = {
  blob: Blob | null
  url: string | null
  filename: string
  format: 'mp4' | 'webm'
  duration: number
  expiresAt: number
}
export type VideoExportState = {
  status: 'idle' | 'running' | 'complete' | 'cancelled' | 'failed'
  work: EncodingProgress
  result: VideoResult | null
  error: string | null
  now: number
}
const initialState: VideoExportState = {
  status: 'idle',
  work: { stage: 'prepare', progress: 0 },
  result: null,
  error: null,
  now: 0
}
async function encode(input: ExportInput, signal: AbortSignal, report: (work: EncodingProgress) => void) {
  const [{ encodeVideo }, { prepareComposition }] = await Promise.all([import('./encode'), import('./composition')])
  signal.throwIfAborted()
  const snapshot = await prepareComposition(input.preferences, input.artwork)
  signal.throwIfAborted()
  return encodeVideo({ snapshot, audioURL: input.audioURL, duration: input.duration, signal, report })
}
const browserResources = {
  now: () => Date.now(),
  schedule: (callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  },
  createURL: (blob: Blob) => URL.createObjectURL(blob),
  revokeURL: (url: string) => URL.revokeObjectURL(url),
  disposeEngine: () => ffmpegClient.dispose()
}

/** Owns cancellation generations and the retained Blob/URL independently of editor views. */
export function createVideoExportController(encoder = encode, resources = browserResources) {
  let state = initialState
  let generation = 0
  let active: AbortController | null = null
  let stopTimer: (() => void) | undefined
  const listeners = new Set<() => void>()
  const publish = (next: VideoExportState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const release = () => {
    stopTimer?.()
    stopTimer = undefined
    if (state.result?.url) resources.revokeURL(state.result.url)
  }
  const refresh = () => {
    stopTimer?.()
    stopTimer = undefined
    const now = resources.now()
    const result = state.result
    if (!result?.blob) return
    if (now >= result.expiresAt) {
      release()
      publish({ ...state, now, result: { ...result, blob: null, url: null } })
    } else {
      publish({ ...state, now })
      const current = result
      stopTimer = resources.schedule(
        () => {
          if (state.result === current) refresh()
        },
        Math.min(60_000, result.expiresAt - now)
      )
    }
  }
  const cancel = () => {
    if (!active) return
    generation++
    active.abort()
    active = null
    // Preparation may still be awaiting fonts/imports before the encoder's abort listener exists.
    resources.disposeEngine()
    publish({ ...state, status: 'cancelled', error: null })
  }
  const start = async (input: ExportInput) => {
    if (active) throw new Error('An export is already running.')
    const current = ++generation
    const abort = new AbortController()
    active = abort
    // Freeze user preferences before any async work; artwork is locked by the caller.
    const selected = { ...input, preferences: structuredClone(input.preferences) }
    publish({ ...state, status: 'running', work: { stage: 'prepare', progress: 0 }, error: null })
    try {
      const blob = await encoder(selected, abort.signal, (work) => {
        if (current === generation)
          publish({ ...state, work: { ...work, progress: Math.max(state.work.progress, work.progress) } })
      })
      if (current !== generation || abort.signal.aborted) return
      if (!blob.size) throw new Error('The encoder produced an empty video.')
      const url = resources.createURL(blob)
      release()
      const now = resources.now()
      publish({
        ...state,
        status: 'complete',
        work: { stage: 'finalise', progress: 100 },
        now,
        result: {
          blob,
          url,
          filename: `audioframe.${selected.preferences.format}`,
          format: selected.preferences.format,
          duration: selected.duration,
          expiresAt: now + videoLifetime
        }
      })
      refresh()
    } catch (error) {
      if (current !== generation) return
      resources.disposeEngine()
      publish({
        ...state,
        status: abort.signal.aborted ? 'cancelled' : 'failed',
        error:
          error instanceof Error
            ? error.message
            : `Video export failed during ${state.work.stage} (${Math.round(state.work.progress)}%): ${String(error)}. Try again.`
      })
    } finally {
      if (current === generation) active = null
    }
  }
  const clear = () => {
    generation++
    active?.abort()
    active = null
    release()
    resources.disposeEngine()
    publish(initialState)
  }
  return {
    start,
    cancel,
    clear,
    dispose: clear,
    refresh,
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
