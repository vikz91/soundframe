type FileState<T> = { value: T | null; reading: boolean; error: string | null }

/** One selected file and one pending read. Late results are released instead of published. */
export function createLocalFileLoader<T>(
  load: (file: File, signal: AbortSignal) => Promise<T>,
  release?: (value: T) => void
) {
  const initial: FileState<T> = { value: null, reading: false, error: null }
  let state = initial
  let request: AbortController | null = null
  const listeners = new Set<() => void>()
  const publish = (next: FileState<T>) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const clear = () => {
    request?.abort()
    request = null
    if (state.value !== null) release?.(state.value)
    publish(initial)
  }
  const select = async (file: File) => {
    clear()
    const current = new AbortController()
    request = current
    publish({ value: null, reading: true, error: null })
    try {
      const value = await load(file, current.signal)
      if (request !== current) {
        release?.(value)
        return
      }
      publish({ value, reading: false, error: null })
    } catch (error) {
      if (request === current && !current.signal.aborted) {
        publish({
          value: null,
          reading: false,
          error: error instanceof Error ? error.message : 'We could not read this file. Please try again.'
        })
      }
    } finally {
      if (request === current) request = null
    }
  }
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    select,
    clear,
    setError: (error: string | null) => publish({ ...state, error })
  }
}
