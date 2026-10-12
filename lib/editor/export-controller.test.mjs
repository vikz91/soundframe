import { expect, test } from 'bun:test'
import { createVideoExportController, videoLifetime } from './export-controller'
import { defaultEditorPreferences } from './types'

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
  const input = { preferences: defaultEditorPreferences(), artwork: {}, audioURL: 'blob:audio', duration: 1.25 }
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
  expect(captured.details.title).toBe('')
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
