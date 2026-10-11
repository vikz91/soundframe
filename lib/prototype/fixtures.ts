import type { SongDetails, Typography, VideoFormat, VisualMode } from '@/lib/audioframe-design'

export type SampleKind = 'audio' | 'artwork' | 'preset' | 'lyrics'
export type SampleOption = {
  id: string
  label: string
  description: string
  filename: string
  detail: string
  error?: string
  duration?: number
  failsExport?: boolean
}
export type PrototypePreferences = {
  mode: VisualMode
  accent: string
  background: string
  sensitivity: number
  typography: Typography
  details: SongDetails
  lyricsMode: 'plain' | 'lrc'
  lyricsText: string
  lyricsFilename?: string
  format: VideoFormat
}

export const prototypeLabel = 'Prototype — sample media and simulated processing'
export const sampleCues = [
  { time: 0, text: 'Let the colour carry you' },
  { time: 12, text: 'Every sound becomes a story' },
  { time: 24, text: 'A moment in colour' }
] as const
export const sampleLrc =
  '[00:00.00] Let the colour carry you\n[00:12.00] Every sound becomes a story\n[00:24.00] A moment in colour'

export function defaultPreferences(): PrototypePreferences {
  return {
    mode: 'spectrum',
    accent: 'teal',
    background: 'midnight',
    sensitivity: 60,
    typography: 'heading',
    details: { title: 'A moment in colour', artist: 'Your Artist', album: '', website: '' },
    lyricsMode: 'plain',
    lyricsText: '',
    format: 'mp4'
  }
}
export function presetPreferences(): PrototypePreferences {
  return {
    ...defaultPreferences(),
    mode: 'lighting',
    accent: 'violet',
    background: 'glow',
    sensitivity: 75,
    details: { title: 'After the rain', artist: 'Colour Collective', album: 'Small hours', website: 'example.com' },
    lyricsMode: 'lrc',
    lyricsText: sampleLrc,
    lyricsFilename: 'sample-lyrics.lrc',
    format: 'webm'
  }
}
export const sampleOptions: Record<SampleKind, readonly SampleOption[]> = {
  audio: [
    {
      id: 'track',
      label: 'A moment in colour',
      description: 'Valid audio sample for the complete journey.',
      filename: 'a-moment-in-colour.mp3',
      detail: '3:42 · MP3 · Sample only',
      duration: 222
    },
    {
      id: 'long',
      label: 'Overlong track',
      description: 'Demonstrates the seven-minute limit.',
      filename: 'long-track.wav',
      detail: '8:15 · WAV · Invalid sample',
      error: 'This sample is 8:15. Choose a track no longer than 7 minutes.'
    },
    {
      id: 'failure',
      label: 'Export failure example',
      description: 'A valid sample that simulates one export failure; Retry succeeds.',
      filename: 'export-failure-example.m4a',
      detail: '3:42 · M4A · Failure demonstration',
      duration: 222,
      failsExport: true
    }
  ],
  artwork: [
    {
      id: 'cover',
      label: 'Colour study',
      description: 'Abstract sample artwork, ready for the composition.',
      filename: 'colour-study.png',
      detail: '1200 × 1200 · PNG · Sample only'
    },
    {
      id: 'bad-cover',
      label: 'Invalid artwork',
      description: 'Demonstrates artwork that cannot be decoded.',
      filename: 'unreadable-artwork.jpg',
      detail: 'JPG · Invalid sample',
      error: 'This sample artwork could not be read. Choose the Colour study sample.'
    }
  ],
  preset: [
    {
      id: 'preset',
      label: 'Small hours settings',
      description: 'Lighting, violet accents, song details, timed lyrics, and WebM.',
      filename: 'small-hours.json',
      detail: 'Appearance and text only · No media'
    },
    {
      id: 'bad-preset',
      label: 'Invalid settings',
      description: 'Demonstrates an unsupported preset.',
      filename: 'invalid-settings.json',
      detail: 'Invalid sample',
      error: 'These sample settings are invalid. Your current settings have been kept.'
    }
  ],
  lyrics: [
    {
      id: 'lyrics',
      label: 'Timed sample lyrics',
      description: 'Three supplied cues at 0:00, 0:12, and 0:24.',
      filename: 'sample-lyrics.lrc',
      detail: 'LRC · Predefined sample timing'
    },
    {
      id: 'bad-lyrics',
      label: 'Invalid timed lyrics',
      description: 'Demonstrates malformed timestamps.',
      filename: 'invalid-lyrics.lrc',
      detail: 'Invalid sample',
      error: 'This LRC sample has invalid timestamps. Choose Timed sample lyrics or use plain text.'
    }
  ]
}

export function previewLyric(preferences: PrototypePreferences, currentTime: number) {
  if (preferences.lyricsMode === 'lrc' && preferences.lyricsText === sampleLrc) {
    return [...sampleCues].reverse().find((cue) => cue.time <= currentTime)?.text ?? ''
  }
  return (
    preferences.lyricsText
      .split('\n')
      .find((line) => line.trim())
      ?.replace(/^\[[^\]]*\]\s*/, '') ?? ''
  )
}
