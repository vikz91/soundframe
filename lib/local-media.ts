import { loadImage, readFile } from './browser-files'

export type LocalAudio = { name: string; url: string; size: number }

export async function readAudioFile(file: File, signal: AbortSignal): Promise<LocalAudio> {
  if (!/\.(mp3|wav|m4a|mp4)$/i.test(file.name)) throw new Error('Choose an MP3, WAV, M4A, or MP4 audio file.')
  if (!file.size) throw new Error('This file is empty. Choose another audio file.')
  const bytes = await readFile(file, 'arrayBuffer', signal)
  signal.throwIfAborted()
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const mimeType = extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4'
  return {
    name: file.name,
    url: URL.createObjectURL(new Blob([bytes], { type: file.type || mimeType })),
    size: bytes.byteLength
  }
}

export function releaseAudioFile(track: LocalAudio) {
  URL.revokeObjectURL(track.url)
}

export async function readArtworkFile(file: File, signal: AbortSignal) {
  if (!/\.(jpe?g|png)$/i.test(file.name)) throw new Error('Choose a JPG or PNG image.')
  if (!file.size) throw new Error('This image is empty. Choose another file.')
  const src = await readFile(file, 'dataURL', signal)
  const image = await loadImage(src, signal)
  return { image, name: file.name }
}
