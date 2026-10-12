import { expect, test } from 'bun:test'
import { compositionSize, frameTime, prepareComposition, renderComposition, waveformRms } from './composition'
import { defaultEditorPreferences } from './types'
import { parseLrc } from './lyrics'

function renderer() {
  const calls = []
  const measurements = []
  const context = new Proxy(
    {
      measureText: (text) => {
        measurements.push(text)
        return { width: Array.from(text).length * 7 }
      },
      createRadialGradient: (...args) => {
        calls.push(['gradient', ...args])
        return { addColorStop: (...stop) => calls.push(['stop', ...stop]) }
      },
      createLinearGradient: (...args) => {
        calls.push(['linearGradient', ...args])
        return { addColorStop: (...stop) => calls.push(['stop', ...stop]) }
      }
    },
    {
      get(target, key) {
        return key in target ? target[key] : (...args) => calls.push([key, ...args])
      },
      set(target, key, value) {
        calls.push([key, typeof value === 'object' ? 'gradient' : value])
        target[key] = value
        return true
      }
    }
  )
  return { context, calls, measurements }
}

function snapshot(mode) {
  return {
    preferences: { ...defaultEditorPreferences(), mode, lyricsMode: 'lrc', lyricsText: '[00:01]first\n[00:02]second' },
    artwork: { naturalWidth: 800, naturalHeight: 400 },
    cues: parseLrc('[00:01]first\n[00:02]second').cues,
    fontFamily: 'Test font',
    colours: { accent: 'accent', background: 'background', foreground: 'foreground', muted: 'muted' }
  }
}

function fullCoverSnapshot(settings = {}) {
  const assets = snapshot('lighting')
  assets.preferences.layout = 'full-cover'
  assets.preferences.fullCover = { ...assets.preferences.fullCover, ...settings }
  assets.artwork = { naturalWidth: 800, naturalHeight: 800 }
  assets.preferences.lyricsText = ''
  assets.preferences.lyricsMode = 'plain'
  return assets
}

test('composition uses exact absolute frame clock, including cue boundary and backward seek', () => {
  expect(compositionSize).toEqual({ width: 568, height: 320, fps: 30 })
  expect(frameTime(30)).toBe(1)
  for (const index of [-1, NaN, Infinity, 1.5]) expect(() => frameTime(index)).toThrow()
  for (const [index, lyric] of [
    [29, undefined],
    [30, 'first'],
    [60, 'second'],
    [30, 'first']
  ]) {
    const { context, calls } = renderer()
    renderComposition(context, snapshot('cover'), { frameIndex: index })
    const lines = calls.filter((call) => call[0] === 'fillText').map((call) => call[1])
    expect(lines.includes('first') || lines.includes('second')).toBe(Boolean(lyric))
    if (lyric) expect(lines).toContain(lyric)
  }
})

test('same snapshot and samples produce identical preview/export draw operations independent of prior frames', () => {
  const analysis = { frequency: new Uint8Array(256).fill(200), waveform: new Uint8Array([64, 192, 64, 192]) }
  for (const mode of ['cover', 'spectrum', 'lighting']) {
    const preview = renderer()
    const exported = renderer()
    const assets = snapshot(mode)
    renderComposition(preview.context, assets, { frameIndex: 600, analysis })
    preview.calls.length = 0
    renderComposition(preview.context, assets, { frameIndex: 30, analysis })
    renderComposition(exported.context, assets, { frameIndex: 30, analysis })
    expect(preview.calls).toEqual(exported.calls)
  }
  for (const framing of ['fit', 'fill']) {
    for (const pattern of ['thin', 'bold', 'segmented']) {
      const preview = renderer()
      const exported = renderer()
      const assets = fullCoverSnapshot({ framing, pattern })
      renderComposition(preview.context, assets, { frameIndex: 600, analysis })
      preview.calls.length = 0
      renderComposition(preview.context, assets, { frameIndex: 30, analysis })
      renderComposition(exported.context, assets, { frameIndex: 30, analysis })
      expect(preview.calls).toEqual(exported.calls)
    }
  }
})

test('Classic settings ignore Full cover options and retain cover, spectrum and lighting draw operations', () => {
  for (const mode of ['cover', 'spectrum', 'lighting']) {
    const original = renderer()
    const changed = renderer()
    const assets = snapshot(mode)
    renderComposition(original.context, assets, { frameIndex: 30 })
    assets.preferences.fullCover = {
      visualization: 'none',
      pattern: 'segmented',
      colour: 'accent',
      height: 30,
      fade: 0,
      framing: 'fill',
      positionX: 100,
      positionY: 0,
      showDetails: true
    }
    renderComposition(changed.context, assets, { frameIndex: 30 })
    expect(original.calls).toEqual(changed.calls)
    expect(changed.calls.filter(([call]) => call === 'drawImage')).toHaveLength(1)
    expect(changed.calls.some(([call]) => call === 'roundRect')).toBe(true)
  }
})

test('Full cover Fit preserves all artwork over a softened backdrop, without square clipping', () => {
  for (const [naturalWidth, naturalHeight, x, y, width, height] of [
    [800, 800, 124, 0, 320, 320],
    [400, 800, 204, 0, 160, 320],
    [1600, 400, 0, 89, 568, 142]
  ]) {
    const { context, calls } = renderer()
    const assets = fullCoverSnapshot()
    assets.artwork = { naturalWidth, naturalHeight }
    assets.artworkBackground = { softened: true }
    renderComposition(context, assets, { frameIndex: 0 })
    expect(calls.filter(([call]) => call === 'drawImage')).toEqual([
      ['drawImage', assets.artworkBackground, 0, 0, 568, 320],
      ['drawImage', assets.artwork, x, y, width, height]
    ])
    expect(calls.some(([call]) => call === 'clip' || call === 'roundRect')).toBe(false)
  }
})

test('Full cover Fill crops on the overflowing axis and respects both position boundaries', () => {
  for (const position of [0, 50, 100]) {
    const square = renderer()
    const assets = fullCoverSnapshot({ framing: 'fill', positionY: position })
    renderComposition(square.context, assets, { frameIndex: 0 })
    expect(square.calls.find(([call]) => call === 'drawImage')).toEqual([
      'drawImage',
      assets.artwork,
      0,
      ((800 - 320 / 0.71) * position) / 100,
      800,
      320 / 0.71,
      0,
      0,
      568,
      320
    ])
    const landscape = renderer()
    assets.artwork = { naturalWidth: 800, naturalHeight: 400 }
    assets.preferences.fullCover.positionX = position
    renderComposition(landscape.context, assets, { frameIndex: 0 })
    expect(landscape.calls.find(([call]) => call === 'drawImage')).toEqual([
      'drawImage',
      assets.artwork,
      (90 * position) / 100,
      0,
      710,
      400,
      0,
      0,
      568,
      320
    ])
  }
})

test('Full cover bar patterns obey height and colour; None bypasses spectrum and lighting independently', () => {
  const analysis = { frequency: new Uint8Array(256).fill(255), waveform: new Uint8Array(128) }
  for (const [pattern, count, barWidth] of [
    ['thin', 64, 3],
    ['bold', 32, 10],
    ['segmented', 40, 8]
  ]) {
    const { context, calls } = renderer()
    const assets = fullCoverSnapshot({ pattern, height: 30, colour: 'accent' })
    renderComposition(context, assets, { frameIndex: 0, analysis })
    const bars = calls.filter(([call, , , width]) => call === 'fillRect' && width === barWidth)
    expect(new Set(bars.map(([, x]) => x)).size).toBe(count)
    expect(Math.min(...bars.map(([, , y]) => y))).toBe(208)
    expect(Math.max(...bars.map(([, , y, , height]) => y + height))).toBe(304)
    if (pattern === 'segmented') expect(bars.every(([, , , , height]) => height <= 3)).toBe(true)
    else expect(bars).toHaveLength(count)
    expect(calls).toContainEqual(['fillStyle', 'accent'])
    expect(calls.some(([call]) => call === 'gradient')).toBe(false)
  }
  for (const mode of ['cover', 'spectrum', 'lighting']) {
    const { context, calls } = renderer()
    const assets = fullCoverSnapshot({ visualization: 'none', framing: 'fill', fade: 0 })
    assets.preferences.mode = mode
    renderComposition(context, assets, { frameIndex: 0, analysis })
    expect(calls.filter(([call]) => call === 'fillRect')).toEqual([['fillRect', 0, 0, 568, 320]])
    expect(calls.some(([call]) => call === 'gradient' || call === 'linearGradient')).toBe(false)
  }
})

test('Full cover silence, pause and reduced motion have identical stable bars for every pattern', () => {
  for (const pattern of ['thin', 'bold', 'segmented']) {
    const assets = fullCoverSnapshot({ pattern })
    const silent = renderer()
    const paused = renderer()
    const reduced = renderer()
    renderComposition(silent.context, assets, {
      frameIndex: 0,
      analysis: { frequency: new Uint8Array(256), waveform: new Uint8Array(128).fill(128) }
    })
    renderComposition(paused.context, assets, { frameIndex: 0 })
    renderComposition(reduced.context, assets, {
      frameIndex: 0,
      analysis: { frequency: new Uint8Array(256).fill(255), waveform: new Uint8Array(128) },
      reducedMotion: true
    })
    expect(silent.calls).toEqual(paused.calls)
    expect(reduced.calls).toEqual(paused.calls)
  }
})

test('Full cover sensitivity is independent of the retained Classic sensitivity', () => {
  const assets = fullCoverSnapshot({ sensitivity: 50, height: 20 })
  assets.preferences.sensitivity = 0
  const analysis = { frequency: new Uint8Array(256).fill(128) }
  const { context, calls } = renderer()
  renderComposition(context, assets, { frameIndex: 0, analysis })
  const bars = calls.filter(([call, , , width]) => call === 'fillRect' && width === 3)
  expect(bars).toHaveLength(64)
  expect(bars[0][4]).toBeCloseTo((128 / 255) * 64)
  assets.preferences.sensitivity = 100
  assets.preferences.fullCover.sensitivity = 0
  const muted = renderer()
  renderComposition(muted.context, assets, { frameIndex: 0, analysis })
  const mutedBars = muted.calls.filter(([call, , , width]) => call === 'fillRect' && width === 3)
  expect(mutedBars.every(([, , , , height]) => height === 2)).toBe(true)
})

test('Full cover always draws filled details above lyrics and bars; blank fields omit text', () => {
  // A retained in-memory preference from the old toggle must no longer hide text.
  const assets = fullCoverSnapshot({ height: 30, showDetails: false })
  const empty = renderer()
  renderComposition(empty.context, assets, { frameIndex: 0 })
  expect(empty.calls.filter(([call]) => call === 'fillText')).toHaveLength(0)
  assets.preferences.details = { title: 'Title\nSecond line', artist: 'Artist', album: 'Album', website: 'Website' }
  assets.preferences.lyricsText = 'First lyric line\nSecond lyric line'
  const { context, calls } = renderer()
  renderComposition(context, assets, { frameIndex: 0, analysis: { frequency: new Uint8Array(256).fill(255) } })
  const text = calls.filter(([call]) => call === 'fillText')
  expect(text.map(([, line]) => line)).toEqual([
    'Title',
    'Second line',
    'Artist',
    'Album',
    'Website',
    'First lyric line',
    'Second lyric line'
  ])
  const lyricLines = text.slice(-2)
  expect(text[4][3] + 11).toBeLessThan(lyricLines[0][3])
  expect(lyricLines[1][3] + 11).toBeLessThan(208)
  const cleared = renderer()
  assets.preferences.details = { title: ' ', artist: '', album: '\t', website: '' }
  renderComposition(cleared.context, assets, { frameIndex: 0 })
  expect(cleared.calls.filter(([call]) => call === 'fillText').map(([, line]) => line)).toEqual([
    'First lyric line',
    'Second lyric line'
  ])
})

test('Full cover fade strength changes only the gradient opacity and scales the logical composition for 720p', () => {
  for (const [fade, opacity] of [
    [45, 0.396],
    [100, 0.88]
  ]) {
    const { context, calls } = renderer()
    context.canvas = { width: 1280, height: 720 }
    const assets = fullCoverSnapshot({ fade })
    renderComposition(context, assets, { frameIndex: 0 })
    expect(calls).toContainEqual(['stop', 1, `rgba(0, 0, 0, ${opacity})`])
    expect(calls).toContainEqual(['setTransform', 1280 / 568, 0, 0, 720 / 320, 0, 0])
  }
})

test('Full cover lyric truncation keeps Unicode intact with bounded measurements', () => {
  const { context, calls, measurements } = renderer()
  const assets = fullCoverSnapshot()
  assets.preferences.lyricsText = '😀'.repeat(10000)
  renderComposition(context, assets, { frameIndex: 0 })
  expect(measurements.length).toBeLessThan(40)
  const lyrics = calls.filter(([call]) => call === 'fillText')
  expect(lyrics).toHaveLength(2)
  expect(lyrics.at(-1)[1].endsWith('…')).toBe(true)
  for (const [, line] of lyrics) {
    expect(Array.from(line).length * 7).toBeLessThanOrEqual(512)
    expect(Array.from(line).some((char) => char.length === 1 && /[\uD800-\uDFFF]/.test(char))).toBe(false)
  }
})

test('silence and paused analysis are stable; frequency and RMS drive their respective modes', () => {
  expect(waveformRms(new Uint8Array([128, 128]))).toBe(0)
  expect(waveformRms(new Uint8Array([64, 192]))).toBe(0.5)
  for (const mode of ['spectrum', 'lighting']) {
    const silent = renderer()
    const paused = renderer()
    const loud = renderer()
    const assets = snapshot(mode)
    renderComposition(silent.context, assets, {
      frameIndex: 0,
      analysis: { frequency: new Uint8Array(256), waveform: new Uint8Array(128).fill(128) }
    })
    renderComposition(paused.context, assets, { frameIndex: 0 })
    renderComposition(loud.context, assets, {
      frameIndex: 0,
      analysis: { frequency: new Uint8Array(256).fill(255), waveform: new Uint8Array(128) }
    })
    expect(silent.calls).toEqual(paused.calls)
    expect(loud.calls).not.toEqual(paused.calls)
    const reduced = renderer()
    renderComposition(reduced.context, assets, {
      frameIndex: 0,
      analysis: { frequency: new Uint8Array(256).fill(255), waveform: new Uint8Array(128) },
      reducedMotion: true
    })
    expect(reduced.calls).toEqual(paused.calls)
  }
})

test('plain lyrics up to 20,000 characters use bounded measurements and preserve Unicode in every mode', () => {
  for (const mode of ['cover', 'spectrum', 'lighting']) {
    for (const text of ['x'.repeat(200), 'x'.repeat(1000), 'x'.repeat(20000), '😀'.repeat(10000), '😀 '.repeat(6666)]) {
      const { context, calls, measurements } = renderer()
      const assets = snapshot(mode)
      assets.preferences.lyricsMode = 'plain'
      assets.preferences.lyricsText = text
      renderComposition(context, assets, { frameIndex: 0 })
      expect(measurements.length).toBeLessThan(40)
      const lyrics = calls.filter((call) => call[0] === 'fillText').slice(2)
      expect(lyrics.length).toBe(mode === 'cover' ? 2 : 1)
      expect(lyrics.at(-1)[1].endsWith('…')).toBe(true)
      for (const [, line] of lyrics) {
        expect(Array.from(line).length * 7).toBeLessThanOrEqual(mode === 'cover' ? 256 : 500)
        expect(Array.from(line).some((char) => char.length === 1 && /[\uD800-\uDFFF]/.test(char))).toBe(false)
      }
    }
  }
})

test('asset preparation explicitly loads fonts and freezes independent colours and preference values', async () => {
  const previous = Object.getOwnPropertyDescriptors(globalThis)
  const loads = []
  let fontReady = false
  let accent = 'resolved-accent'
  const backgrounds = []
  const tokens = []
  const preferences = defaultEditorPreferences()
  try {
    Object.defineProperties(globalThis, {
      document: {
        configurable: true,
        value: {
          createElement: (name) => {
            expect(name).toBe('canvas')
            const canvas = { getContext: () => renderer().context }
            backgrounds.push(canvas)
            return canvas
          },
          fonts: {
            load: async (font) => {
              loads.push(font)
              fontReady = true
              return [{}]
            },
            ready: Promise.resolve()
          }
        }
      },
      CSS: { configurable: true, value: { supports: () => true } },
      getComputedStyle: {
        configurable: true,
        value: () => ({
          getPropertyValue: (token) => {
            tokens.push(token)
            if (token.startsWith('--font-')) return 'Test family'
            expect(fontReady).toBe(true)
            return token === '--primary' ? accent : `resolved-${token}`
          }
        })
      }
    })
    const assets = await prepareComposition(preferences, { complete: true, naturalWidth: 100, naturalHeight: 100 }, {})
    expect(loads).toEqual(['400 11px Test family', '600 18px Test family'])
    expect(assets.fontFamily).toBe('Test family')
    expect(assets.colours.accent).toBe('resolved-accent')
    preferences.details.title = 'changed'
    accent = 'new-theme'
    expect(assets.preferences.details.title).toBe('')
    expect(assets.colours.accent).toBe('resolved-accent')
    expect(Object.isFrozen(assets.preferences.details)).toBe(true)
    expect(Object.isFrozen(assets.preferences.fullCover)).toBe(true)
    expect(Object.isFrozen(assets.colours)).toBe(true)
    preferences.layout = 'full-cover'
    preferences.fullCover.typography = 'mono'
    preferences.fullCover.accent = 'violet'
    const full = await prepareComposition(preferences, { complete: true, naturalWidth: 100, naturalHeight: 100 }, {})
    expect(loads).toContain('500 12px Test family')
    expect(tokens).toContain('--font-geist-mono')
    expect(full.colours.accent).toBe('resolved---swatch-violet')
    expect(full.artworkBackground).toBe(backgrounds[0])
    expect(full.artworkBackground.width).toBe(32)
    expect(full.artworkBackground.height).toBe(18)
    preferences.fullCover.height = 30
    expect(full.preferences.fullCover.height).toBe(15)
    const painter = renderer()
    renderComposition(painter.context, full, { frameIndex: 0 })
    renderComposition(painter.context, full, { frameIndex: 1 })
    expect(backgrounds).toHaveLength(1)
    preferences.fullCover.framing = 'fill'
    const filled = await prepareComposition(preferences, { complete: true, naturalWidth: 100, naturalHeight: 100 }, {})
    expect(filled.artworkBackground).toBeUndefined()
    expect(backgrounds).toHaveLength(1)
    await expect(prepareComposition(preferences, { complete: false }, {})).rejects.toThrow('Decode artwork')
    document.fonts.load = async () => []
    await expect(
      prepareComposition(preferences, { complete: true, naturalWidth: 100, naturalHeight: 100 }, {})
    ).rejects.toThrow('font could not load')
  } finally {
    for (const key of ['document', 'CSS', 'getComputedStyle']) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
