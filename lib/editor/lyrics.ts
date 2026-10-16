import { MAX_AUDIO_SECONDS } from '@/lib/media-limits'

export type LyricCue = Readonly<{ time: number; text: string; line: number }>
export type LyricIssue = { line: number; message: string }
export type ParsedLrc = { cues: LyricCue[]; errors: LyricIssue[]; offset: number }

/** Supports [m:ss], 1–3 decimal digits, repeated timestamps and signed millisecond offset.
 * Positive offset advances lyrics; equal timestamps use the last source occurrence.
 * Metadata is accepted but never displayed. Enhanced/word-level LRC is unsupported.
 */
export function parseLrc(text: string): ParsedLrc {
  const cues: LyricCue[] = []
  const errors: LyricIssue[] = []
  let offset = 0
  let hasOffset = false
  if (text.length > 20000) {
    return { cues, errors: [{ line: 1, message: 'Lyrics must contain at most 20,000 characters.' }], offset }
  }
  text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((source, index) => {
      const line = index + 1
      const value = source.trim()
      if (!value) return
      const metadata = /^\[(ar|ti|al|by|re|ve|length):[^\]\r\n]*\]$/i
      if (metadata.test(value)) return
      const offsetTag = /^\[offset:([+-]?\d+)\]$/i.exec(value)
      if (offsetTag) {
        const milliseconds = Number(offsetTag[1])
        const maxOffset = MAX_AUDIO_SECONDS * 1000
        if (hasOffset || !Number.isSafeInteger(milliseconds) || Math.abs(milliseconds) > maxOffset) {
          errors.push({ line, message: `Use one offset tag with milliseconds between -${maxOffset} and ${maxOffset}.` })
        } else {
          offset = milliseconds
          hasOffset = true
        }
        return
      }
      const stamps: number[] = []
      let remainder = value
      for (;;) {
        const match = /^\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/.exec(remainder)
        if (!match) break
        stamps.push(Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3] ?? '0'}`))
        remainder = remainder.slice(match[0].length)
      }
      if (!stamps.length || remainder.startsWith('[') || /<\d+:\d+/.test(remainder)) {
        errors.push({ line, message: 'Use [mm:ss] or [mm:ss.fff] timestamps; seconds must be 00–59.' })
        return
      }
      for (const time of stamps) cues.push({ time, text: remainder.trim(), line })
    })
  const shifted = cues.map((cue) => ({ ...cue, time: Math.max(0, cue.time - offset / 1000) }))
  shifted.sort((a, b) => a.time - b.time)
  if (text.trim() && !shifted.length && !errors.length) {
    errors.push({ line: 1, message: 'Add at least one timestamped lyric line.' })
  }
  return { cues: shifted, errors, offset }
}

/** Binary lookup also handles backward seeking and explicit empty cues. */
export function lyricAt(cues: readonly LyricCue[], seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  let low = 0
  let high = cues.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (cues[middle].time <= seconds) low = middle + 1
    else high = middle
  }
  return low ? cues[low - 1].text : ''
}
