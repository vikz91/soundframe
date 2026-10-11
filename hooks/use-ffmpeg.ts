'use client'

import { useSyncExternalStore } from 'react'
import { ffmpegClient } from '@/lib/ffmpeg'

/** Mounting subscribes only; load/run explicitly start the shared worker. */
export function useFFmpeg() {
  const state = useSyncExternalStore(ffmpegClient.subscribe, ffmpegClient.getSnapshot, ffmpegClient.getServerSnapshot)
  return {
    ...state,
    load: ffmpegClient.load,
    run: ffmpegClient.run,
    cancel: ffmpegClient.cancel,
    dispose: ffmpegClient.dispose
  }
}
