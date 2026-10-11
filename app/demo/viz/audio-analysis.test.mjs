import { afterAll, beforeEach, expect, test } from 'bun:test'
import { LocalAudioAnalyser } from './audio-analysis'
const originalContext = globalThis.AudioContext
const contexts = []
let deferredResume = null

class TestContext {
  state = 'suspended'
  destination = {}
  resumes = 0
  closes = 0
  connections = []
  sourceDisconnects = 0
  analyserDisconnects = 0
  analyser = {
    fftSize: 1024,
    frequencyBinCount: 512,
    smoothingTimeConstant: 0,
    getByteFrequencyData: (values) => values.fill(180),
    getByteTimeDomainData: (values) => values.fill(128),
    disconnect: () => {
      this.analyserDisconnects++
    }
  }
  constructor() {
    contexts.push(this)
  }
  createAnalyser() {
    return this.analyser
  }
  createMediaElementSource() {
    return {
      connect: (target) => {
        this.connections.push(target)
      },
      disconnect: () => {
        this.sourceDisconnects++
      }
    }
  }
  async resume() {
    this.resumes++
    if (deferredResume) await deferredResume()
    if (this.state !== 'closed') this.state = 'running'
  }
  close() {
    this.closes++
    this.state = 'closed'
    return Promise.resolve()
  }
}
beforeEach(() => {
  contexts.length = 0
  deferredResume = null
  globalThis.AudioContext = TestContext
})
afterAll(() => {
  globalThis.AudioContext = originalContext
})
function fixture() {
  const audio = { paused: false, ended: false }
  return { audio, analysis: new LocalAudioAnalyser(audio) }
}
test('creates one graph on play, preserves the output connection, and reuses sample buffers', async () => {
  const { analysis } = fixture()
  expect(contexts).toHaveLength(0)
  expect(await analysis.start()).toBe(true)
  const context = contexts[0]
  expect(context.connections).toEqual([context.destination, context.analyser])
  const first = analysis.read()
  expect(first?.frequency[0]).toBe(180)
  expect(first?.waveform[0]).toBe(128)
  expect(analysis.read()).toBe(first)
  expect(await analysis.start()).toBe(true)
  expect(contexts).toHaveLength(1)
  analysis.dispose()
})
test('paused, ended, or suspended playback produces no audio samples', async () => {
  const { audio, analysis } = fixture()
  await analysis.start()
  audio.paused = true
  expect(analysis.read()).toBeNull()
  audio.paused = false
  audio.ended = true
  expect(analysis.read()).toBeNull()
  audio.ended = false
  contexts[0].state = 'suspended'
  expect(analysis.read()).toBeNull()
  analysis.dispose()
})
test('disposal disconnects and closes once, and cannot recreate a released media source', async () => {
  const { analysis } = fixture()
  await analysis.start()
  analysis.dispose()
  analysis.dispose()
  expect(contexts[0].closes).toBe(1)
  expect(contexts[0].sourceDisconnects).toBe(1)
  expect(contexts[0].analyserDisconnects).toBe(1)
  expect(await analysis.start()).toBe(false)
  expect(analysis.read()).toBeNull()
  expect(contexts).toHaveLength(1)
})
test('a resume completing after removal cannot reactivate the released track', async () => {
  let complete = () => {}
  deferredResume = () =>
    new Promise((resolve) => {
      complete = resolve
    })
  const { analysis } = fixture()
  const starting = analysis.start()
  analysis.dispose()
  complete()
  expect(await starting).toBe(false)
  expect(analysis.read()).toBeNull()
  expect(contexts[0].closes).toBe(1)
})

test('browsers without Web Audio keep native playback and skip analysis', async () => {
  globalThis.AudioContext = undefined
  const { audio, analysis } = fixture()
  expect(await analysis.start()).toBe(false)
  expect(analysis.read()).toBeNull()
  expect(audio.paused).toBe(false)
  expect(contexts).toHaveLength(0)
  analysis.dispose()
})
