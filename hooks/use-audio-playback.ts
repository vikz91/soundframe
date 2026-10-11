'use client'

import { useCallback, useRef, useState, type SyntheticEvent } from 'react'
import { useLocalFile } from './use-local-file'
import { readAudioFile, releaseAudioFile, type LocalAudio } from '@/lib/local-media'

function stopAudio(element: HTMLAudioElement | null) {
  if (!element) return
  element.pause()
  element.removeAttribute('src')
  element.load()
}

/** Local track loading and native playback validation; no engine is created on mount. */
export function useAudioPlayback({
  onAudioElement
}: { onAudioElement?: (element: HTMLAudioElement | null) => void } = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const releaseTrack = useCallback((track: LocalAudio) => {
    // Effects are disposed when Next.js hides a retained route as well as on unmount.
    stopAudio(audioRef.current)
    releaseAudioFile(track)
  }, [])
  const { value: track, reading, error, select, clear, setError } = useLocalFile(readAudioFile, releaseTrack)
  const [metadata, setMetadata] = useState<{ url: string; duration: number } | null>(null)
  const bindAudio = useCallback(
    (element: HTMLAudioElement | null) => {
      if (audioRef.current !== element) stopAudio(audioRef.current)
      audioRef.current = element
      onAudioElement?.(element)
    },
    [onAudioElement]
  )
  const clearTrack = useCallback(() => {
    stopAudio(audioRef.current)
    clear()
    setMetadata(null)
  }, [clear])
  const selectTrack = useCallback(
    (file: File) => {
      stopAudio(audioRef.current)
      setMetadata(null)
      void select(file)
    },
    [select]
  )
  const rejectPlayback = useCallback(
    (event: SyntheticEvent<HTMLAudioElement>, message: string) => {
      if (event.currentTarget !== audioRef.current) return
      clearTrack()
      setError(message)
    },
    [clearTrack, setError]
  )
  const onLoadedMetadata = (event: SyntheticEvent<HTMLAudioElement>) => {
    if (!track || event.currentTarget !== audioRef.current) return
    const duration = event.currentTarget.duration
    if (!Number.isFinite(duration) || duration <= 0) {
      rejectPlayback(event, 'This file has no playable audio. Choose another file.')
    } else if (duration > 420) {
      rejectPlayback(event, 'Choose a track that is 7 minutes or shorter.')
    } else setMetadata({ url: track.url, duration })
  }
  const onError = (event: SyntheticEvent<HTMLAudioElement>) =>
    rejectPlayback(event, 'Your browser cannot play this file. Try an MP3 or WAV file.')

  const play = useCallback(async () => {
    await audioRef.current?.play()
  }, [])
  const pause = useCallback(() => audioRef.current?.pause(), [])
  const seek = useCallback((seconds: number) => {
    const element = audioRef.current
    if (element && Number.isFinite(seconds) && Number.isFinite(element.duration)) {
      element.currentTime = Math.max(0, Math.min(seconds, element.duration))
    }
  }, [])

  return {
    track: track ? { ...track, duration: metadata?.url === track.url ? metadata.duration : null } : null,
    reading,
    error,
    selectTrack,
    clearTrack,
    play,
    pause,
    seek,
    audioProps: { ref: bindAudio, onLoadedMetadata, onError }
  }
}
