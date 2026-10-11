/** Shared options reference semantic CSS tokens, never duplicate their values. */
export const accentColours = [
  { value: 'teal', label: 'Teal', token: '--primary' },
  { value: 'aqua', label: 'Aqua', token: '--swatch-aqua' },
  { value: 'mint', label: 'Mint', token: '--swatch-mint' },
  { value: 'blue', label: 'Blue', token: '--swatch-blue' },
  { value: 'violet', label: 'Violet', token: '--swatch-violet' }
] as const

export const backgroundColours = [
  { value: 'midnight', label: 'Midnight', token: '--media' },
  { value: 'glow', label: 'Deep teal', token: '--media-glow' },
  { value: 'slate', label: 'Slate', token: '--swatch-slate' }
] as const

export const visualModes = [
  { value: 'cover', label: 'Cover', description: 'Artwork with optional text.' },
  { value: 'spectrum', label: 'Spectrum', description: 'Sound bars with a small cover.' },
  { value: 'lighting', label: 'Lighting', description: 'Audio-reactive glow and pulses.' }
] as const

export const videoFormats = [
  { value: 'mp4', label: 'MP4', description: 'H.264 video · AAC audio' },
  { value: 'webm', label: 'WebM', description: 'VP8 video · Opus audio' }
] as const

export type VisualMode = (typeof visualModes)[number]['value']
export type VideoFormat = (typeof videoFormats)[number]['value']
export type ColourOption = { value: string; label: string; token: string }
export type SongDetails = { title: string; artist: string; album: string; website: string }
export type Typography = 'sans' | 'heading' | 'mono'

export const typographyClasses: Record<Typography, string> = {
  sans: 'font-sans',
  heading: 'font-heading',
  mono: 'font-mono'
}

export const mediaInputAccept = {
  audio: '.mp3,.m4a,.wav,.mp4,audio/mpeg,audio/wav,audio/mp4,video/mp4',
  artwork: '.jpg,.jpeg,.png,image/jpeg,image/png'
} as const

export const videoOutputLabel = '568 × 320 · 30 fps'
