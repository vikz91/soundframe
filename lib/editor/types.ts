import type { SongDetails, Typography, VideoFormat, VisualMode } from '@/lib/audioframe-design'
import type { VideoResolution } from './resolution'

/** Media-free preferences shared by preview frames and future encoding. */
export type EditorPreferences = {
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
