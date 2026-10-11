'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash, UploadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type Track = {
  name: string
  url: string
  size: number
  duration: number | null
}

function durationLabel(seconds: number) {
  const rounded = Math.floor(seconds)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

export function LocalAudioPlayer({ readyMessage = 'Ready for local playback.' }: { readyMessage?: string }) {
  const [track, setTrack] = useState<Track | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const reader = useRef<FileReader | null>(null)
  const objectURL = useRef<string | null>(null)

  const bindAudio = useCallback((element: HTMLAudioElement | null) => {
    // Stop playback when React removes/replaces the element, before clearing the ref.
    if (!element && audio.current) {
      audio.current.pause()
      audio.current.removeAttribute('src')
      audio.current.load()
    }
    audio.current = element
  }, [])

  const release = useCallback(() => {
    if (reader.current) {
      reader.current.onload = null
      reader.current.onerror = null
      reader.current.abort()
      reader.current = null
    }
    if (audio.current) {
      audio.current.pause()
      audio.current.removeAttribute('src')
      audio.current.load()
    }
    if (objectURL.current) URL.revokeObjectURL(objectURL.current)
    objectURL.current = null
  }, [])
  useEffect(
    () => () => {
      release()
      // Next.js can retain this page's state while hiding it. Drop the released track too.
      setTrack(null)
      setReading(false)
    },
    [release]
  )

  function clearTrack() {
    release()
    setTrack(null)
    setReading(false)
    setError(null)
    if (input.current) input.current.value = ''
  }

  function readAudio(file: File) {
    clearTrack()
    if (!/\.(mp3|wav|m4a|mp4)$/i.test(file.name)) {
      setError('Choose an MP3, WAV, M4A, or MP4 audio file.')
      return
    }
    if (!file.size) {
      setError('This file is empty. Choose another audio file.')
      return
    }
    const current = new FileReader()
    reader.current = current
    setReading(true)
    current.onerror = () => {
      if (reader.current !== current) return
      reader.current = null
      setReading(false)
      setError('We could not read this file. Please try again.')
    }
    current.onload = () => {
      if (reader.current !== current) return
      reader.current = null
      setReading(false)
      if (!(current.result instanceof ArrayBuffer)) {
        setError('We could not read this audio file.')
        return
      }
      const extension = file.name.split('.').at(-1)?.toLowerCase()
      const mimeType = extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4'
      const url = URL.createObjectURL(new Blob([current.result], { type: file.type || mimeType }))
      objectURL.current = url
      setTrack({
        name: file.name,
        url,
        size: current.result.byteLength,
        duration: null
      })
    }
    current.readAsArrayBuffer(file)
  }

  function rejectPlayback(url: string, message: string) {
    if (objectURL.current !== url) return
    clearTrack()
    setError(message)
  }

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7" aria-label="Local audio">
      <input
        ref={input}
        type="file"
        accept=".mp3,.wav,.m4a,.mp4,audio/mpeg,audio/wav,audio/mp4,video/mp4"
        aria-label="Choose local audio file"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) readAudio(file)
        }}
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
            <Button variant="ghost" size="icon" aria-label="Remove audio" onClick={clearTrack}>
              <Trash size={18} />
            </Button>
          </div>
          <audio
            key={track.url}
            ref={bindAudio}
            src={track.url}
            controls
            preload="metadata"
            aria-label="Local audio playback"
            className="w-full"
            onLoadedMetadata={(event) => {
              if (objectURL.current !== track.url) return
              const duration = event.currentTarget.duration
              if (!Number.isFinite(duration) || duration <= 0) {
                rejectPlayback(track.url, 'This file has no playable audio. Choose another file.')
              } else if (duration > 420) {
                rejectPlayback(track.url, 'Choose a track that is 7 minutes or shorter.')
              } else {
                setTrack((current) => (current?.url === track.url ? { ...current, duration } : current))
              }
            }}
            onError={() => rejectPlayback(track.url, 'Your browser cannot play this file. Try an MP3 or WAV file.')}
          />
          <Button variant="outline" className="mt-5 w-full" onClick={() => input.current?.click()}>
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
          <Button className="mt-5 px-5" onClick={() => input.current?.click()} disabled={reading}>
            {reading ? 'Reading on your device…' : 'Choose audio file'}
          </Button>
          {reading ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={clearTrack}>
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
