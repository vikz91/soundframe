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
  expect(() => parseSettings(' '.repeat(settingsFileLimit + 1))).toThrow('128 KB')
  expect(() => parseSettings('é'.repeat(settingsFileLimit / 2 + 1))).toThrow('128 KB')
  expect(() =>
    serializeSettings({ ...defaultEditorPreferences(), lyricsMode: 'lrc', lyricsText: '[00:60]bad' })
  ).toThrow('Line 1')
})
