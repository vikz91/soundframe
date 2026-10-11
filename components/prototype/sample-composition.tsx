import { accentColours, backgroundColours, typographyClasses } from '@/lib/audioframe-design'
import { previewLyric } from '@/lib/prototype/fixtures'
import { cn } from '@/lib/utils'
import type { CompositionProps } from './types'

/** Decorative artwork shared by all fixture views; no decoded media. */
export function SampleArtwork({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn('size-full', className)}>
      <rect width="200" height="200" rx="20" fill="var(--media-glow)" />
      <path d="M-20 55 Q100 -70 220 80 L220 140 Q65 20 -20 135Z" fill="var(--media-accent)" opacity=".5" />
      <path d="M25 200 Q100 100 55 -20 L125 -20 Q40 110 170 200Z" fill="var(--swatch-aqua)" opacity=".3" />
      <circle cx="150" cy="55" r="60" fill="var(--media-accent)" opacity=".12" />
    </svg>
  )
}

const barHeights = [18, 32, 22, 56, 40, 68, 46, 82, 54, 92, 64, 48, 78, 58, 96, 70, 52, 84, 60, 36, 66, 42, 26, 14]

export function SampleComposition({ preferences, currentTime = 0, playing = false, className }: CompositionProps) {
  const accent = accentColours.find((item) => item.value === preferences.accent)?.token ?? '--primary'
  const background = backgroundColours.find((item) => item.value === preferences.background)?.token ?? '--media'
  const lyric = previewLyric(preferences, currentTime)
  const cover = preferences.mode === 'cover'
  return (
    <div
      role="img"
      aria-label={`${preferences.mode} sample composition: ${preferences.details.title || 'Untitled'}, ${preferences.details.artist || 'Your Artist'}${lyric ? `, ${lyric}` : ''}`}
      className={cn(
        '@container relative size-full overflow-hidden text-media-foreground',
        typographyClasses[preferences.typography],
        className
      )}
      style={{ backgroundColor: `var(${background})` }}
    >
      {preferences.mode === 'lighting' ? (
        <div
          aria-hidden="true"
          className={cn(
            'absolute -inset-1/4 rounded-full blur-3xl transition-opacity duration-(--motion-duration)',
            playing && 'animate-pulse motion-reduce:animate-none'
          )}
          style={{
            background: `radial-gradient(ellipse, var(${accent}), transparent 65%)`,
            opacity: Math.max(0.12, preferences.sensitivity / 150)
          }}
        />
      ) : null}
      <div className={cn('absolute inset-0 flex gap-[5%] p-[6%]', cover ? 'items-center' : 'items-start')}>
        <div
          className={cn(
            'aspect-square shrink-0 overflow-hidden rounded-preview shadow-control',
            cover ? 'w-[38%]' : 'w-[19%]'
          )}
        >
          <SampleArtwork />
        </div>
        <div className={cn('relative min-w-0 flex-1', cover ? 'space-y-3' : 'space-y-1')}>
          <p className="line-clamp-2 text-media-title font-semibold leading-tight">
            {preferences.details.title || 'Untitled'}
          </p>
          <p className="truncate text-media-detail text-media-muted">{preferences.details.artist || 'Your Artist'}</p>
          {preferences.details.album ? (
            <p className="truncate text-media-detail text-media-muted">{preferences.details.album}</p>
          ) : null}
          {preferences.details.website ? (
            <p className="truncate text-media-detail text-media-muted">{preferences.details.website}</p>
          ) : null}
          {cover && lyric ? <p className="line-clamp-2 pt-2 text-media-detail">{lyric}</p> : null}
        </div>
      </div>
      {preferences.mode === 'spectrum' ? (
        <div aria-hidden="true" className="absolute inset-x-[6%] bottom-[10%] flex h-[32%] items-end gap-[1.2%]">
          {barHeights.map((height, index) => (
            <span
              key={index}
              className={cn(
                'flex-1 rounded-t-control transition-[height] duration-(--motion-duration)',
                playing && 'animate-pulse motion-reduce:animate-none'
              )}
              style={{
                height: `${Math.max(8, (height * preferences.sensitivity) / 100)}%`,
                backgroundColor: `var(${accent})`,
                animationDelay: `${index * 70}ms`
              }}
            />
          ))}
        </div>
      ) : null}
      {!cover && lyric ? (
        <p className="absolute inset-x-[6%] bottom-[3%] truncate text-center text-media-detail">{lyric}</p>
      ) : null}
    </div>
  )
}
