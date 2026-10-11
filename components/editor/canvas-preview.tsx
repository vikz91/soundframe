'use client'

import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/hooks/use-animation-frame'
import { prepareComposition, renderComposition, type CompositionSnapshot } from '@/lib/editor/composition'
import type { EditorPreferences } from '@/lib/editor/types'
import type { AudioSamples } from '@/app/demo/viz/audio-analysis'
import { Notice } from '@/components/audioframe/status'

export function CanvasPreview({
  artwork,
  preferences,
  getTime,
  readAnalysis,
  playing
}: {
  artwork: HTMLImageElement | null
  preferences: EditorPreferences
  getTime: () => number
  readAnalysis: () => AudioSamples | null
  playing: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const snapshot = useRef<CompositionSnapshot | null>(null)
  const reducedMotion = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedMotion.current = media.matches
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    let active = true
    const element = canvas.current
    snapshot.current = null
    if (artwork) {
      void prepareComposition(preferences, artwork)
        .then((next) => {
          if (!active) return
          snapshot.current = next
          setError(null)
          setReady(true)
          const context = canvas.current?.getContext('2d')
          if (context) renderComposition(context, next, { frameIndex: Math.floor(getTime() * 30) })
        })
        .catch((reason: unknown) => {
          if (active) {
            setReady(false)
            setError(reason instanceof Error ? reason.message : 'The composition could not be prepared.')
          }
        })
    }
    return () => {
      active = false
      snapshot.current = null
      const context = element?.getContext('2d')
      context?.clearRect(0, 0, 568, 320)
    }
  }, [artwork, preferences, getTime])
  useAnimationFrame(
    () => {
      const context = canvas.current?.getContext('2d')
      const current = snapshot.current
      if (context && current) {
        renderComposition(context, current, {
          frameIndex: Math.floor(getTime() * 30),
          analysis: readAnalysis() ?? undefined,
          reducedMotion: reducedMotion.current
        })
      }
    },
    Boolean(artwork) && (playing || ready)
  )
  return (
    <>
      <canvas
        ref={canvas}
        width={568}
        height={320}
        role="img"
        aria-label={`${preferences.mode} composition: ${preferences.details.title || 'Untitled track'}`}
        className="h-full w-full"
      />
      {!artwork ? (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
          Choose audio and artwork to preview your frame.
        </p>
      ) : null}
      {error ? <Notice className="absolute inset-x-3 bottom-3" tone="danger" title={error} /> : null}
    </>
  )
}
