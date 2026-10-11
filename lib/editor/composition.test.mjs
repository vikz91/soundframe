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
  const preferences = defaultEditorPreferences()
  try {
    Object.defineProperties(globalThis, {
      document: {
        configurable: true,
        value: {
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
    expect(Object.isFrozen(assets.colours)).toBe(true)
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
