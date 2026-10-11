import { expect, test } from 'bun:test'
import { createLocalFileLoader } from './local-file'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('replacement aborts the prior load and releases its late result without replacing the selected file', async () => {
  const pending = deferred()
  const released = []
  let firstSignal
  const loader = createLocalFileLoader(
    (file, signal) => {
      if (file.name === 'first.wav') {
        firstSignal = signal
        return pending.promise
      }
      return Promise.resolve({ name: file.name })
    },
    (value) => released.push(value.name)
  )
  const first = loader.select(new File(['a'], 'first.wav'))
  await loader.select(new File(['b'], 'second.wav'))
  expect(firstSignal.aborted).toBe(true)
  pending.resolve({ name: 'first.wav' })
  await first
  expect(loader.getSnapshot()).toEqual({ value: { name: 'second.wav' }, reading: false, error: null })
  expect(released).toEqual(['first.wav'])
  loader.clear()
  loader.clear()
  expect(released).toEqual(['first.wav', 'second.wav'])
})

test('cancellation clears reading and ignores a late failure; a new selection can succeed', async () => {
  const pending = deferred()
  const loader = createLocalFileLoader((file) =>
    file.name === 'old.png' ? pending.promise : Promise.resolve(file.name)
  )
  const reading = loader.select(new File(['a'], 'old.png'))
  expect(loader.getSnapshot().reading).toBe(true)
  loader.clear()
  pending.reject(new Error('Old read failed'))
  await reading
  expect(loader.getSnapshot()).toEqual({ value: null, reading: false, error: null })
  await loader.select(new File(['b'], 'new.png'))
  expect(loader.getSnapshot().value).toBe('new.png')
})

test('validation failure clears the previous file and error is reset by a successful selection', async () => {
  const released = []
  const loader = createLocalFileLoader(
    async (file) => {
      if (!file.size) throw new Error('Empty file')
      return file.name
    },
    (value) => released.push(value)
  )
  await loader.select(new File(['a'], 'cover.png'))
  await loader.select(new File([], 'empty.png'))
  expect(released).toEqual(['cover.png'])
  expect(loader.getSnapshot()).toEqual({ value: null, reading: false, error: 'Empty file' })
  await loader.select(new File(['b'], 'cover.png'))
  expect(loader.getSnapshot()).toEqual({ value: 'cover.png', reading: false, error: null })
})

test('subscriptions observe updates and detach; snapshots remain stable between updates', async () => {
  const loader = createLocalFileLoader(async () => 'ready')
  const initial = loader.getSnapshot()
  expect(loader.getSnapshot()).toBe(initial)
  expect(loader.getServerSnapshot()).toBe(initial)
  const states = []
  const unsubscribe = loader.subscribe(() => states.push(loader.getSnapshot()))
  await loader.select(new File(['a'], 'track.wav'))
  expect(states.map((state) => state.reading)).toEqual([false, true, false])
  unsubscribe()
  loader.clear()
  expect(states).toHaveLength(3)
  expect(loader.getSnapshot()).toBe(initial)
})
