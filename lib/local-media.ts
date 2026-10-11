import { loadImage, readFile } from './browser-files'

// Conservative allocation bounds; these are provisional until physical device testing.
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024
export const MAX_ARTWORK_BYTES = 12 * 1024 * 1024
export const MAX_ARTWORK_PIXELS = 16_000_000
export const MAX_ARTWORK_SIDE = 8192
export const MAX_AUDIO_SECONDS = 420
export type LocalAudio = { name: string; url: string; size: number; duration: number }
export type LocalArtwork = { image: HTMLImageElement; name: string; width: number; height: number }

function text(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}
function invalidAudio(): never {
  throw new Error('This file does not contain valid MP3, WAV, M4A, or MP4 audio. Choose another file.')
}
function boxes(bytes: Uint8Array, start: number, end: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const result: { type: string; start: number; end: number }[] = []
  for (let offset = start; offset < end;) {
    if (offset + 8 > end) invalidAudio()
    let size = view.getUint32(offset)
    let header = 8
    if (size === 1) {
      if (offset + 16 > end) invalidAudio()
      size = view.getUint32(offset + 8) * 2 ** 32 + view.getUint32(offset + 12)
      header = 16
    } else if (size === 0) size = end - offset
    if (!Number.isSafeInteger(size) || size < header || offset + size > end) invalidAudio()
    result.push({ type: text(bytes, offset + 4, 4), start: offset + header, end: offset + size })
    offset += size
  }
  return result
}

/** Content signatures establish the container; browser decoding establishes playable audio. */
export function validateAudioContent(bytes: Uint8Array, extension: string) {
  if (extension === 'wav') {
    if (text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 4) !== 'WAVE' || bytes.length < 12) invalidAudio()
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const end = view.getUint32(4, true) + 8
    if (end > bytes.length || end < 12) invalidAudio()
    let format = false,
      data = false
    for (let offset = 12; offset + 8 <= end;) {
      const size = view.getUint32(offset + 4, true)
      if (offset + 8 + size > end) invalidAudio()
      const type = text(bytes, offset, 4)
      if (type === 'fmt ' && size >= 16) format = true
      if (type === 'data' && size > 0) data = true
      offset += 8 + size + (size % 2)
    }
    if (!format || !data) invalidAudio()
    return 'audio/wav'
  }
  if (extension === 'mp3') {
    let start = 0
    if (text(bytes, 0, 3) === 'ID3') {
      if (bytes.length < 10 || bytes.subarray(6, 10).some((byte) => byte > 127)) invalidAudio()
      start = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9])
      if (bytes[5] & 16) start += 10
    }
    for (let offset = start; offset + 4 <= Math.min(bytes.length, start + 4096); offset++) {
      const version = (bytes[offset + 1] >> 3) & 3
      const layer = (bytes[offset + 1] >> 1) & 3
      const bitrate = bytes[offset + 2] >> 4
      const rate = (bytes[offset + 2] >> 2) & 3
      if (
        bytes[offset] === 255 &&
        (bytes[offset + 1] & 224) === 224 &&
        version !== 1 &&
        layer !== 0 &&
        bitrate > 0 &&
        bitrate < 15 &&
        rate !== 3
      )
        return 'audio/mpeg'
    }
    invalidAudio()
  }
  if (extension !== 'm4a' && extension !== 'mp4') invalidAudio()
  const top = boxes(bytes, 0, bytes.length)
  if (!top.some((box) => box.type === 'ftyp' && box.end - box.start >= 8)) invalidAudio()
  const movie = top.find((box) => box.type === 'moov')
  if (!movie) invalidAudio()
  const tracks = boxes(bytes, movie.start, movie.end).filter((box) => box.type === 'trak')
  const hasAudio = tracks.some((track) => {
    const media = boxes(bytes, track.start, track.end).find((box) => box.type === 'mdia')
    if (!media) return false
    return boxes(bytes, media.start, media.end).some(
      (box) => box.type === 'hdlr' && box.end - box.start >= 12 && text(bytes, box.start + 8, 4) === 'soun'
    )
  })
  if (!hasAudio) throw new Error('This MP4 has no audio track. Choose a file that contains audio.')
  return 'audio/mp4'
}

/** Bound PCM allocation using the audio stream's media header, never the video's duration. */
function mp4AudioDuration(bytes: Uint8Array): number | undefined {
  const movie = boxes(bytes, 0, bytes.length).find((box) => box.type === 'moov')
  if (!movie) return undefined
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (const track of boxes(bytes, movie.start, movie.end).filter((box) => box.type === 'trak')) {
    const media = boxes(bytes, track.start, track.end).find((box) => box.type === 'mdia')
    if (!media) continue
    const children = boxes(bytes, media.start, media.end)
    if (
      !children.some(
        (box) => box.type === 'hdlr' && box.end - box.start >= 12 && text(bytes, box.start + 8, 4) === 'soun'
      )
    )
      continue
    const header = children.find((box) => box.type === 'mdhd')
    if (!header) return undefined
    const version = bytes[header.start]
    const length = version === 1 ? 32 : 20
    if ((version !== 0 && version !== 1) || header.end - header.start < length) invalidAudio()
    const timescale = view.getUint32(header.start + (version === 1 ? 20 : 12))
    const high = version === 1 ? view.getUint32(header.start + 24) : 0
    const low = view.getUint32(header.start + (version === 1 ? 28 : 16))
    if (!timescale) invalidAudio()
    // Fragmented streams may declare an unknown/zero duration; full decode validates those.
    if ((version === 0 && low === 0xffffffff) || (high === 0xffffffff && low === 0xffffffff)) return undefined
    const duration = (high * 2 ** 32 + low) / timescale
    return duration > 0 ? duration : undefined
  }
  return undefined
}

export function validateAudioDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error('This file has no playable audio. Choose another file.')
  if (duration > MAX_AUDIO_SECONDS) throw new Error('Choose a track that is 7 minutes or shorter.')
  return duration
}

function readAudioMetadata(url: string, signal: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    signal.throwIfAborted()
    const element = document.createElement('audio')
    const cleanup = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      element.onloadedmetadata = null
      element.onerror = null
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
    const fail = (error: unknown) => {
      cleanup()
      reject(error)
    }
    const abort = () => fail(new DOMException('Audio validation cancelled.', 'AbortError'))
    element.onloadedmetadata = () => {
      try {
        const duration = validateAudioDuration(element.duration)
        cleanup()
        resolve(duration)
      } catch (error) {
        fail(error)
      }
    }
    element.onerror = () => fail(new Error('Your browser cannot play this audio. Try an MP3 or WAV file.'))
    signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(
      () => fail(new Error('Audio validation timed out. Try a smaller MP3 or WAV file.')),
      20_000
    )
    element.preload = 'metadata'
    element.src = url
  })
}

async function decodeAudio(bytes: ArrayBuffer, signal: AbortSignal) {
  signal.throwIfAborted()
  if (typeof AudioContext === 'undefined')
    throw new Error('This browser cannot decode audio. Try a current desktop browser.')
  const context = new AudioContext()
  let abort: () => void = () => {}
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    // decodeAudioData extracts only audio from an MP4; video frames are never decoded.
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(new DOMException('Audio decoding cancelled.', 'AbortError'))
      signal.addEventListener('abort', abort, { once: true })
      timeout = setTimeout(() => reject(new Error('Audio decoding timed out. Try a smaller MP3 or WAV file.')), 30_000)
    })
    const audio = await Promise.race([context.decodeAudioData(bytes), cancelled])
    signal.throwIfAborted()
    if (!audio.numberOfChannels || !audio.length)
      throw new Error('This file has no playable audio. Choose another file.')
    return validateAudioDuration(audio.duration)
  } catch (error) {
    if (signal.aborted || error instanceof Error) {
      if (signal.aborted) signal.throwIfAborted()
      if (error instanceof Error && /7 minutes|timed out|no playable/.test(error.message)) throw error
    }
    throw new Error('Your browser cannot decode this audio. Try an MP3 or WAV file.')
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
    await context.close().catch(() => {})
  }
}

export async function readAudioFile(file: File, signal: AbortSignal): Promise<LocalAudio> {
  signal.throwIfAborted()
  if (!/\.(mp3|wav|m4a|mp4)$/i.test(file.name)) throw new Error('Choose an MP3, WAV, M4A, or MP4 audio file.')
  if (!file.size) throw new Error('This file is empty. Choose another audio file.')
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Choose an audio file smaller than 64 MB for browser processing.')
  const bytes = await readFile(file, 'arrayBuffer', signal)
  signal.throwIfAborted()
  const mimeType = validateAudioContent(new Uint8Array(bytes), file.name.split('.').at(-1)!.toLowerCase())
  if (mimeType === 'audio/mp4') {
    const duration = mp4AudioDuration(new Uint8Array(bytes))
    // mdhd measures encoded samples and can include AAC priming/trailing padding.
    // Keep this an allocation guard with bounded headroom; decoded audio remains strictly <=420s.
    if (duration !== undefined && duration > MAX_AUDIO_SECONDS + 1)
      throw new Error('Choose a track that is 7 minutes or shorter.')
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
  try {
    // MP4 container duration may include longer video. Validate only its decoded audio below.
    // For standalone MP3/WAV, reject unreasonable duration before allocating decoded PCM.
    if (mimeType !== 'audio/mp4') await readAudioMetadata(url, signal)
    const duration = await decodeAudio(bytes, signal)
    signal.throwIfAborted()
    return { name: file.name, url, size: file.size, duration }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

export function releaseAudioFile(track: LocalAudio) {
  URL.revokeObjectURL(track.url)
}

function artworkDimensions(bytes: Uint8Array, extension: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (extension === 'png') {
    if (
      bytes.length < 33 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) ||
      text(bytes, 12, 4) !== 'IHDR' ||
      view.getUint32(8) !== 13
    )
      throw new Error('This file is not a valid PNG image.')
    return { width: view.getUint32(16), height: view.getUint32(20), mime: 'image/png' }
  }
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) throw new Error('This file is not a valid JPG image.')
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset] !== 255) break
    while (bytes[offset] === 255) offset++
    const marker = bytes[offset++]
    if (marker === 217 || marker === 218) break
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue
    if (offset + 2 > bytes.length) break
    const length = view.getUint16(offset)
    if (length < 2 || offset + length > bytes.length) break
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 8) {
      return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3), mime: 'image/jpeg' }
    }
    offset += length
  }
  throw new Error('This JPG image is corrupt or unsupported. Choose another file.')
}

function validateArtworkDimensions(width: number, height: number) {
  if (!width || !height || width > MAX_ARTWORK_SIDE || height > MAX_ARTWORK_SIDE || width * height > MAX_ARTWORK_PIXELS)
    throw new Error('Choose artwork up to 16 megapixels with no side larger than 8192 pixels.')
}

export async function readArtworkFile(file: File, signal: AbortSignal): Promise<LocalArtwork> {
  signal.throwIfAborted()
  if (!/\.(jpe?g|png)$/i.test(file.name)) throw new Error('Choose a JPG or PNG image.')
  if (!file.size) throw new Error('This image is empty. Choose another file.')
  if (file.size > MAX_ARTWORK_BYTES) throw new Error('Choose a JPG or PNG smaller than 12 MB.')
  const bytes = await readFile(file, 'arrayBuffer', signal)
  signal.throwIfAborted()
  const dimensions = artworkDimensions(new Uint8Array(bytes), file.name.split('.').at(-1)!.toLowerCase())
  validateArtworkDimensions(dimensions.width, dimensions.height)
  const url = URL.createObjectURL(new Blob([bytes], { type: dimensions.mime }))
  let image: HTMLImageElement | undefined
  try {
    image = await loadImage(url, signal)
    signal.throwIfAborted()
    validateArtworkDimensions(image.naturalWidth, image.naturalHeight)
    const matches = image.naturalWidth === dimensions.width && image.naturalHeight === dimensions.height
    // Browsers apply JPEG EXIF orientation; quarter-turn images swap the encoded frame dimensions.
    const rotatedJPEG =
      dimensions.mime === 'image/jpeg' &&
      image.naturalWidth === dimensions.height &&
      image.naturalHeight === dimensions.width
    if (!matches && !rotatedJPEG) throw new Error('This image has inconsistent dimensions. Choose another file.')
    return { image, name: file.name, width: image.naturalWidth, height: image.naturalHeight }
  } catch (error) {
    if (image) image.src = ''
    throw error
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function releaseArtworkFile(artwork: LocalArtwork) {
  artwork.image.src = ''
}
