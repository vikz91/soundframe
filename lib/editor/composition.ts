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
  artworkBackground?: HTMLCanvasElement
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
  const typography = checked.layout === 'full-cover' ? checked.fullCover.typography : checked.typography
  const fontToken = typography === 'mono' ? '--font-geist-mono' : `--font-${typography}`
  const fontFamily = getComputedStyle(tokenElement).getPropertyValue(fontToken).trim()
  if (!fontFamily) throw new Error('The selected preview font is unavailable. Reload and try again.')
  const glyphs = `${Object.values(checked.details).join(' ')} ${checked.lyricsText} Untitled Your Artist`
  const fonts = await Promise.all([
    document.fonts.load(`400 11px ${fontFamily}`, glyphs),
    document.fonts.load(`600 18px ${fontFamily}`, glyphs),
    ...(checked.layout === 'full-cover' ? [document.fonts.load(`500 12px ${fontFamily}`, glyphs)] : [])
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
  const selectedAccent = checked.layout === 'full-cover' ? checked.fullCover.accent : checked.accent
  const accent = accentColours.find((item) => item.value === selectedAccent)!
  const background = backgroundColours.find((item) => item.value === checked.background)!
  Object.freeze(checked.details)
  Object.freeze(checked.fullCover)
  Object.freeze(checked)
  const cues = parseLrc(checked.lyricsMode === 'lrc' ? checked.lyricsText : '').cues.map((cue) => Object.freeze(cue))
  return Object.freeze({
    preferences: checked,
    artwork,
    ...(checked.layout === 'full-cover' && checked.fullCover.framing === 'fit'
      ? { artworkBackground: prepareArtworkBackground(artwork) }
      : {}),
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

function drawFilledArtwork(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  positionX: number,
  positionY: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  context.drawImage(
    image,
    ((image.naturalWidth - sourceWidth) * positionX) / 100,
    ((image.naturalHeight - sourceHeight) * positionY) / 100,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  )
}

/** Downsample once, then smoothly enlarge during painting. This soft backdrop also
 * works in browsers without Canvas filter support and avoids a full-frame blur per frame.
 * The snapshot owns this small canvas; dropping it releases the backing pixels.
 */
function prepareArtworkBackground(artwork: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 18
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Artwork background could not be prepared in this browser.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  drawFilledArtwork(context, artwork, canvas.width, canvas.height, 50, 50)
  return canvas
}

function renderFullCover(
  context: CanvasRenderingContext2D,
  snapshot: CompositionSnapshot,
  analysis: FrameAnalysis | null | undefined,
  lyric: string
) {
  const { preferences, artwork, artworkBackground, colours, fontFamily } = snapshot
  const settings = preferences.fullCover
  const { width, height } = compositionSize
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  if (settings.framing === 'fill') {
    drawFilledArtwork(context, artwork, width, height, settings.positionX, settings.positionY)
  } else {
    if (artworkBackground) context.drawImage(artworkBackground, 0, 0, width, height)
    else drawFilledArtwork(context, artwork, width, height, 50, 50)
    context.fillStyle = 'rgba(0, 0, 0, 0.22)'
    context.fillRect(0, 0, width, height)
    const scale = Math.min(width / artwork.naturalWidth, height / artwork.naturalHeight)
    const artworkWidth = artwork.naturalWidth * scale
    const artworkHeight = artwork.naturalHeight * scale
    context.drawImage(artwork, (width - artworkWidth) / 2, (height - artworkHeight) / 2, artworkWidth, artworkHeight)
  }
  if (settings.fade > 0) {
    const fade = context.createLinearGradient(0, height * 0.4, 0, height)
    fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    fade.addColorStop(1, `rgba(0, 0, 0, ${(settings.fade / 100) * 0.88})`)
    context.fillStyle = fade
    context.fillRect(0, 0, width, height)
  }

  const baseline = height - 16
  const maxBarHeight = settings.visualization === 'bars' ? (height * settings.height) / 100 : 0
  if (settings.visualization === 'bars') {
    const count = settings.pattern === 'thin' ? 64 : settings.pattern === 'bold' ? 32 : 40
    const step = (width - 56) / count
    const barWidth = settings.pattern === 'thin' ? 3 : settings.pattern === 'bold' ? 10 : 8
    const bins = analysis?.frequency
    const gain = settings.sensitivity / 50
    context.fillStyle = settings.colour === 'ivory' ? '#fff2d6' : colours.accent
    for (let bar = 0; bar < count; bar++) {
      const start = Math.floor((bar * (bins?.length ?? 0)) / count)
      const end = Math.floor(((bar + 1) * (bins?.length ?? 0)) / count)
      let total = 0
      for (let bin = start; bin < end; bin++) {
        const value = bins?.[bin] ?? 0
        if (Number.isFinite(value)) total += Math.max(0, Math.min(255, value))
      }
      const level = end > start ? total / (end - start) / 255 : 0
      const barHeight = Math.max(2, Math.min(1, level * gain) * maxBarHeight)
      const x = 28 + bar * step + (step - barWidth) / 2
      if (settings.pattern === 'segmented') {
        for (let offset = 0; offset < barHeight; offset += 5) {
          const segmentHeight = Math.min(3, barHeight - offset)
          context.fillRect(x, baseline - offset - segmentHeight, barWidth, segmentHeight)
        }
      } else context.fillRect(x, baseline - barHeight, barWidth, barHeight)
    }
  }

  // Text shadows maintain legibility even with the optional artwork fade disabled.
  context.textBaseline = 'top'
  context.fillStyle = '#fff2d6'
  context.shadowColor = 'rgba(0, 0, 0, 0.85)'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 1
  context.textAlign = 'left'
  context.font = `600 18px ${fontFamily}`
  const title = textLines(context, preferences.details.title, width - 56, 2)
  title.forEach((line, index) => context.fillText(line, 28, 24 + index * 22))
  context.font = `500 12px ${fontFamily}`
  let detailY = 24 + title.length * 22 + (title.length ? 8 : 0)
  for (const detail of [preferences.details.artist, preferences.details.album, preferences.details.website]) {
    if (!detail.trim()) continue
    context.fillText(ellipsis(context, detail.replace(/\s+/g, ' ').trim(), width - 56), 28, detailY)
    detailY += 18
  }
  if (lyric) {
    context.shadowBlur = 4
    context.textAlign = 'center'
    context.font = `400 11px ${fontFamily}`
    const lines = textLines(context, lyric, width - 56, 2)
    const lyricY = baseline - maxBarHeight - 16 - lines.length * 15
    lines.forEach((line, index) => context.fillText(line, width / 2, lyricY + index * 15))
  }
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
  if (preferences.layout === 'full-cover') {
    renderFullCover(context, snapshot, analysis, lyric)
    context.restore()
    return
  }
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
