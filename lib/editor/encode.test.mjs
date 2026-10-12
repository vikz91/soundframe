import { expect, test } from 'bun:test'
import { encodeFrames, encodingLimits, frameBatches } from './encode'
import { createOfflineAnalysis, analysisSampleRate } from './offline-analysis'
import { defaultEditorPreferences } from './types'
import { waveformRms } from './composition'
import { videoSizes } from './resolution'

test('frame batches cover seven minutes and a final partial batch exactly once', () => {
  expect(frameBatches(420)).toHaveLength(420)
  expect(frameBatches(1.25)).toEqual([
    { start: 0, count: 30 },
    { start: 30, count: 8 }
  ])
  for (const duration of [0, -1, Infinity, NaN, 421]) expect(() => frameBatches(duration)).toThrow()
  expect(encodingLimits.batchFrames * encodingLimits.frameBytes).toBe(21811200)
  const hdBatches = frameBatches(420, '720p')
  expect(hdBatches).toHaveLength(2520)
  expect(hdBatches.at(-1)).toEqual({ start: 12595, count: 5 })
  expect(hdBatches.every((batch, index) => batch.start === index * 5 && batch.count === 5)).toBe(true)
  expect(5 * 1280 * 720 * 4).toBeLessThanOrEqual(encodingLimits.maxFrameBatchBytes)
  expect(frameBatches(0.4, '720p')).toEqual([
    { start: 0, count: 5 },
    { start: 5, count: 5 },
    { start: 10, count: 2 }
  ])
})

test('offline analysis reuses buffers, follows absolute time and is independent of chunk/seek history', () => {
  const pcm = Float32Array.from({ length: analysisSampleRate * 3 }, (_, i) =>
    i < analysisSampleRate ? 0 : 0.4 * Math.sin((2 * Math.PI * 440 * i) / analysisSampleRate)
  )
  const read = createOfflineAnalysis(pcm)
  expect(Array.from(read(0).frequency).every((value) => value === 0)).toBe(true)
  const atBoundary = read(30)
  const savedFrequency = Array.from(atBoundary.frequency)
  const savedWaveform = Array.from(atBoundary.waveform)
  expect(waveformRms(atBoundary.waveform)).toBeGreaterThan(0.1)
  read(80)
  expect(read(30)).toBe(atBoundary)
  expect(Array.from(atBoundary.frequency)).toEqual(savedFrequency)
  expect(Array.from(atBoundary.waveform)).toEqual(savedWaveform)
  const tone = read(40).frequency
  expect(tone.indexOf(Math.max(...tone))).toBeGreaterThan(16)
  expect(tone.indexOf(Math.max(...tone))).toBeLessThan(24)
})

function context(width = 568, height = 320) {
  return new Proxy(
    {
      measureText: () => ({ width: 10 }),
      canvas: { width, height },
      getImageData: (_x, _y, w, h) => {
        expect([w, h]).toEqual([width, height])
        return { data: new Uint8ClampedArray(width * height * 4) }
      }
    },
    { get: (target, key) => (key in target ? target[key] : () => {}) }
  )
}
const snapshot = {
  preferences: defaultEditorPreferences(),
  artwork: { naturalWidth: 100, naturalHeight: 100 },
  cues: [],
  fontFamily: 'test',
  colours: { accent: '#fff', background: '#000', foreground: '#fff', muted: '#888' }
}

test('producer waits for encoder, releases raw input after each batch, and encodes the final partial batch', async () => {
  let raw = false
  let commands = []
  let manifest
  let analyses = []
  const session = {
    path: (name) => `/job/${name}`,
    write: async (name, bytes) => {
      if (name === 'frames.rgba') {
        expect(raw).toBe(false)
        raw = true
        expect(bytes.length).toBeLessThanOrEqual(21811200)
      } else manifest = new TextDecoder().decode(bytes)
    },
    remove: async (name) => {
      expect(name).toBe('frames.rgba')
      raw = false
    },
    exec: async (args) => {
      expect(raw).toBe(true)
      commands.push(args)
    },
    read: async () => new Uint8Array(100)
  }
  await encodeFrames(
    session,
    snapshot,
    1.25,
    new AbortController().signal,
    context(),
    (frame) => {
      analyses.push(frame)
      return null
    },
    () => {}
  )
  expect(commands.map((args) => args[args.indexOf('-frames:v') + 1])).toEqual(['30', '8'])
  expect(analyses).toEqual(Array.from({ length: 38 }, (_, i) => i))
  expect(raw).toBe(false)
  expect(manifest).toBe("file 'part-0.mp4'\nduration 1.000000\nfile 'part-1.mp4'\nduration 0.266667")
})

test('720p producer bounds allocations, scales the painter and keeps frame time across small batches', async () => {
  const { width, height } = videoSizes['720p']
  const ctx = context(width, height)
  const transforms = []
  ctx.setTransform = (...args) => transforms.push(args)
  const writes = []
  const commands = []
  const frames = []
  let manifest
  await encodeFrames(
    {
      path: (name) => `/job/${name}`,
      write: async (name, bytes) => {
        if (name === 'frames.rgba') writes.push(bytes.length)
        else manifest = new TextDecoder().decode(bytes)
      },
      remove: async () => {},
      read: async () => new Uint8Array(100),
      exec: async (args) => commands.push(args)
    },
    { ...snapshot, preferences: { ...snapshot.preferences, resolution: '720p' } },
    0.4,
    new AbortController().signal,
    ctx,
    (frame) => {
      frames.push(frame)
      return null
    },
    () => {}
  )
  expect(writes).toEqual([width * height * 4 * 5, width * height * 4 * 5, width * height * 4 * 2])
  expect(writes.every((bytes) => bytes <= encodingLimits.maxFrameBatchBytes)).toBe(true)
  expect(commands.map((args) => args[args.indexOf('-video_size') + 1])).toEqual(['1280x720', '1280x720', '1280x720'])
  expect(commands.map((args) => args[args.indexOf('-frames:v') + 1])).toEqual(['5', '5', '2'])
  expect(frames).toEqual(Array.from({ length: 12 }, (_, index) => index))
  expect(manifest).toBe(
    "file 'part-0.mp4'\nduration 0.166667\nfile 'part-1.mp4'\nduration 0.166666\nfile 'part-2.mp4'\nduration 0.066667"
  )
  expect(transforms).toHaveLength(12)
  expect(transforms.every((args) => args[0] === width / 568 && args[3] === height / 320)).toBe(true)
})

test('cancelled producer does not transfer frames, and encoded storage limit rejects before assembly', async () => {
  const abort = new AbortController()
  abort.abort()
  let writes = 0
  const session = {
    path: (name) => name,
    write: async () => {
      writes++
    },
    exec: async () => {},
    remove: async () => {},
    read: async () => ({ length: encodingLimits.maxPartsBytes + 1 })
  }
  await expect(encodeFrames(session, snapshot, 1, abort.signal, context(), null, () => {})).rejects.toMatchObject({
    name: 'AbortError'
  })
  expect(writes).toBe(0)
  await expect(
    encodeFrames(session, snapshot, 1, new AbortController().signal, context(), null, () => {})
  ).rejects.toThrow('64 MiB')
  expect(writes).toBe(1)
})
