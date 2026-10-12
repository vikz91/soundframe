import { accentColours, backgroundColours } from '@/lib/audioframe-design'
import { lyricAt, parseLrc, type LyricCue } from './lyrics'
import { settingsSchema } from './settings'
import type { EditorPreferences } from './types'

export const compositionSize = { width: 568, height: 320, fps: 30 } as const
export type FrameAnalysis = { frequency: ArrayLike<number>; waveform: ArrayLike<number> }
export type CompositionFrame = { frameIndex: number; analysis?: FrameAnalysis | null; reducedMotion?: boolean }
export type CompositionSnapshot = Readonly<{
  preferences: Readonly<EditorPreferences>
  artwork: HTMLImageElement
  cues: readonly LyricCue[]
  fontFamily: string
  colours: Readonly<{ accent: string; background: string; foreground: string; muted: string }>
}>

/** Resolve theme and load the chosen font before rendering. Keep this snapshot for export:
 * later theme/preference changes cannot alter any of its frames. The caller owns artwork lifetime.
 */
export async function prepareComposition(
  preferences: EditorPreferences,
  artwork: HTMLImageElement,
  tokenElement: Element = document.documentElement
): Promise<CompositionSnapshot> {
  const checked = settingsSchema.parse({ version: 1, preferences }).preferences
  if (!artwork.complete || !artwork.naturalWidth || !artwork.naturalHeight) {
    throw new Error('Decode artwork before preparing the composition.')
  }
  const fontToken = checked.typography === 'mono' ? '--font-geist-mono' : `--font-${checked.typography}`
  const fontFamily = getComputedStyle(tokenElement).getPropertyValue(fontToken).trim()
  if (!fontFamily) throw new Error('The selected preview font is unavailable. Reload and try again.')
  const glyphs = `${Object.values(checked.details).join(' ')} ${checked.lyricsText} Untitled Your Artist`
  const fonts = await Promise.all([
    document.fonts.load(`400 11px ${fontFamily}`, glyphs),
    document.fonts.load(`600 18px ${fontFamily}`, glyphs)
  ])
  await document.fonts.ready
  if (fonts.some((loaded) => !loaded.length)) {
    throw new Error('The selected preview font could not load. Reload and try again.')
  }
  const style = getComputedStyle(tokenElement)
  function colour(token: string) {
    const value = style.getPropertyValue(token).trim()
    if (!value || !CSS.supports('color', value)) throw new Error('Preview colours are unavailable in this browser.')
    return value
  }
  const accent = accentColours.find((item) => item.value === checked.accent)!
  const background = backgroundColours.find((item) => item.value === checked.background)!
  Object.freeze(checked.details)
  Object.freeze(checked)
  const cues = parseLrc(checked.lyricsMode === 'lrc' ? checked.lyricsText : '').cues.map((cue) => Object.freeze(cue))
  return Object.freeze({
    preferences: checked,
    artwork,
    cues: Object.freeze(cues),
    fontFamily,
    colours: Object.freeze({
      accent: colour(accent.token),
      background: colour(background.token),
      foreground: colour('--media-foreground'),
      muted: colour('--media-muted')
    })
  })
}

export function frameTime(frameIndex: number) {
  if (!Number.isSafeInteger(frameIndex) || frameIndex < 0) throw new Error('Frame index must be a nonnegative integer.')
  return frameIndex / compositionSize.fps
}

export function waveformRms(waveform?: ArrayLike<number>) {
  if (!waveform?.length) return 0
  let sum = 0
  for (let i = 0; i < waveform.length; i++) {
    const sample = Math.max(-1, Math.min(1, (waveform[i] - 128) / 128))
    if (Number.isFinite(sample)) sum += sample * sample
  }
  return Math.sqrt(sum / waveform.length)
}

/** Find a fitting Unicode code-point prefix in logarithmically many measurements. */
function fittingPrefix(context: CanvasRenderingContext2D, chars: readonly string[], width: number, suffix = '') {
  let low = 0
  let high = chars.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (context.measureText(`${chars.slice(0, middle).join('')}${suffix}`).width <= width) low = middle
    else high = middle - 1
  }
  return low
}

function ellipsis(context: CanvasRenderingContext2D, text: string, width: number) {
  if (context.measureText(text).width <= width) return text
  const chars = Array.from(text)
  return `${chars.slice(0, fittingPrefix(context, chars, width, '…')).join('')}…`
}

function textLines(context: CanvasRenderingContext2D, text: string, width: number, limit: number) {
  const lines: string[] = []
  let pending = text.trim()
  while (pending && lines.length < limit - 1) {
    if (context.measureText(pending).width <= width && !pending.includes('\n')) break
    const chars = Array.from(pending)
    const newline = chars.indexOf('\n')
    const firstLine = newline < 0 ? chars : chars.slice(0, newline)
    let length = Math.max(1, fittingPrefix(context, firstLine, width))
    const space = chars.slice(0, length).lastIndexOf(' ')
    if (space > 0 && chars[length] !== '\n') length = space
    lines.push(chars.slice(0, length).join('').trim())
    pending = chars.slice(length).join('').trim()
  }
  if (pending) lines.push(ellipsis(context, pending.replace(/\s+/g, ' '), width))
  return lines
}

function drawArtwork(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number) {
  const crop = Math.min(image.naturalWidth, image.naturalHeight)
  context.save()
  context.beginPath()
  context.roundRect(x, y, size, size, 8)
  context.clip()
  context.drawImage(
    image,
    (image.naturalWidth - crop) / 2,
    (image.naturalHeight - crop) / 2,
    crop,
    crop,
    x,
    y,
    size,
    size
  )
  context.restore()
}

/** Shared preview/export painter. Only absolute frame index and explicit audio samples
 * drive each frame; no wall clock, random values, history or analyser smoothing.
 * Silence/paused playback is represented by missing analysis or zero/centred samples.
 */
export function renderComposition(
  context: CanvasRenderingContext2D,
  snapshot: CompositionSnapshot,
  frame: CompositionFrame
) {
  const seconds = frameTime(frame.frameIndex)
  const { preferences, colours, fontFamily, artwork } = snapshot
  const cover = preferences.mode === 'cover'
  const gain = preferences.sensitivity / 50
  const analysis = frame.reducedMotion ? null : frame.analysis
  const lyric = preferences.lyricsMode === 'lrc' ? lyricAt(snapshot.cues, seconds) : preferences.lyricsText.trim()
  context.save()
  context.setTransform(
    (context.canvas?.width ?? compositionSize.width) / compositionSize.width,
    0,
    0,
    (context.canvas?.height ?? compositionSize.height) / compositionSize.height,
    0,
    0
  )
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.clearRect(0, 0, compositionSize.width, compositionSize.height)
  context.fillStyle = colours.background
  context.fillRect(0, 0, compositionSize.width, compositionSize.height)
  if (preferences.mode === 'lighting') {
    const energy = Math.min(1, waveformRms(analysis?.waveform) * gain)
    const glow = context.createRadialGradient(284, 160, 0, 284, 160, 140 + energy * 130)
    glow.addColorStop(0, colours.accent)
    glow.addColorStop(1, 'transparent')
    context.globalAlpha = 0.12 + energy * 0.6
    context.fillStyle = glow
    context.fillRect(0, 0, compositionSize.width, compositionSize.height)
    context.globalAlpha = 1
  }
  const size = cover ? 216 : 108
  drawArtwork(context, artwork, 34, cover ? 52 : 34, size)
  const textX = cover ? 278 : 170
  const textWidth = 534 - textX
  const titleY = cover ? 97 : 42
  context.textBaseline = 'top'
  context.textAlign = 'left'
  context.font = `600 18px ${fontFamily}`
  context.fillStyle = colours.foreground
  const title = textLines(context, preferences.details.title || 'Untitled', textWidth, 2)
  title.forEach((line, index) => context.fillText(line, textX, titleY + index * 22))
  context.font = `400 11px ${fontFamily}`
  context.fillStyle = colours.muted
  let detailY = titleY + title.length * 22 + 8
  for (const detail of [
    preferences.details.artist || 'Your Artist',
    preferences.details.album,
    preferences.details.website
  ]) {
    if (!detail) continue
    context.fillText(ellipsis(context, detail.replace(/\s+/g, ' '), textWidth), textX, detailY)
    detailY += 18
  }
  if (preferences.mode === 'spectrum') {
    context.fillStyle = colours.accent
    const count = 32
    for (let bar = 0; bar < count; bar++) {
      const bins = analysis?.frequency
      const start = Math.floor((bar * (bins?.length ?? 0)) / count)
      const end = Math.floor(((bar + 1) * (bins?.length ?? 0)) / count)
      let total = 0
      for (let bin = start; bin < end; bin++) {
        const value = bins?.[bin] ?? 0
        if (Number.isFinite(value)) total += Math.max(0, Math.min(255, value))
      }
      const level = end > start ? total / (end - start) / 255 : 0
      const height = Math.max(2, Math.min(1, level * gain) * 102)
      context.fillRect(34 + bar * 15.625, 286 - height, 10, height)
    }
  }
  if (lyric) {
    context.fillStyle = colours.foreground
    if (cover) {
      textLines(context, lyric, textWidth, 2).forEach((line, index) =>
        context.fillText(line, textX, detailY + 12 + index * 15)
      )
    } else {
      context.textAlign = 'center'
      context.fillText(ellipsis(context, lyric.replace(/\s+/g, ' '), 500), 284, 299)
    }
  }
  context.restore()
}
