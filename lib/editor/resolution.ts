export const videoSizes = {
  '320p': { width: 568, height: 320 },
  '720p': { width: 1280, height: 720 }
} as const

export type VideoResolution = keyof typeof videoSizes

export const videoResolutions = [
  { value: '320p', label: '320p', description: '568 × 320 · Faster exports, smaller files' },
  { value: '720p', label: '720p', description: '1280 × 720 · More detail, longer exports' }
] as const

export function videoSizeLabel(resolution: VideoResolution) {
  const { width, height } = videoSizes[resolution]
  return `${width} × ${height} · 30 fps`
}
