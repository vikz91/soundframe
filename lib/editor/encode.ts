import { ffmpegClient, type FFmpegSession } from '@/lib/ffmpeg'
import { compositionSize, renderComposition, type CompositionSnapshot } from './composition'
import { analysisSampleRate, createOfflineAnalysis } from './offline-analysis'
import { videoSizes, type VideoResolution } from './resolution'
import { needsAudioAnalysis } from './types'

export const encodingLimits = {
  batchFrames: 30,
  frameBytes: 568 * 320 * 4,
  maxFrameBatchBytes: 568 * 320 * 4 * 30,
  maxPartsBytes: 64 * 1024 * 1024,
  maxOutputBytes: 80 * 1024 * 1024,
  maxPcmBytes: 421 * analysisSampleRate * 4
} as const
export type EncodingProgress = { stage: 'prepare' | 'render' | 'finalise'; progress: number; etaSeconds?: number }

export function frameBatches(duration: number, resolution: VideoResolution = '320p') {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 420) throw new Error('Choose audio up to 7 minutes.')
  const total = Math.ceil(duration * compositionSize.fps)
  const { width, height } = videoSizes[resolution]
  const batchFrames = Math.min(
    encodingLimits.batchFrames,
    Math.floor(encodingLimits.maxFrameBatchBytes / (width * height * 4))
  )
  return Array.from({ length: Math.ceil(total / batchFrames) }, (_, index) => ({
    start: index * batchFrames,
    count: Math.min(batchFrames, total - index * batchFrames)
  }))
}

// Five-frame 720p batches repeat keyframes more often; compress them more strongly
// to retain the same encoded-storage guard for full-length exports.
const videoOptions = (format: 'mp4' | 'webm', resolution: VideoResolution) =>
  format === 'mp4'
    ? [
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        resolution === '720p' ? '30' : '23',
        '-pix_fmt',
        'yuv420p',
        '-bf',
        '0',
        '-g',
        '30'
      ]
    : ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '1000k', '-pix_fmt', 'yuv420p', '-g', '30']

/** Await each transfer/encode before producing the next memory-bounded RGBA batch. */
export async function encodeFrames(
  session: FFmpegSession,
  snapshot: CompositionSnapshot,
  duration: number,
  signal: AbortSignal,
  context: CanvasRenderingContext2D,
  analysis: ReturnType<typeof createOfflineAnalysis> | null,
  report: (value: EncodingProgress) => void
) {
  const { width, height } = videoSizes[snapshot.preferences.resolution]
  const frameBytes = width * height * 4
  const batches = frameBatches(duration, snapshot.preferences.resolution)
  const total = Math.ceil(duration * 30)
  const format = snapshot.preferences.format
  const parts: string[] = []
  let partsBytes = 0
  const started = performance.now()
  for (const batch of batches) {
    signal.throwIfAborted()
    let frames: Uint8Array | null = new Uint8Array(frameBytes * batch.count)
    for (let offset = 0; offset < batch.count; offset++) {
      const frameIndex = batch.start + offset
      renderComposition(context, snapshot, { frameIndex, analysis: analysis?.(frameIndex) })
      frames.set(context.getImageData(0, 0, width, height).data, offset * frameBytes)
      // Yield for cancellation/UI even when the tab's animation clock is paused.
      if (offset % 5 === 4) await new Promise<void>((resolve) => setTimeout(resolve, 0))
      signal.throwIfAborted()
    }
    await session.write('frames.rgba', frames)
    frames = null
    const part = `part-${parts.length}.${format}`
    await session.exec([
      '-f',
      'rawvideo',
      '-pixel_format',
      'rgba',
      '-video_size',
      `${width}x${height}`,
      '-framerate',
      '30',
      '-i',
      session.path('frames.rgba'),
      '-an',
      '-frames:v',
      String(batch.count),
      ...videoOptions(format, snapshot.preferences.resolution),
      '-fs',
      String(encodingLimits.maxPartsBytes - partsBytes + 1),
      '-y',
      session.path(part)
    ])
    await session.remove('frames.rgba')
    partsBytes += (await session.read(part)).length
    if (partsBytes > encodingLimits.maxPartsBytes)
      throw new Error('Video exceeded the 64 MiB working limit. Try a shorter track.')
    parts.push(part)
    const completed = batch.start + batch.count
    report({
      stage: 'render',
      progress: 5 + (completed / total) * 85,
      etaSeconds: ((performance.now() - started) / 1000 / completed) * (total - completed)
    })
  }
  // Container durations round short chunks. Use absolute frame boundaries instead,
  // rounding their difference to concat's microsecond clock so errors cannot accumulate.
  const manifest = parts.map((name, index) => {
    const batch = batches[index]
    const start = Math.round((batch.start * 1000000) / compositionSize.fps)
    const end = Math.round(((batch.start + batch.count) * 1000000) / compositionSize.fps)
    return `file '${name}'\nduration ${((end - start) / 1000000).toFixed(6)}`
  })
  await session.write('parts.txt', new TextEncoder().encode(manifest.join('\n')))
}

export async function encodeVideo({
  snapshot,
  audioURL,
  duration,
  signal,
  report
}: {
  snapshot: CompositionSnapshot
  audioURL: string
  duration: number
  signal: AbortSignal
  report: (value: EncodingProgress) => void
}) {
  signal.throwIfAborted()
  frameBatches(duration, snapshot.preferences.resolution)
  const cancel = () => ffmpegClient.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  const canvas = document.createElement('canvas')
  const { width, height } = videoSizes[snapshot.preferences.resolution]
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  try {
    if (!context) throw new Error('Canvas is unavailable for video rendering.')
    if (!audioURL.startsWith('blob:')) throw new Error('Select local audio before exporting.')
    report({ stage: 'prepare', progress: 0 })
    const audio = await (await fetch(audioURL, { signal })).blob()
    signal.throwIfAborted()
    const format = snapshot.preferences.format
    return await ffmpegClient.run({
      inputs: [{ name: 'soundtrack', data: audio }],
      output: { name: `output.${format}`, type: `video/${format}` },
      maxOutputBytes: encodingLimits.maxOutputBytes,
      process: async (session, { inputs, output }) => {
        let analysis: ReturnType<typeof createOfflineAnalysis> | null = null
        if (needsAudioAnalysis(snapshot.preferences)) {
          await session.exec([
            '-i',
            inputs[0],
            '-map',
            '0:a:0',
            '-vn',
            '-t',
            String(duration),
            '-ac',
            '1',
            '-ar',
            String(analysisSampleRate),
            '-f',
            'f32le',
            '-y',
            session.path('analysis.pcm')
          ])
          const pcm = await session.read('analysis.pcm')
          if (pcm.length > encodingLimits.maxPcmBytes || pcm.length % 4)
            throw new Error('Decoded audio exceeded the working memory limit.')
          await session.remove('analysis.pcm')
          analysis = createOfflineAnalysis(new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4))
        }
        report({ stage: 'render', progress: 5 })
        await encodeFrames(session, snapshot, duration, signal, context, analysis, report)
        analysis = null
        signal.throwIfAborted()
        report({ stage: 'finalise', progress: 90 })
        await session.exec(
          [
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            session.path('parts.txt'),
            '-i',
            inputs[0],
            '-map',
            '0:v:0',
            '-map',
            '1:a:0',
            '-c:v',
            'copy',
            '-c:a',
            format === 'mp4' ? 'aac' : 'opus',
            // core 0.12.10 libopus overflows its WASM stack on stereo input.
            ...(format === 'webm' ? ['-strict', 'experimental'] : []),
            '-b:a',
            '128k',
            '-ac',
            '2',
            '-ar',
            '48000',
            '-t',
            String(duration),
            '-fs',
            String(encodingLimits.maxOutputBytes + 1),
            ...(format === 'mp4' ? ['-movflags', '+faststart'] : []),
            '-y',
            output
          ],
          (value) => report({ stage: 'finalise', progress: 90 + value * 9 })
        )
      }
    })
  } finally {
    signal.removeEventListener('abort', cancel)
    canvas.width = 0
    canvas.height = 0
  }
}
