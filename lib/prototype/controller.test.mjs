import { expect, test } from 'bun:test'
import { canCreate, createPrototypeController, outputLifetime } from './controller'
import { defaultPreferences, previewLyric, sampleLrc } from './fixtures'

function session() {
  let now = 100000
  let sequence = 0
  const tasks = new Map()
  const captured = []
  const controller = createPrototypeController({
    now: () => now,
    schedule: (callback, delay) => {
      const id = ++sequence
      tasks.set(id, { at: now + delay, callback })
      captured.push(callback)
      return () => tasks.delete(id)
    }
  })
  function advance(milliseconds) {
    const target = now + milliseconds
    for (;;) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      tasks.delete(next[0])
      now = next[1].at
      next[1].callback()
    }
    now = target
  }
  function ready(audio = 'track') {
    controller.selectSample('audio', audio)
    controller.selectSample('artwork', 'cover')
    advance(600)
  }
  return {
    controller,
    advance,
    ready,
    tasks,
    captured,
    jump: (milliseconds) => {
      now += milliseconds
    }
  }
}

test('steps require two checked samples and invalid replacements prevent creating', () => {
  const s = session()
  s.controller.navigate('create')
  expect(s.controller.getSnapshot().view).toBe('files')
  s.ready()
  expect(canCreate(s.controller.getSnapshot())).toBe(true)
  s.controller.selectSample('audio', 'long')
  expect(canCreate(s.controller.getSnapshot())).toBe(false)
  s.advance(600)
  expect(s.controller.getSnapshot().audio.sample).toBeUndefined()
  expect(s.controller.getSnapshot().audio.error).toContain('7 minutes')
  s.controller.selectSample('audio', 'track')
  s.advance(600)
  expect(canCreate(s.controller.getSnapshot())).toBe(true)
  expect(s.controller.getSnapshot().audio.error).toBeUndefined()
  s.controller.selectSample('artwork', 'bad-cover')
  s.advance(600)
  expect(s.controller.getSnapshot().artwork.error).toContain('could not be read')
  expect(canCreate(s.controller.getSnapshot())).toBe(false)
})

test('clear, replacement, and disposal reject captured stale callbacks', () => {
  const s = session()
  s.controller.selectSample('audio', 'track')
  const first = s.captured.at(-1)
  s.controller.selectSample('audio', 'failure')
  first()
  s.advance(600)
  expect(s.controller.getSnapshot().audio.sample.id).toBe('failure')
  s.controller.selectSample('artwork', 'cover')
  const old = s.captured.at(-1)
  s.controller.clear()
  old()
  expect(s.controller.getSnapshot().artwork.sample).toBeUndefined()
  expect(s.tasks.size).toBe(0)
  s.ready()
  s.controller.startExport()
  const pending = s.captured.at(-1)
  s.controller.dispose()
  const disposed = s.controller.getSnapshot()
  pending()
  s.advance(100000)
  expect(s.controller.getSnapshot()).toBe(disposed)
  expect(s.tasks.size).toBe(0)
})

test('cancellation keeps settings, rejects late completion, and retry succeeds', () => {
  const s = session()
  s.ready()
  s.controller.updatePreferences({ mode: 'lighting', sensitivity: 82 })
  s.controller.startExport()
  s.advance(2000)
  const old = s.captured.at(-1)
  s.controller.setDialog('cancel')
  s.controller.cancelExport()
  old()
  s.advance(10000)
  expect(s.controller.getSnapshot().export.status).toBe('cancelled')
  expect(s.controller.getSnapshot().output).toBeNull()
  expect(s.controller.getSnapshot().preferences.sensitivity).toBe(82)
  s.controller.startExport()
  s.advance(8000)
  expect(s.controller.getSnapshot().view).toBe('download')
  expect(s.controller.getSnapshot().output.preferences.mode).toBe('lighting')
})

test('failure example fails only its first attempt and closes a stale cancel dialog', () => {
  const s = session()
  s.ready('failure')
  s.controller.startExport()
  s.controller.setDialog('cancel')
  s.advance(4000)
  expect(s.controller.getSnapshot().export.status).toBe('failed')
  expect(s.controller.getSnapshot().dialog).toBeNull()
  s.controller.startExport()
  s.advance(7500)
  s.controller.setDialog('cancel')
  s.advance(500)
  expect(s.controller.getSnapshot().export.status).toBe('complete')
  expect(s.controller.getSnapshot().dialog).toBeNull()
})

test('running export locks navigation and edits, preserving the captured composition', () => {
  const s = session()
  s.ready()
  s.controller.updatePreferences({ format: 'webm' })
  s.controller.startExport()
  s.controller.navigate('create')
  s.controller.updatePreferences({ format: 'mp4' })
  s.controller.selectSample('audio', 'long')
  expect(s.controller.getSnapshot().view).toBe('export')
  s.advance(8000)
  expect(s.controller.getSnapshot().output.filename).toEndWith('.webm')
  expect(s.controller.getSnapshot().output.preferences.format).toBe('webm')
})

test('result survives editing, cancellation, and failure; only new completion replaces it', () => {
  const s = session()
  s.ready()
  s.controller.startExport()
  s.advance(8000)
  const first = s.controller.getSnapshot().output
  s.controller.navigate('create')
  s.controller.updatePreferences({ details: { ...defaultPreferences().details, title: 'Second frame' } })
  expect(s.controller.getSnapshot().output.preferences.details.title).toBe('A moment in colour')
  s.controller.startExport()
  s.controller.cancelExport()
  expect(s.controller.getSnapshot().output).toBe(first)
  s.controller.navigate('files')
  s.controller.selectSample('audio', 'failure')
  s.advance(600)
  s.controller.startExport()
  s.advance(4000)
  expect(s.controller.getSnapshot().output).toBe(first)
  s.controller.startExport()
  s.advance(8000)
  expect(s.controller.getSnapshot().output).not.toBe(first)
  expect(s.controller.getSnapshot().output.preferences.details.title).toBe('Second frame')
})

test('one-hour retention is anchored to completion and not to download clicks', () => {
  const s = session()
  s.ready()
  s.controller.startExport()
  s.advance(8000)
  const completed = s.controller.getSnapshot().output
  expect(completed.expiresAt - completed.createdAt).toBe(outputLifetime)
  s.advance(outputLifetime - 1)
  s.controller.simulateDownload()
  expect(s.controller.getSnapshot().announcement).toBe('Demo only — no file was saved.')
  expect(s.controller.getSnapshot().output.expiresAt).toBe(completed.expiresAt)
  expect(s.controller.getSnapshot().output.expired).toBe(false)
  s.advance(1)
  expect(s.controller.getSnapshot().output.expired).toBe(true)
  expect(s.tasks.size).toBe(0)
  s.controller.navigate('export')
  s.controller.startExport()
  s.advance(8000)
  expect(s.controller.getSnapshot().output.expired).toBe(false)
})

test('focus refresh expires output even when background timers have not run', () => {
  const s = session()
  s.ready()
  s.controller.startExport()
  s.advance(8000)
  s.jump(outputLifetime + 1000)
  s.controller.checkExpiry()
  expect(s.controller.getSnapshot().output.expired).toBe(true)
  expect(s.tasks.size).toBe(0)
})

test('preset confirmation preserves selections; invalid samples preserve current preferences', () => {
  const s = session()
  s.ready()
  s.controller.updatePreferences({ sensitivity: 25 })
  const before = s.controller.getSnapshot().preferences
  s.controller.selectSample('preset', 'bad-preset')
  expect(s.controller.getSnapshot().preferences).toBe(before)
  expect(s.controller.getSnapshot().settingsError).toContain('invalid')
  s.controller.selectSample('preset', 'preset')
  expect(s.controller.getSnapshot().dialog).toBe('replace')
  s.controller.setDialog(null)
  expect(s.controller.getSnapshot().preferences).toBe(before)
  s.controller.selectSample('preset', 'preset')
  s.controller.applyPreset()
  expect(s.controller.getSnapshot().preferences.mode).toBe('lighting')
  expect(s.controller.getSnapshot().preferences.format).toBe('webm')
  expect(canCreate(s.controller.getSnapshot())).toBe(true)
  expect(s.controller.getSnapshot().settingsError).toBeUndefined()
})

test('only predefined timed lyrics follow the sample clock; edited lyrics stay static', () => {
  const s = session()
  s.controller.selectSample('lyrics', 'lyrics')
  const preferences = s.controller.getSnapshot().preferences
  expect(preferences.lyricsText).toBe(sampleLrc)
  expect(previewLyric(preferences, 13)).toBe('Every sound becomes a story')
  expect(previewLyric(preferences, 24)).toBe('A moment in colour')
  s.controller.selectSample('lyrics', 'bad-lyrics')
  expect(s.controller.getSnapshot().lyricsError).toContain('invalid timestamps')
  expect(s.controller.getSnapshot().preferences).toBe(preferences)
  s.controller.updatePreferences({ lyricsText: '[00:20] My edited lyric\n[00:30] Another line' })
  expect(previewLyric(s.controller.getSnapshot().preferences, 50)).toBe('My edited lyric')
  expect(s.controller.getSnapshot().lyricsError).toBeUndefined()
})

test('simulated playback clamps seeking and volume, pauses on navigation, and clears timers', () => {
  const s = session()
  s.ready()
  s.controller.togglePlayback()
  s.advance(2000)
  expect(s.controller.getSnapshot().playback.currentTime).toBe(2)
  s.controller.seek(999)
  expect(s.controller.getSnapshot().playback.currentTime).toBe(222)
  s.controller.setVolume(-4)
  expect(s.controller.getSnapshot().playback.volume).toBe(0)
  s.controller.navigate('files')
  expect(s.controller.getSnapshot().playback.playing).toBe(false)
  expect(s.tasks.size).toBe(0)
  s.controller.togglePlayback()
  s.controller.clear()
  s.advance(2000)
  expect(s.controller.getSnapshot().playback.currentTime).toBe(0)
  expect(s.controller.getSnapshot().preferences).toEqual(defaultPreferences())
  expect(s.tasks.size).toBe(0)
})
