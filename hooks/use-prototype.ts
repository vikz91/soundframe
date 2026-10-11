'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPrototypeController } from '@/lib/prototype/controller'

export function usePrototype() {
  const [controller] = useState(() => createPrototypeController())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot)
  useEffect(() => {
    controller.activate()
    const refresh = () => {
      controller.checkExpiry()
      if (document.hidden) controller.pausePlayback()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      controller.dispose()
    }
  }, [controller])
  return { state, controller }
}
