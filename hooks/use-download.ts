'use client'

import { useCallback, useEffect, useRef } from 'react'
import { downloadURL } from '@/lib/browser-files'

/** Retain the most recent download URL until replacement/disposal, including async canvas encoding. */
export function useDownload() {
  const url = useRef<string | null>(null)
  const revision = useRef(0)
  const active = useRef(false)
  const clear = useCallback(() => {
    revision.current = revision.current + 1
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }, [])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      clear()
    }
  }, [clear])
  const save = useCallback((blob: Blob, filename: string) => {
    if (!active.current) return
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = URL.createObjectURL(blob)
    downloadURL(url.current, filename)
  }, [])
  const download = useCallback(
    (blob: Blob, filename: string) => {
      revision.current = revision.current + 1
      save(blob, filename)
    },
    [save]
  )
  const downloadCanvas = useCallback(
    (canvas: HTMLCanvasElement, filename: string, type = 'image/png') => {
      const current = ++revision.current
      return new Promise<boolean>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!active.current || current !== revision.current) {
            resolve(false)
            return
          }
          if (!blob) {
            reject(new Error('The image could not be saved. Please try again.'))
            return
          }
          try {
            save(blob, filename)
            resolve(true)
          } catch (error) {
            reject(error)
          }
        }, type)
      })
    },
    [save]
  )
  return { download, downloadCanvas, clear }
}
