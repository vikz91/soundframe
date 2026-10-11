'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createLocalFileLoader } from '@/lib/local-file'

/** Use stable load/release functions; cleanup also clears files from retained, hidden routes. */
export function useLocalFile<T>(load: (file: File, signal: AbortSignal) => Promise<T>, release?: (value: T) => void) {
  const client = useMemo(() => createLocalFileLoader(load, release), [load, release])
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot)
  useEffect(() => () => client.clear(), [client])
  return { ...state, select: client.select, clear: client.clear, setError: client.setError }
}
