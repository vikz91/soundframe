import { readFile } from '@/lib/browser-files'
import { parseSettings, settingsFileLimit } from './settings'
import { parseLrc } from './lyrics'

const MAX_TEXT_BYTES = 256 * 1024

async function readText(file: File, extension: RegExp, signal: AbortSignal, maxBytes = MAX_TEXT_BYTES) {
  if (!extension.test(file.name)) throw new Error('Choose the supported file type.')
  if (!file.size || file.size > maxBytes) throw new Error(`Choose a non-empty text file up to ${maxBytes / 1024} KiB.`)
  const text = await readFile(file, 'text', signal)
  signal.throwIfAborted()
  return text
}

export async function readSettingsFile(file: File, signal: AbortSignal) {
  return parseSettings(await readText(file, /\.json$/i, signal, settingsFileLimit))
}

export async function readLyricsFile(file: File, signal: AbortSignal) {
  const text = await readText(file, /\.lrc$/i, signal)
  const parsed = parseLrc(text)
  if (parsed.errors.length) {
    const first = parsed.errors[0]
    throw new Error(`LRC line ${first.line}: ${first.message}`)
  }
  return { text, name: file.name }
}
