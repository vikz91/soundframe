import { expect, test } from 'bun:test'
import { lyricAt, parseLrc } from './lyrics'

test('LRC accepts decimals, multiple stamps and metadata; sorted lookup supports seeking', () => {
  const result = parseLrc('\uFEFF[ar:Artist]\r\n[00:03.123]third\r\n[0:01.1][00:02.12]repeat\r\n[00:04]')
  expect(result.errors).toEqual([])
  expect(result.cues.map((cue) => cue.time)).toEqual([1.1, 2.12, 3.123, 4])
  expect(lyricAt(result.cues, 0)).toBe('')
  expect(lyricAt(result.cues, 3.123)).toBe('third')
  expect(lyricAt(result.cues, 1.1)).toBe('repeat')
  expect(lyricAt(result.cues, 4)).toBe('')
  expect(lyricAt(result.cues, NaN)).toBe('')
})

test('offset applies to all lines even when declared last; equal-time last occurrence wins', () => {
  const result = parseLrc('[00:00.5]first\n[00:00.5]last\n[offset:+1000]')
  expect(result.errors).toEqual([])
  expect(result.cues.map((cue) => cue.time)).toEqual([0, 0])
  expect(lyricAt(result.cues, 0)).toBe('last')
  const delayed = parseLrc('[offset:-2000]\n[00:01]later')
  expect(lyricAt(delayed.cues, 2.99)).toBe('')
  expect(lyricAt(delayed.cues, 3)).toBe('later')
})

test('invalid seconds, fractional precision, untagged and enhanced lyrics report source lines', () => {
  const source = '[00:60]bad\n[00:01.1234]bad\nplain\n[00:01]<00:01.5>word\n[00:01][broken]text'
  const result = parseLrc(source)
  expect(result.errors.map((issue) => issue.line)).toEqual([1, 2, 3, 4, 5])
  expect(result.cues).toEqual([])
  expect(parseLrc('[offset:1]\n[offset:2]').errors[0].line).toBe(2)
  expect(parseLrc('[offset:420001]').errors).toHaveLength(1)
  expect(parseLrc('[ti:Song]').errors).toHaveLength(1)
  expect(parseLrc('').errors).toEqual([])
  expect(parseLrc('x'.repeat(20001)).errors).toHaveLength(1)
})
