import { afterEach, beforeEach, expect, test } from 'bun:test'
import { downloadURL, loadImage, readFile } from './browser-files'
import { readAudioFile, readArtworkFile, releaseAudioFile } from './local-media'

const original = { FileReader: globalThis.FileReader, Image: globalThis.Image, document: globalThis.document }
let readers, images
class MockReader {
  result = null
  error = null
  aborted = false
  constructor() {
    readers.push(this)
  }
  readAsArrayBuffer() {}
  readAsDataURL() {}
  readAsText() {}
  abort() {
    this.aborted = true
    this.onabort?.()
  }
}
class MockImage {
  src = ''
  constructor() {
    images.push(this)
  }
}
beforeEach(() => {
  readers = []
  images = []
  globalThis.FileReader = MockReader
  globalThis.Image = MockImage
})
afterEach(() => {
  Object.assign(globalThis, original)
})

test('read cancellation aborts the reader and detaches handlers', async () => {
  const controller = new AbortController()
  const reading = readFile(new File(['x'], 'x.txt'), 'text', controller.signal)
  controller.abort()
  await expect(reading).rejects.toHaveProperty('name', 'AbortError')
  expect(readers[0].aborted).toBe(true)
  expect(readers[0].onload).toBeNull()
  expect(readers[0].onerror).toBeNull()
  expect(readers[0].onabort).toBeNull()
})

test('completed reads detach the abort listener and propagate read errors', async () => {
  const controller = new AbortController()
  const reading = readFile(new File(['x'], 'x.txt'), 'text', controller.signal)
  readers[0].result = 'lyrics'
  readers[0].onload()
  expect(await reading).toBe('lyrics')
  controller.abort()
  expect(readers[0].aborted).toBe(false)
  const failing = readFile(new File(['x'], 'x.txt'), 'text')
  readers[1].error = new Error('File unavailable')
  readers[1].onerror()
  await expect(failing).rejects.toThrow('File unavailable')
  expect(readers[1].onload).toBeNull()
})

test('pre-cancelled reads create no browser resources', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(readFile(new File(['x'], 'x.wav'), 'arrayBuffer', controller.signal)).rejects.toHaveProperty(
    'name',
    'AbortError'
  )
  await expect(loadImage('data:image/png;base64,x', controller.signal)).rejects.toHaveProperty('name', 'AbortError')
  expect(readers).toHaveLength(0)
  expect(images).toHaveLength(0)
})

test('image cancellation releases decoding handlers and source', async () => {
  const controller = new AbortController()
  const loading = loadImage('data:image/png;base64,x', controller.signal)
  controller.abort()
  await expect(loading).rejects.toHaveProperty('name', 'AbortError')
  expect(images[0].src).toBe('')
  expect(images[0].onload).toBeNull()
  expect(images[0].onerror).toBeNull()
})

test('audio and artwork reject unsupported or empty files before reading', async () => {
  const signal = new AbortController().signal
  await expect(readAudioFile(new File(['x'], 'x.txt'), signal)).rejects.toThrow('Choose an MP3')
  await expect(readAudioFile(new File([], 'x.wav'), signal)).rejects.toThrow('empty')
  await expect(readArtworkFile(new File(['x'], 'x.gif'), signal)).rejects.toThrow('Choose a JPG')
  await expect(readArtworkFile(new File([], 'x.png'), signal)).rejects.toThrow('empty')
  expect(readers).toHaveLength(0)
})

test('audio uses a playable MIME fallback and its URL can be released', async () => {
  const loading = readAudioFile(new File(['x'], 'track.MP3'), new AbortController().signal)
  readers[0].result = new Uint8Array([1, 2, 3]).buffer
  readers[0].onload()
  const track = await loading
  const response = await fetch(track.url)
  expect(response.headers.get('content-type')).toBe('audio/mpeg')
  expect(track.size).toBe(3)
  releaseAudioFile(track)
  await expect(fetch(track.url)).rejects.toThrow()
})

test('artwork finishes only after decoding; corrupt images report a useful error', async () => {
  const loading = readArtworkFile(new File(['x'], 'cover.png'), new AbortController().signal)
  readers[0].result = 'data:image/png;base64,x'
  readers[0].onload()
  await Promise.resolve()
  images[0].onerror()
  await expect(loading).rejects.toThrow('This image cannot be opened')
  expect(images[0].onload).toBeNull()
})

test('download links are removed even if clicking fails', () => {
  let appended = false,
    removed = false
  const link = {
    click() {
      throw new Error('Click failed')
    },
    remove() {
      removed = true
    }
  }
  globalThis.document = {
    createElement: () => link,
    body: {
      append: () => {
        appended = true
      }
    }
  }
  expect(() => downloadURL('blob:example', 'cover.png')).toThrow('Click failed')
  expect(appended).toBe(true)
  expect(removed).toBe(true)
  expect(link.download).toBe('cover.png')
})
