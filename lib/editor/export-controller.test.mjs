import { expect, test } from 'bun:test'
import { createVideoExportController, videoLifetime } from './export-controller'
import { defaultEditorPreferences } from './types'
import { assertMemoryAvailable } from '@/lib/memory-budget'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function fixture(encoder) {
  let now = 100
  let sequence = 0
  const timers = new Set()
  const revoked = []
  let disposals = 0
  const controller = createVideoExportController(encoder, {
    now: () => now,
    schedule: (callback) => {
      timers.add(callback)
      return () => timers.delete(callback)
    },
    createURL: () => `blob:${++sequence}`,
    revokeURL: (url) => revoked.push(url),
    disposeEngine: () => disposals++
  })
  const input = {
    preferences: defaultEditorPreferences(),
    artwork: {},
    audioURL: 'blob:audio',
    audioBytes: 1024,
    duration: 1.25
  }
  return {
    controller,
    input,
    revoked,
    timers,
    advance: (value) => {
      now += value
    },
    disposals: () => disposals
  }
}
const video = () => new Blob(['encoded video'], { type: 'video/mp4' })

test('result admission failure retains the old download and clear releases its memory reservation', async () => {
  let calls = 0
  const f = fixture(async () => (++calls === 1 ? video() : { size: 641 * 1024 * 1024 }))
  await f.controller.start(f.input)
  const previous = f.controller.getSnapshot().result
  await f.controller.start(f.input)
  expect(f.controller.getSnapshot()).toMatchObject({ status: 'failed', result: previous })
  expect(f.revoked).toEqual([])
  expect(() => assertMemoryAvailable({ buffers: 640 * 1024 * 1024 }, {})).toThrow('memory headroom')
  f.controller.clear()
  expect(() => assertMemoryAvailable({ buffers: 640 * 1024 * 1024 }, {})).not.toThrow()
})

test('output names use title and optional artist, preserve extensions and handle unsafe or empty metadata', async () => {
  for (const [title, artist, format, filename] of [
    ['Morning Light', 'River', 'mp4', 'Morning Light - River - audioframe.mp4'],
    ['Morning Light', '  ', 'mp4', 'Morning Light - audioframe.mp4'],
    ['  गीत  ', ' कलाकार ', 'webm', 'गीत - कलाकार - audioframe.webm'],
    ['../Night: Sky?', 'AC/DC\nLive', 'mp4', 'Night Sky - AC DC Live - audioframe.mp4'],
    ['  ', '', 'mp4', 'Untitled track - audioframe.mp4'],
    ['..<>:"/\\|?*', '..', 'webm', 'Untitled track - audioframe.webm']
  ]) {
    const f = fixture(async () => video())
    f.input.preferences.details = { ...f.input.preferences.details, title, artist }
    f.input.preferences.format = format
    await f.controller.start(f.input)
    expect(f.controller.getSnapshot().result.filename).toBe(filename)
    f.controller.dispose()
  }
  const f = fixture(async () => video())
  f.input.preferences.details.title = '🎵'.repeat(200)
  f.input.preferences.details.artist = 'Artist'.repeat(40)
  await f.controller.start(f.input)
  const filename = f.controller.getSnapshot().result.filename
  expect(new TextEncoder().encode(filename).length).toBeLessThanOrEqual(255)
  expect(filename).toEndWith(' - audioframe.mp4')
  expect(filename).not.toContain('\uFFFD')
  f.controller.dispose()
})

test('output filename keeps the metadata captured at export start after later edits', async () => {
  const pending = deferred()
  const f = fixture(async () => pending.promise)
  f.input.preferences.details.title = 'First title'
  f.input.preferences.details.artist = 'First artist'
  const running = f.controller.start(f.input)
  f.input.preferences.details.title = 'New title'
  f.input.preferences.details.artist = ''
  f.input.preferences.format = 'webm'
  pending.resolve(video())
  await running
  expect(f.controller.getSnapshot().result.filename).toBe('First title - First artist - audioframe.mp4')
  f.controller.dispose()
})

test('successful replacement releases old URL, failure and cancellation retain output, preferences are captured', async () => {
  const pending = deferred()
  let calls = 0
  let captured
  const f = fixture(async (input, signal) => {
    captured = input.preferences
    calls++
    if (calls === 2) throw new Error('encoder failure')
    if (calls === 3) return pending.promise
    expect(signal.aborted).toBe(false)
    return video()
  })
  await f.controller.start(f.input)
  const previous = f.controller.getSnapshot().result
  f.input.preferences.details.title = 'Edited'
  f.input.preferences.resolution = '720p'
  f.input.preferences.fullCover.pattern = 'segmented'
  expect(captured.details.title).toBe('')
  expect(captured.resolution).toBe('320p')
  expect(captured.fullCover.pattern).toBe('thin')
  expect(previous.resolution).toBe('320p')
  await f.controller.start(f.input)
  expect(f.controller.getSnapshot()).toMatchObject({ status: 'failed', result: previous })
  const running = f.controller.start(f.input)
  await expect(f.controller.start(f.input)).rejects.toThrow('already running')
  f.controller.cancel()
  expect(f.disposals()).toBe(2) // Failure and cancellation each release the retained engine, even during preparation.
  pending.resolve(video())
  await running
  expect(f.controller.getSnapshot()).toMatchObject({ status: 'cancelled', result: previous })
  expect(f.revoked).toEqual([])
  await f.controller.start(f.input)
  expect(f.revoked).toEqual(['blob:1'])
  expect(f.controller.getSnapshot().result.url).toBe('blob:2')
  expect(f.controller.getSnapshot().result.resolution).toBe('720p')
  f.controller.dispose()
  expect(f.revoked).toEqual(['blob:1', 'blob:2'])
  expect(f.timers.size).toBe(0)
})

test('expiry is anchored to completion and background refresh drops Blob and URL without dropping metadata', async () => {
  const f = fixture(async () => video())
  await f.controller.start(f.input)
  const expiresAt = f.controller.getSnapshot().result.expiresAt
  const staleTimer = [...f.timers][0]
  f.advance(videoLifetime - 1)
  f.controller.refresh() // Downloads call this; they must never extend retention.
  expect(f.controller.getSnapshot().result.expiresAt).toBe(expiresAt)
  f.advance(1)
  f.controller.refresh()
  expect(f.controller.getSnapshot().result).toMatchObject({ blob: null, url: null, duration: 1.25 })
  expect(f.revoked).toEqual(['blob:1'])
  expect(f.timers.size).toBe(0)
  await f.controller.start(f.input)
  staleTimer()
  expect(f.controller.getSnapshot().result.url).toBe('blob:2')
  f.controller.clear()
})

test('clear/dispose abort work and stale progress/completion cannot replace a new result', async () => {
  const pending = deferred()
  let reportOld,
    oldSignal,
    calls = 0
  const f = fixture(async (_, signal, report) => {
    if (++calls === 1) {
      oldSignal = signal
      reportOld = report
      return pending.promise
    }
    return video()
  })
  const old = f.controller.start(f.input)
  f.controller.clear()
  expect(oldSignal.aborted).toBe(true)
  expect(f.disposals()).toBe(1)
  await f.controller.start(f.input)
  reportOld({ stage: 'render', progress: 20 })
  pending.resolve(video())
  await old
  expect(f.controller.getSnapshot().work.progress).toBe(100)
  expect(f.controller.getSnapshot().result.url).toBe('blob:1')
  f.controller.dispose()
  expect(f.timers.size).toBe(0)
  expect(f.controller.getSnapshot().result).toBeNull()
})
