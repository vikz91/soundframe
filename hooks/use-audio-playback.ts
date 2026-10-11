'use client'

import { useCallback, useRef, useState, type SyntheticEvent } from 'react'
import { useLocalFile } from './use-local-file'
import { readAudioFile, releaseAudioFile, validateAudioDuration, type LocalAudio } from '@/lib/local-media'

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
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const volumeRef = useRef(1)
  const selectionRef = useRef(0)
  const releaseTrack = useCallback((track: LocalAudio) => {
    // Effects are disposed when Next.js hides a retained route as well as on unmount.
    const element = audioRef.current
    // A cancelled loader may release a stale result after the next track has started.
    if (element && (element.currentSrc === track.url || element.getAttribute('src') === track.url)) stopAudio(element)
    releaseAudioFile(track)
  }, [])
  const { value: track, reading, error, select, clear, setError } = useLocalFile(readAudioFile, releaseTrack)
  const bindAudio = useCallback(
    (element: HTMLAudioElement | null) => {
      if (audioRef.current !== element) stopAudio(audioRef.current)
      audioRef.current = element
      if (element) {
        element.volume = volumeRef.current
        // StrictMode and retained routes detach then reattach refs without rewriting src props.
        if (track && element.getAttribute('src') !== track.url) element.src = track.url
      }
      onAudioElement?.(element)
    },
    [onAudioElement, track]
  )
  const clearTrack = useCallback(() => {
    selectionRef.current++
    stopAudio(audioRef.current)
    clear()
    setPlaying(false)
  }, [clear])
  const selectTrack = useCallback(
    (file: File) => {
      selectionRef.current++
      stopAudio(audioRef.current)
      setPlaying(false)
      void select(file)
    },
    [select]
  )
  const rejectPlayback = useCallback(
    (event: SyntheticEvent<HTMLAudioElement>, message: string) => {
      if (event.currentTarget !== audioRef.current || !track || event.currentTarget.currentSrc !== track.url) return
      clearTrack()
      setError(message)
    },
    [clearTrack, setError, track]
  )
  const onLoadedMetadata = (event: SyntheticEvent<HTMLAudioElement>) => {
    if (!track || event.currentTarget !== audioRef.current || event.currentTarget.currentSrc !== track.url) return
    try {
      const duration = event.currentTarget.duration
      if (/\.(m4a|mp4)$/i.test(track.name)) {
        if (!Number.isFinite(duration) || duration <= 0) throw new Error('This file has no playable audio.')
      } else validateAudioDuration(duration)
    } catch (error) {
      rejectPlayback(event, error instanceof Error ? error.message : 'This file has no playable audio.')
    }
  }
  const onError = (event: SyntheticEvent<HTMLAudioElement>) =>
    rejectPlayback(event, 'Your browser cannot play this file. Try an MP3 or WAV file.')

  const play = useCallback(async () => {
    const element = audioRef.current
    const selection = selectionRef.current
    if (!element || !track || element.currentSrc !== track.url) return
    try {
      if (element.currentTime >= track.duration) element.currentTime = 0
      await element.play()
      if (selection === selectionRef.current && element === audioRef.current) setError(null)
    } catch (error) {
      if (selection === selectionRef.current && element === audioRef.current) {
        setPlaying(false)
        setError('Playback could not start. Press Play again or try another audio file.')
      }
      throw error
    }
  }, [setError, track])
  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
  }, [])
  const seek = useCallback(
    (seconds: number) => {
      const element = audioRef.current
      if (element && Number.isFinite(seconds) && Number.isFinite(element.duration)) {
        element.currentTime = Math.max(0, Math.min(seconds, element.duration, track?.duration ?? element.duration))
      }
    },
    [track]
  )
  const setVolume = useCallback((value: number) => {
    if (!Number.isFinite(value)) return
    const next = Math.max(0, Math.min(1, value))
    volumeRef.current = next
    if (audioRef.current) audioRef.current.volume = next
    setVolumeState(next)
  }, [])
  const onPlay = (event: SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget === audioRef.current && track && event.currentTarget.currentSrc === track.url)
      setPlaying(true)
  }
  const onPause = (event: SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget === audioRef.current) setPlaying(false)
  }

  return {
    track,
    reading,
    error,
    playing,
    volume,
    selectTrack,
    clearTrack,
    play,
    pause,
    seek,
    setVolume,
    audioProps: { ref: bindAudio, onLoadedMetadata, onError, onPlay, onPause, onEnded: onPause }
  }
}
