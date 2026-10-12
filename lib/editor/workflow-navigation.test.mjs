import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  readWorkflowSearch,
  resolveWorkflowPhase,
  subscribeWorkflowPhase,
  writeWorkflowPhase
} from './workflow-navigation'

const originalWindow = globalThis.window
const ready = { available: true, hasResult: false, busy: false }
let entries, cursor, browser

beforeEach(() => {
  entries = ['https://example.test/create?source=local#preview']
  cursor = 0
  browser = new EventTarget()
  Object.defineProperty(browser, 'location', { get: () => new URL(entries[cursor]) })
  browser.history = {
    pushState: (_state, _title, url) => {
      entries.splice(++cursor, entries.length, String(url))
    },
    replaceState: (_state, _title, url) => {
      entries[cursor] = String(url)
    },
    back: () => {
      if (cursor > 0) cursor--
      browser.dispatchEvent(new Event('popstate'))
    },
    forward: () => {
      if (cursor < entries.length - 1) cursor++
      browser.dispatchEvent(new Event('popstate'))
    }
  }
  globalThis.window = browser
})

afterEach(() => {
  globalThis.window = originalWindow
})

test('valid phases require their local inputs; invalid and fresh-session links fall back to Files', () => {
  for (const phase of ['files', 'create', 'export']) expect(resolveWorkflowPhase(phase, ready)).toBe(phase)
  for (const phase of [null, '', 'download', 'CREATE']) expect(resolveWorkflowPhase(phase, ready)).toBe('files')
  for (const phase of ['create', 'export'])
    expect(resolveWorkflowPhase(phase, { ...ready, available: false })).toBe('files')
})

test('retained results remain accessible without inputs; active encoding stays on Export', () => {
  const resultOnly = { ...ready, available: false, hasResult: true }
  expect(resolveWorkflowPhase('export', resultOnly)).toBe('export')
  expect(resolveWorkflowPhase('create', resultOnly)).toBe('files')
  for (const phase of [null, 'files', 'create', 'export', 'invalid'])
    expect(resolveWorkflowPhase(phase, { ...ready, busy: true })).toBe('export')
})

test('initialisation and reset replace entries; phase changes preserve other query parameters and fragments', () => {
  writeWorkflowPhase('files', true)
  expect(entries).toHaveLength(1)
  writeWorkflowPhase('create')
  writeWorkflowPhase('export')
  expect(entries).toHaveLength(3)
  expect(browser.location.pathname).toBe('/create')
  expect(browser.location.searchParams.get('source')).toBe('local')
  expect(browser.location.hash).toBe('#preview')
  writeWorkflowPhase('files', true)
  expect(entries).toHaveLength(3)
  expect(browser.location.searchParams.get('phase')).toBe('files')
})

test('Back and Forward notify the subscriber; repeated selections add no history and disposal stops updates', () => {
  const seen = []
  const unsubscribe = subscribeWorkflowPhase(() => seen.push(new URLSearchParams(readWorkflowSearch()).get('phase')))
  writeWorkflowPhase('files', true)
  writeWorkflowPhase('create')
  writeWorkflowPhase('create')
  writeWorkflowPhase('export')
  browser.history.back()
  browser.history.back()
  browser.history.forward()
  browser.history.forward()
  expect(seen).toEqual(['files', 'create', 'export', 'create', 'files', 'create', 'export'])
  expect(entries).toHaveLength(3)
  unsubscribe()
  browser.history.back()
  writeWorkflowPhase('files')
  expect(seen).toHaveLength(7)
})

test('new phase navigation after Back replaces the forward branch instead of retaining stale phases', () => {
  writeWorkflowPhase('files', true)
  writeWorkflowPhase('create')
  writeWorkflowPhase('export')
  browser.history.back()
  writeWorkflowPhase('files')
  browser.history.forward()
  expect(new URLSearchParams(readWorkflowSearch()).get('phase')).toBe('files')
  expect(entries).toHaveLength(3)
})
