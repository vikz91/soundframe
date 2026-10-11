'use client'

import { useAudioPlayback } from '@/hooks/use-audio-playback'
import { useFilePicker } from '@/hooks/use-file-picker'
import { Trash, UploadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

function durationLabel(seconds: number) {
  const rounded = Math.floor(seconds)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

export function LocalAudioPlayer({
  readyMessage = 'Ready for local playback.',
  onAudioElement,
  onAudioPlay,
  onAudioPause
}: {
  readyMessage?: string
  onAudioElement?: (element: HTMLAudioElement | null) => void
  onAudioPlay?: () => void
  onAudioPause?: () => void
}) {
  const { track, reading, error, selectTrack, clearTrack, audioProps } = useAudioPlayback({ onAudioElement })
  const { inputRef, open, reset, onChange } = useFilePicker(selectTrack, reading)
  function removeTrack() {
    clearTrack()
    reset()
  }

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7" aria-label="Local audio">
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.mp4,audio/mpeg,audio/wav,audio/mp4,video/mp4"
        aria-label="Choose local audio file"
        className="sr-only"
        tabIndex={-1}
        onChange={onChange}
      />
      {track ? (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium text-primary">ON YOUR DEVICE</p>
              <p className="truncate font-semibold" title={track.name}>
                {track.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(track.size / 1024 / 1024).toFixed(2)} MB
                {track.duration !== null ? ` · ${durationLabel(track.duration)}` : ' · Checking playback…'}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Remove audio" onClick={removeTrack}>
              <Trash size={18} />
            </Button>
          </div>
          <audio
            key={track.url}
            {...audioProps}
            src={track.url}
            controls
            preload="metadata"
            aria-label="Local audio playback"
            className="w-full"
            onPlay={onAudioPlay}
            onPause={onAudioPause}
            onEnded={onAudioPause}
          />
          <Button variant="outline" className="mt-5 w-full" onClick={open}>
            Choose another track
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-muted/40 px-4 py-7 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border bg-background text-primary">
            <UploadSimple size={24} />
          </span>
          <h2 className="font-heading text-lg font-semibold">Start with a track</h2>
          <p className="mt-1 text-sm text-muted-foreground">MP3, WAV, M4A, or MP4</p>
          <Button className="mt-5 px-5" onClick={open} disabled={reading}>
            {reading ? 'Reading on your device…' : 'Choose audio file'}
          </Button>
          {reading ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={removeTrack}>
              Cancel
            </Button>
          ) : null}
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-4 text-center text-xs text-muted-foreground">
        {reading ? 'Reading your file locally.' : track ? readyMessage : 'Your file stays in this browser.'}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
