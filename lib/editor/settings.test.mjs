import { expect, test } from 'bun:test'
import { parseSettings, serializeSettings, settingsFileLimit } from './settings'
import { defaultEditorPreferences } from './types'

test('versioned settings round trip all preferences including valid timed lyrics', () => {
  const preferences = {
    ...defaultEditorPreferences(),
    mode: 'lighting',
    accent: 'violet',
    sensitivity: 100,
    typography: 'mono',
    lyricsMode: 'lrc',
    lyricsText: '[00:01.100]hello',
    format: 'webm',
    resolution: '720p',
    details: { title: '标题', artist: 'Artist', album: 'Album', website: 'example.test' }
  }
  expect(parseSettings(serializeSettings(preferences))).toEqual(preferences)
  expect(JSON.parse(serializeSettings(preferences)).version).toBe(1)
  const parsed = parseSettings(serializeSettings(preferences))
  parsed.details.title = 'changed'
  expect(preferences.details.title).toBe('标题')
})

test('legacy version-1 settings default to 320p, and unsupported resolutions are rejected', () => {
  const preferences = defaultEditorPreferences()
  delete preferences.resolution
  expect(parseSettings(JSON.stringify({ version: 1, preferences })).resolution).toBe('320p')
  for (const resolution of ['300p', '1080p', 720, null])
    expect(() => parseSettings(JSON.stringify({ version: 1, preferences: { ...preferences, resolution } }))).toThrow(
      'Invalid settings'
    )
})

test('unknown media/credentials keys, unsupported versions, incomplete and invalid values rejected', () => {
  const preferences = defaultEditorPreferences()
  for (const value of [
    { version: 2, preferences },
    { version: 1, preferences, media: 'blob:file' },
    { version: 1, preferences: { ...preferences, credentials: 'secret' } },
    { version: 1, preferences: { ...preferences, details: { ...preferences.details, token: 'secret' } } },
    { version: 1, preferences: { ...preferences, sensitivity: 101 } },
    { version: 1, preferences: { ...preferences, sensitivity: '50' } },
    { version: 1, preferences: { ...preferences, mode: 'other' } },
    { version: 1, preferences: {} },
    { version: 1, preferences: { ...preferences, lyricsText: 'x'.repeat(20001) } },
    { version: 1, preferences: { ...preferences, details: { ...preferences.details, title: 'x'.repeat(201) } } }
  ])
    expect(() => parseSettings(JSON.stringify(value))).toThrow('Invalid settings')
  expect(() => serializeSettings({ ...preferences, sensitivity: NaN })).toThrow()
})

test('malformed JSON, over-limit bytes and malformed LRC fail before settings replacement', () => {
  expect(() => parseSettings('{')).toThrow('valid Audioframe JSON')
  expect(() => parseSettings(' '.repeat(settingsFileLimit + 1))).toThrow('256 KiB')
  expect(() => parseSettings('é'.repeat(settingsFileLimit / 2 + 1))).toThrow('256 KiB')
  expect(() =>
    serializeSettings({ ...defaultEditorPreferences(), lyricsMode: 'lrc', lyricsText: '[00:60]bad' })
  ).toThrow('Line 1')
})

test('numeric settings reject non-finite values without the deprecated Zod finite check', () => {
  const preferences = defaultEditorPreferences()
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(() => serializeSettings({ ...preferences, sensitivity: value })).toThrow()
    for (const key of ['sensitivity', 'height', 'fade', 'positionX', 'positionY']) {
      expect(() =>
        serializeSettings({ ...preferences, fullCover: { ...preferences.fullCover, [key]: value } })
      ).toThrow()
    }
  }
})

test('legacy presets retain their classic mode and receive independent full-cover defaults', () => {
  for (const mode of ['cover', 'spectrum', 'lighting']) {
    const preferences = { ...defaultEditorPreferences(), mode }
    delete preferences.layout
    delete preferences.fullCover
    const first = parseSettings(JSON.stringify({ version: 1, preferences }))
    const second = parseSettings(JSON.stringify({ version: 1, preferences }))
    expect(first.layout).toBe('classic')
    expect(first.mode).toBe(mode)
    expect(first.fullCover).toEqual(defaultEditorPreferences().fullCover)
    first.fullCover.pattern = 'bold'
    expect(second.fullCover.pattern).toBe('thin')
  }
})

test('full-cover presets preserve both layouts and strictly validate nested controls', () => {
  const preferences = defaultEditorPreferences()
  preferences.layout = 'full-cover'
  preferences.mode = 'lighting'
  preferences.fullCover = {
    ...preferences.fullCover,
    visualization: 'none',
    pattern: 'segmented',
    colour: 'accent',
    accent: 'violet',
    sensitivity: 80,
    typography: 'mono',
    height: 30,
    fade: 0,
    framing: 'fill',
    positionX: 0,
    positionY: 100
  }
  expect(parseSettings(serializeSettings(preferences))).toEqual(preferences)
  for (const patch of [
    { visualization: 'lighting' },
    { pattern: 'radial' },
    { colour: 'red' },
    { framing: 'stretch' },
    { height: 4 },
    { height: 31 },
    { fade: -1 },
    { fade: 101 },
    { positionX: -1 },
    { positionY: 101 },
    { showDetails: 'true' },
    { sensitivity: 101 },
    { typography: 'serif' },
    { accent: 'red' },
    { media: 'blob:file' }
  ]) {
    expect(() =>
      parseSettings(
        JSON.stringify({
          version: 1,
          preferences: {
            ...preferences,
            fullCover: { ...preferences.fullCover, ...patch }
          }
        })
      )
    ).toThrow('Invalid settings')
  }
  for (const fullCover of [null, {}, { visualization: 'bars' }]) {
    expect(() => parseSettings(JSON.stringify({ version: 1, preferences: { ...preferences, fullCover } }))).toThrow(
      'Invalid settings'
    )
  }
  expect(() => serializeSettings({ ...preferences, fullCover: { ...preferences.fullCover, fade: NaN } })).toThrow()
})

test('retired detail visibility preferences are discarded on import and omitted from new presets', () => {
  const preferences = { ...defaultEditorPreferences(), layout: 'full-cover' }
  for (const showDetails of [false, true]) {
    const saved = { ...preferences, fullCover: { ...preferences.fullCover, showDetails } }
    const parsed = parseSettings(JSON.stringify({ version: 1, preferences: saved }))
    expect(parsed).toEqual(preferences)
    expect(JSON.parse(serializeSettings(parsed)).preferences.fullCover).not.toHaveProperty('showDetails')
  }
})
