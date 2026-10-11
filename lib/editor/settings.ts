import { z } from 'zod'
import { parseLrc } from './lyrics'
import type { EditorPreferences } from './types'

export const settingsFileLimit = 128 * 1024

const preferencesSchema = z
  .strictObject({
    mode: z.enum(['cover', 'spectrum', 'lighting']),
    accent: z.enum(['teal', 'aqua', 'mint', 'blue', 'violet']),
    background: z.enum(['midnight', 'glow', 'slate']),
    sensitivity: z.number().finite().min(0).max(100),
    typography: z.enum(['sans', 'heading', 'mono']),
    details: z.strictObject({
      title: z.string().max(200),
      artist: z.string().max(200),
      album: z.string().max(200),
      website: z.string().max(200)
    }),
    lyricsMode: z.enum(['plain', 'lrc']),
    lyricsText: z.string().max(20000),
    format: z.enum(['mp4', 'webm'])
  })
  .superRefine((preferences, context) => {
    if (preferences.lyricsMode !== 'lrc') return
    for (const issue of parseLrc(preferences.lyricsText).errors) {
      context.addIssue({ code: 'custom', path: ['lyricsText'], message: `Line ${issue.line}: ${issue.message}` })
    }
  })

/** Strict allowlist: no media references, credentials, extra keys or future versions. */
export const settingsSchema = z.strictObject({ version: z.literal(1), preferences: preferencesSchema })

export function parseSettings(text: string): EditorPreferences {
  if (new TextEncoder().encode(text).byteLength > settingsFileLimit) {
    throw new Error('Settings files must be 128 KB or smaller.')
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('Choose a valid Audioframe JSON settings file.')
  }
  const result = settingsSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new Error(`Invalid settings at ${issue.path.join('.') || 'file'}: ${issue.message}`)
  }
  return result.data.preferences
}

export function serializeSettings(preferences: EditorPreferences): string {
  const checked = settingsSchema.parse({ version: 1, preferences })
  return JSON.stringify(checked, null, 2)
}
