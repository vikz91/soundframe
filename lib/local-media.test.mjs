import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  MAX_AUDIO_BYTES,
  MAX_ARTWORK_BYTES,
  readAudioFile,
  readArtworkFile,
  releaseAudioFile,
  releaseArtworkFile,
  validateAudioContent,
  validateAudioDuration
} from './local-media'

const original = {
  FileReader: globalThis.FileReader,
  Image: globalThis.Image,
  document: globalThis.document,
  AudioContext: globalThis.AudioContext
}
let contexts,
  elements,
  images,
  readers,
  duration,
  decodedDuration,
  decodeFails,
  holdDecode,
  finishDecode,
  imageFails,
  holdImage,
  imageWidth,
  imageHeight,
  revoked
const originalRevoke = URL.revokeObjectURL
class MockReader {
  constructor() {
    readers.push(this)
  }
  readAsArrayBuffer(file) {
    file.arrayBuffer().then((bytes) => {
      this.result = bytes
      this.onload?.()
    })
  }
  abort() {
    this.onabort?.()
  }
}
class MockContext {
  closed = false
  constructor() {
    contexts.push(this)
  }
  decodeAudioData() {
    if (decodeFails) return Promise.reject(new Error('Decode error'))
    if (holdDecode) return new Promise((resolve) => (finishDecode = resolve))
    return Promise.resolve({ duration: decodedDuration, numberOfChannels: 2, length: 100 })
  }
  close() {
    this.closed = true
    return Promise.resolve()
  }
}
class MockImage {
  naturalWidth = 2
  naturalHeight = 3
  constructor() {
    this.naturalWidth = imageWidth
    this.naturalHeight = imageHeight
    images.push(this)
  }
  set src(value) {
    this.source = value
    if (value && !holdImage) queueMicrotask(() => (imageFails ? this.onerror?.() : this.onload?.()))
  }
  get src() {
    return this.source
  }
}
function mp3() {
  return new Uint8Array([255, 251, 144, 0, 0, 0, 0, 0])
}
function png(width = 2, height = 3) {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}
function box(type, ...parts) {
  const size = 8 + parts.reduce((total, part) => total + part.length, 0)
  const bytes = new Uint8Array(size)
  new DataView(bytes.buffer).setUint32(0, size)
  bytes.set(new TextEncoder().encode(type), 4)
  let offset = 8
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}
function mp4(handler = 'soun') {
  const header = new Uint8Array(12)
  header.set(new TextEncoder().encode(handler), 8)
  const parts = [box('ftyp', new Uint8Array(8)), box('moov', box('trak', box('mdia', box('hdlr', header))))]
  return new Uint8Array([...parts[0], ...parts[1]])
}
function wav() {
  const bytes = new Uint8Array(46)
  const view = new DataView(bytes.buffer)
  for (const [offset, value] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data']
  ])
    bytes.set(new TextEncoder().encode(value), offset)
  view.setUint32(4, 38, true)
  view.setUint32(16, 16, true)
  view.setUint32(40, 2, true)
  return bytes
}
beforeEach(() => {
  contexts = []
  elements = []
  images = []
  readers = []
  revoked = []
  duration = 20
  decodedDuration = 20
  decodeFails = false
  holdDecode = false
  finishDecode = undefined
  imageFails = false
  holdImage = false
  imageWidth = 2
  imageHeight = 3
  globalThis.FileReader = MockReader
  globalThis.AudioContext = MockContext
  globalThis.Image = MockImage
  globalThis.document = {
    createElement() {
      const element = {
        duration,
        stopped: false,
        unloaded: false,
        set src(url) {
          this.source = url
          queueMicrotask(() => this.onloadedmetadata?.())
        },
        pause() {
          this.stopped = true
        },
        removeAttribute() {
          this.source = ''
        },
        load() {
          this.unloaded = true
        }
      }
      elements.push(element)
      return element
    }
  }
  URL.revokeObjectURL = (url) => {
    revoked.push(url)
    originalRevoke(url)
  }
})
afterEach(() => {
  Object.assign(globalThis, original)
  URL.revokeObjectURL = originalRevoke
})

test('audio container signatures reject renamed garbage, truncated containers, and silent MP4 video', () => {
  for (const extension of ['mp3', 'wav', 'm4a', 'mp4'])
    expect(() => validateAudioContent(new Uint8Array([1, 2, 3]), extension)).toThrow('valid')
  expect(validateAudioContent(mp3(), 'mp3')).toBe('audio/mpeg')
  expect(validateAudioContent(wav(), 'wav')).toBe('audio/wav')
  expect(validateAudioContent(mp4(), 'm4a')).toBe('audio/mp4')
  expect(() => validateAudioContent(mp4('vide'), 'mp4')).toThrow('no audio track')
  expect(() => validateAudioContent(mp4().subarray(0, 15), 'mp4')).toThrow('valid')
  expect(() => validateAudioContent(new TextEncoder().encode('ID3'), 'mp3')).toThrow('valid')
})

test('duration accepts the exact boundary and rejects zero, non-finite, and excessive values', () => {
  expect(validateAudioDuration(420)).toBe(420)
  for (const value of [0, -1, NaN, Infinity]) expect(() => validateAudioDuration(value)).toThrow('no playable')
  expect(() => validateAudioDuration(420.001)).toThrow('7 minutes')
})

test('accepted audio has decoded duration, canonical MIME, and an explicitly releasable URL', async () => {
  decodedDuration = 19
  const track = await readAudioFile(new File([mp3()], 'song.MP3', { type: 'text/plain' }), new AbortController().signal)
  expect(track.duration).toBe(19)
  expect((await fetch(track.url)).headers.get('content-type')).toBe('audio/mpeg')
  expect(contexts[0].closed).toBe(true)
  expect(elements[0].stopped && elements[0].unloaded).toBe(true)
  expect(elements[0].onloadedmetadata).toBeNull()
  releaseAudioFile(track)
  await expect(fetch(track.url)).rejects.toThrow()
})

test('metadata bounds reject before PCM decoding, and failed decoding revokes the URL and closes context', async () => {
  duration = 421
  await expect(readAudioFile(new File([mp3()], 'x.mp3'), new AbortController().signal)).rejects.toThrow('7 minutes')
  expect(contexts).toHaveLength(0)
  expect(revoked).toHaveLength(1)
  duration = 20
  decodeFails = true
  await expect(readAudioFile(new File([mp3()], 'x.mp3'), new AbortController().signal)).rejects.toThrow('cannot decode')
  expect(contexts[0].closed).toBe(true)
  expect(revoked).toHaveLength(2)
})

test('cancelling a pending decoder closes context, revokes URL, and ignores late decode result', async () => {
  holdDecode = true
  const controller = new AbortController()
  const loading = readAudioFile(new File([mp3()], 'x.mp3'), controller.signal)
  while (!finishDecode) await new Promise((resolve) => setTimeout(resolve, 0))
  controller.abort()
  await expect(loading).rejects.toHaveProperty('name', 'AbortError')
  expect(contexts[0].closed).toBe(true)
  expect(revoked).toHaveLength(1)
  finishDecode({ duration: 20, numberOfChannels: 2, length: 100 })
})

test('byte bounds reject before creating readers', async () => {
  const signal = new AbortController().signal
  await expect(readAudioFile({ name: 'x.mp3', size: MAX_AUDIO_BYTES + 1 }, signal)).rejects.toThrow('64 MB')
  await expect(readArtworkFile({ name: 'x.png', size: MAX_ARTWORK_BYTES + 1 }, signal)).rejects.toThrow('12 MB')
  expect(readers).toHaveLength(0)
})

test('artwork rejects fake signatures and excessive dimensions before creating an image', async () => {
  const signal = new AbortController().signal
  await expect(readArtworkFile(new File(['garbage'], 'x.png'), signal)).rejects.toThrow('valid PNG')
  await expect(readArtworkFile(new File(['garbage'], 'x.jpg'), signal)).rejects.toThrow('valid JPG')
  await expect(readArtworkFile(new File([png(8193, 2)], 'x.png'), signal)).rejects.toThrow('16 megapixels')
  await expect(readArtworkFile(new File([png(8000, 8000)], 'x.png'), signal)).rejects.toThrow('16 megapixels')
  expect(images).toHaveLength(0)
})

test('artwork requires successful decode and consistent dimensions, then releases URLs and decoded source', async () => {
  const signal = new AbortController().signal
  const artwork = await readArtworkFile(new File([png()], 'x.png'), signal)
  expect(artwork.width).toBe(2)
  expect(artwork.height).toBe(3)
  expect(revoked).toHaveLength(1)
  releaseArtworkFile(artwork)
  expect(artwork.image.src).toBe('')
  imageFails = true
  await expect(readArtworkFile(new File([png()], 'x.png'), signal)).rejects.toThrow('cannot be opened')
  expect(revoked).toHaveLength(2)
  expect(images[1].src).toBe('')
})

test('MP4 uses decoded audio duration even when its video duration exceeds seven minutes', async () => {
  duration = 800
  decodedDuration = 30
  const track = await readAudioFile(new File([mp4()], 'movie.mp4'), new AbortController().signal)
  expect(track.duration).toBe(30)
  expect(elements).toHaveLength(0)
  expect(contexts[0].closed).toBe(true)
  releaseAudioFile(track)
  decodedDuration = 421
  await expect(readAudioFile(new File([mp4()], 'movie.mp4'), new AbortController().signal)).rejects.toThrow('7 minutes')
  expect(contexts[1].closed).toBe(true)
})

test('JPG validates its frame dimensions and succeeds only after browser decoding', async () => {
  const jpeg = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 3, 0, 2, 1, 255, 217])
  const artwork = await readArtworkFile(new File([jpeg], 'cover.JPG'), new AbortController().signal)
  expect(artwork.width).toBe(2)
  expect(artwork.height).toBe(3)
  releaseArtworkFile(artwork)
})

test('decoded artwork dimension mismatch releases the image and URL', async () => {
  imageWidth = 4
  await expect(readArtworkFile(new File([png()], 'cover.png'), new AbortController().signal)).rejects.toThrow(
    'inconsistent'
  )
  expect(images[0].src).toBe('')
  expect(revoked).toHaveLength(1)
})

test('artwork cancellation detaches image handlers, clears source, and revokes its URL', async () => {
  holdImage = true
  const controller = new AbortController()
  const loading = readArtworkFile(new File([png()], 'cover.png'), controller.signal)
  while (!images.length) await new Promise((resolve) => setTimeout(resolve, 0))
  controller.abort()
  await expect(loading).rejects.toHaveProperty('name', 'AbortError')
  expect(images[0].src).toBe('')
  expect(images[0].onload).toBeNull()
  expect(revoked).toHaveLength(1)
})

test('MP4 overlong audio media header is rejected before allocating a decode context', async () => {
  const handler = new Uint8Array(12)
  handler.set(new TextEncoder().encode('soun'), 8)
  const header = new Uint8Array(24)
  const view = new DataView(header.buffer)
  view.setUint32(12, 48_000)
  view.setUint32(16, 422 * 48_000)
  const ftyp = box('ftyp', new Uint8Array(8))
  const movie = box('moov', box('trak', box('mdia', box('hdlr', handler), box('mdhd', header))))
  const file = new File([ftyp, movie], 'too-long.mp4')
  await expect(readAudioFile(file, new AbortController().signal)).rejects.toThrow('7 minutes')
  expect(contexts).toHaveLength(0)
  expect(elements).toHaveLength(0)
})

test('JPG accepts browser EXIF quarter-turn dimensions while PNG mismatches are rejected', async () => {
  imageWidth = 3
  imageHeight = 2
  const jpeg = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 3, 0, 2, 1, 255, 217])
  const artwork = await readArtworkFile(new File([jpeg], 'portrait.jpg'), new AbortController().signal)
  expect(artwork.width).toBe(3)
  expect(artwork.height).toBe(2)
  releaseArtworkFile(artwork)
  await expect(readArtworkFile(new File([png()], 'portrait.png'), new AbortController().signal)).rejects.toThrow(
    'inconsistent'
  )
})

test('MP4 encoded-sample padding passes preflight but decoded duration stays strictly bounded', async () => {
  const handler = new Uint8Array(12)
  handler.set(new TextEncoder().encode('soun'), 8)
  const header = new Uint8Array(24)
  const view = new DataView(header.buffer)
  view.setUint32(12, 48_000)
  view.setUint32(16, 420 * 48_000 + 2048)
  const ftyp = box('ftyp', new Uint8Array(8))
  const movie = box('moov', box('trak', box('mdia', box('hdlr', handler), box('mdhd', header))))
  const file = new File([ftyp, movie], 'seven-minutes.m4a')
  decodedDuration = 420
  const track = await readAudioFile(file, new AbortController().signal)
  expect(track.duration).toBe(420)
  expect(contexts[0].closed).toBe(true)
  releaseAudioFile(track)
  decodedDuration = 420.001
  await expect(readAudioFile(file, new AbortController().signal)).rejects.toThrow('7 minutes')
  expect(contexts[1].closed).toBe(true)
})
