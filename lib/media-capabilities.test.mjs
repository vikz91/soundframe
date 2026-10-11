import { afterEach, beforeEach, expect, test } from 'bun:test'
import { checkMediaCapabilities } from './media-capabilities'

const original = {
  FileReader: globalThis.FileReader,
  document: globalThis.document,
  AudioContext: globalThis.AudioContext,
  Worker: globalThis.Worker,
  CSS: globalThis.CSS
}
const originalRevoke = URL.revokeObjectURL
let workers, revoked, blocked, hold
class MockWorker {
  constructor() {
    if (blocked) throw new Error('CSP blocked')
    workers.push(this)
    if (!hold) queueMicrotask(() => this.onmessage?.({ data: 'ready' }))
  }
  terminate() {
    this.terminated = true
  }
}
beforeEach(() => {
  workers = []
  revoked = []
  blocked = false
  hold = false
  globalThis.FileReader = class {}
  globalThis.AudioContext = class {}
  globalThis.Worker = MockWorker
  globalThis.document = { createElement: () => ({ getContext: () => ({ roundRect() {} }) }), fonts: { load() {} } }
  globalThis.CSS = { supports() {} }
  URL.revokeObjectURL = (url) => {
    revoked.push(url)
    originalRevoke(url)
  }
})
afterEach(() => {
  Object.assign(globalThis, original)
  URL.revokeObjectURL = originalRevoke
})

test('single-thread capabilities pass without shared memory and release their worker and URL', async () => {
  const result = await checkMediaCapabilities()
  expect(result).toEqual({ supported: true, issues: [] })
  expect(workers[0].terminated).toBe(true)
  expect(workers[0].onmessage).toBeNull()
  expect(revoked).toHaveLength(1)
})

test('missing canvas and Web Audio and blocked workers produce actionable issues', async () => {
  globalThis.document = { createElement: () => ({ getContext: () => null }), fonts: { load() {} } }
  globalThis.AudioContext = undefined
  blocked = true
  const result = await checkMediaCapabilities()
  expect(result.supported).toBe(false)
  expect(result.issues).toHaveLength(3)
  expect(result.issues.join(' ')).toContain('Try')
  expect(result.issues.join(' ')).toContain('workers are blocked')
  expect(revoked).toHaveLength(1)
})

test('aborting pending capabilities terminates the worker, revokes the URL, and rejects cancellation', async () => {
  hold = true
  const controller = new AbortController()
  const checking = checkMediaCapabilities(controller.signal)
  while (!workers.length) await new Promise((resolve) => setTimeout(resolve, 0))
  controller.abort()
  await expect(checking).rejects.toHaveProperty('name', 'AbortError')
  expect(workers[0].terminated).toBe(true)
  expect(revoked).toHaveLength(1)
})

test('painter and font APIs are checked before preview to prevent animation-time failures', async () => {
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) }
  globalThis.CSS = undefined
  const result = await checkMediaCapabilities()
  expect(result.supported).toBe(false)
  expect(result.issues).toHaveLength(3)
  expect(result.issues.join(' ')).toContain('Rounded Canvas')
  expect(result.issues.join(' ')).toContain('font loading')
  expect(result.issues.join(' ')).toContain('color support')
})
