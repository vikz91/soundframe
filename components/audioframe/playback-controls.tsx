'use client'

import { PlayIcon, PauseIcon, SpeakerHighIcon } from '@phosphor-icons/react'
import { Slider } from '@/components/ui/slider'
import { IconButton } from './icon-button'
import { cn } from '@/lib/utils'

export function formatPlaybackTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

/** Controlled UI; the caller connects these callbacks to an audio/video element. */
export function PlaybackControls({
  playing,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  disabled = false,
  className
}: {
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  onPlayPause: () => void
  onSeek: (seconds: number) => void
  onVolumeChange: (volume: number) => void
  disabled?: boolean
  className?: string
}) {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0
  const safeTime = Number.isFinite(currentTime) ? Math.min(safeDuration, Math.max(0, currentTime)) : 0
  const safeVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0
  const unavailable = disabled || safeDuration === 0
  return (
    <div
      role="group"
      aria-label="Playback controls"
      className={cn('flex flex-wrap items-center gap-3 rounded-control border bg-card p-3', className)}
    >
      <IconButton label={playing ? 'Pause playback' : 'Play playback'} onClick={onPlayPause} disabled={unavailable}>
        {playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
      </IconButton>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatPlaybackTime(safeTime)} / {formatPlaybackTime(safeDuration)}
      </span>
      <Slider
        aria-label="Seek position"
        aria-valuetext={`${formatPlaybackTime(safeTime)} of ${formatPlaybackTime(safeDuration)}`}
        value={[safeTime]}
        min={0}
        max={Math.max(1, safeDuration)}
        step={1}
        onValueChange={(value) => onSeek(typeof value === 'number' ? value : value[0])}
        disabled={unavailable}
        className="min-w-24 flex-1"
      />
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <SpeakerHighIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        <Slider
          aria-label="Volume"
          value={[safeVolume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(value) => onVolumeChange(typeof value === 'number' ? value : value[0])}
          disabled={disabled}
          className="w-24"
        />
      </div>
    </div>
  )
}
