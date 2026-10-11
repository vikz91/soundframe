import {
  defaultPreferences,
  presetPreferences,
  sampleLrc,
  sampleOptions,
  type PrototypePreferences,
  type SampleKind,
  type SampleOption
} from './fixtures'

export type PrototypeView = 'files' | 'create' | 'export' | 'download'
export type InspectorTab = 'style' | 'text' | 'lyrics'
export type PrototypeDialog = SampleKind | 'help' | 'preview' | 'clear' | 'cancel' | 'replace' | null
export type Selection = { sample?: SampleOption; checking: boolean; error?: string }
export type PrototypeOutput = {
  filename: string
  createdAt: number
  expiresAt: number
  preferences: PrototypePreferences
  duration: number
  expired: boolean
}
export type PrototypeState = {
  now: number
  view: PrototypeView
  audio: Selection
  artwork: Selection
  preferences: PrototypePreferences
  inspectorTab: InspectorTab
  playback: { playing: boolean; currentTime: number; volume: number }
  export: {
    status: 'idle' | 'running' | 'failed' | 'cancelled' | 'complete'
    stage: 'prepare' | 'render' | 'finalise'
    progress: number | null
  }
  output: PrototypeOutput | null
  dialog: PrototypeDialog
  settingsError?: string
  lyricsError?: string
  announcement: string
}
export type PrototypeClock = { now: () => number; schedule: (callback: () => void, delay: number) => () => void }
export const outputLifetime = 60 * 60 * 1000
const browserClock: PrototypeClock = {
  now: () => Date.now(),
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  }
}
function initialState(): PrototypeState {
  return {
    now: 0,
    view: 'files',
    audio: { checking: false },
    artwork: { checking: false },
    preferences: defaultPreferences(),
    inspectorTab: 'style',
    playback: { playing: false, currentTime: 0, volume: 0.7 },
    export: { status: 'idle', stage: 'prepare', progress: null },
    output: null,
    dialog: null,
    announcement: ''
  }
}
export function canCreate(state: PrototypeState) {
  return (
    !!state.audio.sample &&
    !!state.artwork.sample &&
    !state.audio.checking &&
    !state.artwork.checking &&
    !state.audio.error &&
    !state.artwork.error
  )
}

/** Fixture-only session owner. No File, audio element, encoder, or download APIs. */
export function createPrototypeController(clock: PrototypeClock = browserClock) {
  let state = initialState()
  const serverState = state
  const listeners = new Set<() => void>()
  const timers = new Map<string, () => void>()
  let generation = 0
  let active = true
  let failureConsumed = false
  function publish(next: PrototypeState) {
    if (!active) return
    state = next
    listeners.forEach((listener) => listener())
  }
  function stop(key: string) {
    timers.get(key)?.()
    timers.delete(key)
  }
  function later(key: string, delay: number, callback: () => void) {
    stop(key)
    const version = generation
    const cancel = clock.schedule(() => {
      if (!active || version !== generation || timers.get(key) !== cancel) return
      timers.delete(key)
      callback()
    }, delay)
    timers.set(key, cancel)
  }
  function stopAll() {
    generation++
    timers.forEach((cancel) => cancel())
    timers.clear()
  }
  function pause() {
    stop('playback')
    publish({ ...state, playback: { ...state.playback, playing: false } })
  }
  function checkExpiry() {
    if (!state.output || state.output.expired) return
    if (clock.now() >= state.output.expiresAt) {
      stop('expiry')
      stop('retention')
      publish({
        ...state,
        now: clock.now(),
        output: { ...state.output, expired: true },
        announcement: 'The sample result has expired. Export again to create another.'
      })
    }
  }
  function retentionTick() {
    if (!state.output || state.output.expired) return
    later('retention', 1000, () => {
      checkExpiry()
      if (state.output && !state.output.expired) {
        publish({ ...state, now: clock.now() })
        retentionTick()
      }
    })
  }
  function playbackTick() {
    later('playback', 1000, () => {
      const duration = state.audio.sample?.duration ?? 0
      const time = Math.min(duration, state.playback.currentTime + 1)
      publish({ ...state, playback: { ...state.playback, currentTime: time, playing: time < duration } })
      if (state.playback.playing) playbackTick()
    })
  }
  function applyPreset() {
    publish({
      ...state,
      preferences: presetPreferences(),
      settingsError: undefined,
      lyricsError: undefined,
      dialog: null,
      announcement: 'Sample settings applied. Selected samples have been kept.'
    })
  }
  function exportStart() {
    if (!canCreate(state) || state.export.status === 'running') return
    pause()
    const startedAt = clock.now()
    const preferences = structuredClone(state.preferences)
    const duration = state.audio.sample?.duration ?? 222
    const shouldFail = !!state.audio.sample?.failsExport && !failureConsumed
    publish({
      ...state,
      view: 'export',
      dialog: null,
      export: { status: 'running', stage: 'prepare', progress: null },
      announcement: 'Simulated export started. Preparing the sample.'
    })
    function advance() {
      const elapsed = clock.now() - startedAt
      if (shouldFail && elapsed >= 4000) {
        failureConsumed = true
        publish({
          ...state,
          dialog: state.dialog === 'cancel' ? null : state.dialog,
          export: { ...state.export, status: 'failed' },
          announcement: 'The sample export failed as expected. Retry will succeed.'
        })
        return
      }
      if (elapsed >= 8000) {
        const createdAt = clock.now()
        const output: PrototypeOutput = {
          filename: `audioframe-sample.${preferences.format}`,
          createdAt,
          expiresAt: createdAt + outputLifetime,
          preferences,
          duration,
          expired: false
        }
        publish({
          ...state,
          now: createdAt,
          view: 'download',
          dialog: state.dialog === 'cancel' ? null : state.dialog,
          export: { ...state.export, status: 'complete', progress: 100 },
          output,
          announcement: 'Sample result ready. No video was generated.'
        })
        later('expiry', outputLifetime, checkExpiry)
        retentionTick()
        return
      }
      const stage = elapsed < 1500 ? 'prepare' : elapsed < 7500 ? 'render' : 'finalise'
      const changedStage = stage !== state.export.stage
      publish({
        ...state,
        export: { status: 'running', stage, progress: stage === 'prepare' ? null : Math.min(99, elapsed / 80) },
        announcement: changedStage
          ? `Simulated export: ${stage === 'render' ? 'rendering' : 'finalising'}.`
          : state.announcement
      })
      later('export', 250, advance)
    }
    later('export', 250, advance)
  }
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => serverState,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    activate: () => {
      active = true
      checkExpiry()
      if (state.output && !state.output.expired) {
        later('expiry', Math.max(0, state.output.expiresAt - clock.now()), checkExpiry)
        retentionTick()
      }
    },
    dispose: () => {
      stopAll()
      active = false
    },
    checkExpiry,
    navigate: (view: PrototypeView) => {
      checkExpiry()
      if (
        state.export.status === 'running' ||
        (view !== 'files' && view !== 'download' && !canCreate(state)) ||
        (view === 'download' && !state.output)
      )
        return
      pause()
      publish({ ...state, view, dialog: null, announcement: '' })
    },
    setDialog: (dialog: PrototypeDialog) => {
      publish({ ...state, dialog })
    },
    selectSample: (kind: SampleKind, id: string) => {
      if (state.export.status === 'running') return
      const sample = sampleOptions[kind].find((option) => option.id === id)
      if (!sample) return
      if (kind === 'audio' || kind === 'artwork') {
        pause()
        if (kind === 'audio') failureConsumed = false
        publish({
          ...state,
          [kind]: { sample, checking: true },
          dialog: null,
          playback: { ...state.playback, currentTime: 0 },
          announcement: `Checking the ${kind} sample.`
        })
        later(kind, 600, () =>
          publish({
            ...state,
            [kind]: { sample: sample.error ? undefined : sample, checking: false, error: sample.error },
            announcement: sample.error ?? `${sample.label} sample selected.`
          })
        )
      } else if (kind === 'preset') {
        if (sample.error) publish({ ...state, dialog: null, settingsError: sample.error, announcement: '' })
        else if (JSON.stringify(state.preferences) !== JSON.stringify(defaultPreferences()))
          publish({ ...state, dialog: 'replace' })
        else applyPreset()
      } else {
        publish({
          ...state,
          dialog: null,
          lyricsError: sample.error,
          preferences: sample.error
            ? state.preferences
            : { ...state.preferences, lyricsMode: 'lrc', lyricsText: sampleLrc, lyricsFilename: sample.filename },
          announcement: sample.error ? '' : 'Timed sample lyrics loaded.'
        })
      }
    },
    removeSample: (kind: 'audio' | 'artwork') => {
      if (state.export.status === 'running') return
      stop(kind)
      pause()
      publish({
        ...state,
        [kind]: { checking: false },
        playback: { ...state.playback, currentTime: 0 },
        announcement: `${kind === 'audio' ? 'Audio' : 'Artwork'} sample removed.`
      })
    },
    updatePreferences: (patch: Partial<PrototypePreferences>) => {
      if (state.export.status === 'running') return
      publish({
        ...state,
        preferences: { ...state.preferences, ...patch },
        lyricsError: 'lyricsText' in patch || 'lyricsMode' in patch ? undefined : state.lyricsError
      })
    },
    setInspectorTab: (inspectorTab: InspectorTab) => publish({ ...state, inspectorTab }),
    togglePlayback: () => {
      if (!canCreate(state) || state.export.status === 'running') return
      if (state.playback.playing) pause()
      else {
        const duration = state.audio.sample?.duration ?? 0
        publish({
          ...state,
          playback: {
            ...state.playback,
            playing: true,
            currentTime: state.playback.currentTime >= duration ? 0 : state.playback.currentTime
          }
        })
        playbackTick()
      }
    },
    pausePlayback: pause,
    seek: (seconds: number) => {
      if (Number.isFinite(seconds))
        publish({
          ...state,
          playback: {
            ...state.playback,
            currentTime: Math.max(0, Math.min(state.audio.sample?.duration ?? 0, seconds))
          }
        })
    },
    setVolume: (volume: number) => {
      if (Number.isFinite(volume))
        publish({ ...state, playback: { ...state.playback, volume: Math.max(0, Math.min(1, volume)) } })
    },
    startExport: exportStart,
    cancelExport: () => {
      if (state.export.status !== 'running') return
      stop('export')
      publish({
        ...state,
        dialog: null,
        export: { ...state.export, status: 'cancelled' },
        announcement: 'Simulated export cancelled. Your project is still here.'
      })
    },
    applyPreset,
    clear: () => {
      stopAll()
      failureConsumed = false
      publish({ ...initialState(), announcement: 'Project cleared.' })
    },
    simulateDownload: () => {
      checkExpiry()
      if (state.output && !state.output.expired) publish({ ...state, announcement: 'Demo only — no file was saved.' })
    },
    simulateSettingsExport: () => publish({ ...state, announcement: 'Demo only — no settings file was saved.' })
  }
}
export type PrototypeController = ReturnType<typeof createPrototypeController>
