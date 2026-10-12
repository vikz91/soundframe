import type { SongDetails, Typography, VideoFormat, VisualMode } from '@/lib/audioframe-design'
import type { VideoResolution } from './resolution'

export type FullCoverPreferences = {
  accent: 'teal' | 'aqua' | 'mint' | 'blue' | 'violet'
  sensitivity: number
  typography: Typography
  visualization: 'bars' | 'none'
  pattern: 'thin' | 'bold' | 'segmented'
  colour: 'ivory' | 'accent'
  height: number
  fade: number
  framing: 'fit' | 'fill'
  positionX: number
  positionY: number
}

export function defaultFullCoverPreferences(): FullCoverPreferences {
  return {
    accent: 'teal',
    sensitivity: 60,
    typography: 'heading',
    visualization: 'bars',
    pattern: 'thin',
    colour: 'ivory',
    height: 15,
    fade: 45,
    framing: 'fit',
    positionX: 50,
    positionY: 50
  }
}

/** Media-free preferences shared by preview frames and future encoding. */
export type EditorPreferences = {
  layout: 'classic' | 'full-cover'
  fullCover: FullCoverPreferences
  mode: VisualMode
  accent: 'teal' | 'aqua' | 'mint' | 'blue' | 'violet'
  background: 'midnight' | 'glow' | 'slate'
  sensitivity: number
  typography: Typography
  details: SongDetails
  lyricsMode: 'plain' | 'lrc'
  lyricsText: string
  format: VideoFormat
  resolution: VideoResolution
}

export function defaultEditorPreferences(): EditorPreferences {
  return {
    layout: 'classic',
    fullCover: defaultFullCoverPreferences(),
    mode: 'cover',
    accent: 'teal',
    background: 'midnight',
    sensitivity: 60,
    typography: 'heading',
    details: { title: '', artist: '', album: '', website: '' },
    lyricsMode: 'plain',
    lyricsText: '',
    format: 'mp4',
    resolution: '320p'
  }
}

/** Full-cover bars are independent of the classic visual mode retained by the layout toggle. */
export function needsAudioAnalysis(preferences: EditorPreferences): boolean {
  return preferences.layout === 'full-cover'
    ? preferences.fullCover.visualization === 'bars'
    : preferences.mode !== 'cover'
}
