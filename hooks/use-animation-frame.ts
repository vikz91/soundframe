'use client'

import { useEffect, useEffectEvent } from 'react'

/** Bounded preview clock; paused/hidden time never accumulates into the next frame. */
export function useAnimationFrame(paint: (deltaSeconds: number) => void, running = true, fps = 30) {
  const onFrame = useEffectEvent(paint)
  // Repaint committed settings even when the preview clock is paused.
  useEffect(() => onFrame(0))
  useEffect(() => {
    let request = 0
    let previous: number | null = null
    const animate = (timestamp: number) => {
      request = requestAnimationFrame(animate)
      if (document.hidden) {
        previous = null
        return
      }
      if (previous !== null && timestamp - previous < 1000 / fps) return
      onFrame(previous === null ? 0 : Math.min((timestamp - previous) / 1000, 0.1))
      previous = timestamp
    }
    if (running) request = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(request)
  }, [running, fps])
}
