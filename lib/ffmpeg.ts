import type { FFmpeg } from '@ffmpeg/ffmpeg'

export type FFmpegState = {
  status: 'idle' | 'loading' | 'ready' | 'running' | 'error'
  /** Approximate encoding progress from 0 to 1; excludes loading and file transfers. */
  progress: number
  error: string | null
}

export type FFmpegJob = {
  inputs: { name: string; data: Blob | Uint8Array }[]
  output: { name: string; type: string }
  /** Keep all inputs, outputs and intermediate files inside the supplied directory. */
  args: (paths: { inputs: string[]; output: string; directory: string }) => string[]
  timeoutMs?: number
}

/** An exclusive multi-command job in the same engine and temporary directory. */
export type FFmpegSession = {
  path: (name: string) => string
  write: (name: string, data: Uint8Array) => Promise<void>
  read: (name: string) => Promise<Uint8Array>
  remove: (name: string) => Promise<void>
  exec: (args: string[], progress?: (value: number) => void) => Promise<void>
}
export type FFmpegPipeline = Omit<FFmpegJob, 'args'> & {
  process: (session: FFmpegSession, paths: { inputs: string[]; output: string }) => Promise<void>
  maxOutputBytes: number
}

type Engine = Pick<
  FFmpeg,
  | 'load'
  | 'terminate'
  | 'on'
  | 'off'
  | 'exec'
  | 'writeFile'
  | 'readFile'
  | 'createDir'
  | 'listDir'
  | 'deleteFile'
  | 'deleteDir'
>
const initialState: FFmpegState = { status: 'idle', progress: 0, error: null }
const aborted = () => new DOMException('FFmpeg job cancelled', 'AbortError')

async function createEngine(): Promise<Engine> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
    throw new Error('FFmpeg requires a browser with Web Workers and WebAssembly')
  }
  // Serve the package's ESM unchanged: Turbopack cannot resolve its dynamic Worker URL.
  const moduleURL = new URL('/ffmpeg/index.js', window.location.origin).href
  const { FFmpeg } = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ moduleURL
  )) as typeof import('@ffmpeg/ffmpeg')
  return new FFmpeg()
}

/** One lazy engine, one active job. The factory argument supports lifecycle testing. */
export function createFFmpegClient(factory: () => Promise<Engine> = createEngine) {
  let state = initialState
  let engine: Engine | undefined
  let loading: Promise<Engine> | undefined
  let generation = 0
  let active: symbol | undefined
  let sequence = 0
  const listeners = new Set<() => void>()
  const publish = (next: FFmpegState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const assertCurrent = (epoch: number) => {
    if (epoch !== generation) throw aborted()
  }
  const dispose = () => {
    generation++
    engine?.terminate()
    engine = undefined
    loading = undefined
    active = undefined
    publish(initialState)
  }
  const load = (): Promise<Engine> => {
    if (loading) return loading
    if (engine) return Promise.resolve(engine)
    const epoch = generation
    publish({ status: 'loading', progress: 0, error: null })
    loading = (async () => {
      try {
        const instance = await factory()
        if (epoch !== generation) {
          instance.terminate()
          throw aborted()
        }
        engine = instance
        await instance.load({
          classWorkerURL: new URL('/ffmpeg/worker.js', window.location.origin).href,
          coreURL: new URL('/ffmpeg/core/ffmpeg-core.js', window.location.origin).href,
          wasmURL: new URL('/ffmpeg/core/ffmpeg-core.wasm', window.location.origin).href
        })
        assertCurrent(epoch)
        publish({ status: 'ready', progress: 0, error: null })
        return instance
      } catch (error) {
        if (epoch !== generation) throw aborted()
        engine?.terminate()
        engine = undefined
        publish({ status: 'error', progress: 0, error: String(error) })
        throw error
      } finally {
        if (epoch === generation) loading = undefined
      }
    })()
    return loading
  }
  const removeDirectory = async (instance: Engine, directory: string): Promise<void> => {
    for (const entry of await instance.listDir(directory)) {
      if (entry.name === '.' || entry.name === '..') continue
      const path = `${directory}/${entry.name}`
      if (entry.isDir) await removeDirectory(instance, path)
      else await instance.deleteFile(path)
    }
    await instance.deleteDir(directory)
  }
  const run = async (job: FFmpegJob | FFmpegPipeline): Promise<Blob> => {
    if (active) throw new Error('FFmpeg is busy; wait for the current job or cancel it')
    const names = [...job.inputs.map((input) => input.name), job.output.name]
    if (names.some((name) => !/^[\w.-]+$/.test(name) || name === '.' || name === '..')) {
      throw new Error('Use plain filenames without directories')
    }
    if (new Set(names).size !== names.length) throw new Error('Input and output filenames must be unique')
    const token = Symbol()
    active = token
    const epoch = generation
    let instance: Engine | undefined
    const progress = ({ progress: value }: { progress: number }) => {
      if (epoch !== generation || !Number.isFinite(value)) return
      const percent = Math.max(state.progress, Math.min(0.99, Math.floor(value * 100) / 100))
      if (percent !== state.progress) publish({ ...state, progress: percent })
    }
    try {
      instance = await load()
      assertCurrent(epoch)
      publish({ status: 'running', progress: 0, error: null })
      instance.on('progress', progress)
      const directory = `/job-${++sequence}`
      await instance.createDir(directory)
      const inputs: string[] = []
      for (const input of job.inputs) {
        // Copy caller-owned bytes: writeFile transfers its buffer to the worker.
        const bytes =
          input.data instanceof Uint8Array ? new Uint8Array(input.data) : new Uint8Array(await input.data.arrayBuffer())
        assertCurrent(epoch)
        const path = `${directory}/${input.name}`
        await instance.writeFile(path, bytes)
        inputs.push(path)
      }
      assertCurrent(epoch)
      const output = `${directory}/${job.output.name}`
      const current = instance
      if ('process' in job) {
        const path = (name: string) => {
          assertCurrent(epoch)
          if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..') throw new Error('Use plain filenames')
          return `${directory}/${name}`
        }
        await job.process(
          {
            path,
            write: async (name, data) => {
              await current.writeFile(path(name), new Uint8Array(data))
              assertCurrent(epoch)
            },
            read: async (name) => {
              const data = await current.readFile(path(name))
              assertCurrent(epoch)
              if (!(data instanceof Uint8Array)) throw new Error('Expected binary FFmpeg output')
              return data
            },
            remove: async (name) => {
              await current.deleteFile(path(name))
              assertCurrent(epoch)
            },
            exec: async (args, onProgress) => {
              assertCurrent(epoch)
              const update = ({ progress: value }: { progress: number }) => {
                if (epoch === generation && Number.isFinite(value)) onProgress?.(Math.max(0, Math.min(1, value)))
              }
              current.on('progress', update)
              try {
                const code = await current.exec(args, job.timeoutMs ?? -1)
                assertCurrent(epoch)
                if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`)
              } finally {
                current.off('progress', update)
              }
            }
          },
          { inputs, output }
        )
      } else {
        const code = await instance.exec(job.args({ inputs, output, directory }), job.timeoutMs ?? -1)
        assertCurrent(epoch)
        if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`)
      }
      assertCurrent(epoch)
      const bytes = await instance.readFile(output)
      if (!(bytes instanceof Uint8Array)) throw new Error('Expected binary FFmpeg output')
      if (!bytes.length) throw new Error('FFmpeg produced an empty output')
      if ('maxOutputBytes' in job && bytes.length > job.maxOutputBytes)
        throw new Error('Video exceeded the output memory limit')
      const result = new Blob([new Uint8Array(bytes).buffer], { type: job.output.type })
      await removeDirectory(instance, directory)
      assertCurrent(epoch)
      publish({ status: 'ready', progress: 1, error: null })
      return result
    } catch (error) {
      if (epoch !== generation) throw aborted()
      dispose()
      publish({ status: 'error', progress: 0, error: String(error) })
      throw error
    } finally {
      instance?.off('progress', progress)
      if (active === token) active = undefined
    }
  }
  return {
    load: async () => {
      await load()
    },
    run,
    cancel: dispose,
    dispose,
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

export const ffmpegClient = createFFmpegClient()
