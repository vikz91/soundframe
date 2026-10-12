import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createFFmpegClient } from './ffmpeg.ts'

const previousWindow = globalThis.window
beforeEach(() => {
  globalThis.window = { location: { origin: 'http://localhost:3000' } }
})
afterEach(() => {
  globalThis.window = previousWindow
})

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function mockEngine() {
  const files = new Map()
  const events = new Set()
  const engine = {
    loads: 0,
    terminations: 0,
    files,
    events,
    load: async () => {
      engine.loads++
      return true
    },
    terminate: () => {
      engine.terminations++
      files.clear()
    },
    on: (_, callback) => events.add(callback),
    off: (_, callback) => events.delete(callback),
    createDir: async (path) => {
      files.set(path, null)
    },
    writeFile: async (path, bytes) => {
      files.set(path, structuredClone(bytes, { transfer: [bytes.buffer] }))
    },
    exec: async (args) => {
      files.set(args.at(-1), new Uint8Array([1, 2, 3]))
      return 0
    },
    readFile: async (path) => files.get(path),
    listDir: async (path) =>
      [...files.keys()]
        .filter((key) => key.startsWith(`${path}/`))
        .map((key) => ({ name: key.slice(path.length + 1), isDir: false })),
    deleteFile: async (path) => {
      files.delete(path)
    },
    deleteDir: async (path) => {
      files.delete(path)
    }
  }
  return engine
}
const job = {
  inputs: [{ name: 'audio.wav', data: new Uint8Array([9]) }],
  output: { name: 'audio.mp3', type: 'audio/mpeg' },
  args: ({ inputs, output }) => ['-i', inputs[0], output]
}

test('lazy load is deduplicated; sequential jobs reuse the engine and remove files', async () => {
  const engine = mockEngine()
  let creations = 0
  const client = createFFmpegClient(async () => {
    creations++
    return engine
  })
  expect(creations).toBe(0)
  await Promise.all([client.load(), client.load()])
  const first = await client.run(job)
  await client.run(job)
  expect(first.type).toBe('audio/mpeg')
  expect(first.size).toBe(3)
  expect(creations).toBe(1)
  expect(engine.loads).toBe(1)
  expect(engine.files.size).toBe(0)
  expect(engine.events.size).toBe(0)
  expect(job.inputs[0].data[0]).toBe(9)
  client.dispose()
  expect(engine.terminations).toBe(1)
})

test('rejects overlap and cancellation cannot overwrite a newly loaded engine', async () => {
  const first = mockEngine(),
    second = mockEngine(),
    encoding = deferred(),
    started = deferred()
  first.exec = () => {
    started.resolve()
    return encoding.promise
  }
  first.terminate = () => {
    first.terminations++
    encoding.reject(new Error('terminated'))
  }
  const engines = [first, second]
  const client = createFFmpegClient(async () => engines.shift())
  const pending = client.run(job)
  const rejection = pending.catch((error) => error)
  await started.promise
  await expect(client.run(job)).rejects.toThrow('busy')
  client.cancel()
  await client.run(job)
  expect(await rejection).toMatchObject({ name: 'AbortError' })
  expect(client.getSnapshot().status).toBe('ready')
  expect(first.terminations).toBe(1)
  expect(second.terminations).toBe(0)
  expect(first.events.size).toBe(0)
  client.dispose()
})

test('late factory resolution after cancellation terminates its engine', async () => {
  const creation = deferred(),
    engine = mockEngine()
  const client = createFFmpegClient(() => creation.promise)
  const pending = client.load()
  const rejection = pending.catch((error) => error)
  client.cancel()
  creation.resolve(engine)
  expect(await rejection).toMatchObject({ name: 'AbortError' })
  expect(engine.loads).toBe(0)
  expect(engine.terminations).toBe(1)
  expect(client.getSnapshot().status).toBe('idle')
})

test('nonzero exit terminates and clears the failed engine; a retry succeeds', async () => {
  const failed = mockEngine(),
    fresh = mockEngine()
  failed.exec = async () => 1
  const engines = [failed, fresh]
  const client = createFFmpegClient(async () => engines.shift())
  await expect(client.run(job)).rejects.toThrow('code 1')
  expect(client.getSnapshot().status).toBe('error')
  expect(failed.terminations).toBe(1)
  expect(failed.files.size).toBe(0)
  await client.run(job)
  expect(client.getSnapshot().status).toBe('ready')
  client.dispose()
})

test('load failures preserve the error and permit retries', async () => {
  const engine = mockEngine()
  let fail = true
  engine.load = async () => {
    if (fail) throw new Error('asset unavailable')
    return true
  }
  const client = createFFmpegClient(async () => engine)
  await expect(client.run(job)).rejects.toThrow('asset unavailable')
  expect(client.getSnapshot().error).toContain('asset unavailable')
  fail = false
  await client.run(job)
  client.dispose()
})

test('invalid filenames are rejected before creating a worker', async () => {
  const client = createFFmpegClient(async () => {
    throw new Error('must not create')
  })
  await expect(client.run({ ...job, output: { ...job.output, name: '../escape.mp3' } })).rejects.toThrow('filenames')
  expect(client.getSnapshot().status).toBe('idle')
})

test('SSR snapshot stays idle and loading outside a browser fails clearly', async () => {
  globalThis.window = undefined
  const client = createFFmpegClient()
  expect(client.getServerSnapshot().status).toBe('idle')
  await expect(client.load()).rejects.toThrow('requires a browser')
})

test('exclusive pipeline reuses one engine, tracks command progress and removes intermediate files', async () => {
  const engine = mockEngine()
  const client = createFFmpegClient(async () => engine)
  const values = []
  engine.exec = async (args) => {
    engine.events.forEach((callback) => callback({ progress: 0.5 }))
    engine.files.set(args.at(-1), new Uint8Array([4, 5]))
    return 0
  }
  await client.run({
    inputs: job.inputs,
    output: job.output,
    maxOutputBytes: 10,
    process: async (session, { output }) => {
      await expect(client.run(job)).rejects.toThrow('busy')
      await session.write('raw', new Uint8Array([7]))
      await session.exec(['-i', session.path('raw'), session.path('part')], (value) => values.push(value))
      expect((await session.read('part')).length).toBe(2)
      await session.remove('raw')
      await session.exec(['-i', session.path('part'), output])
    }
  })
  expect(values).toEqual([0.5])
  expect(engine.loads).toBe(1)
  expect(engine.files.size).toBe(0)
  expect(engine.events.size).toBe(0)
  client.dispose()
})

test('pipeline errors and oversized output terminate the engine and clear files/listeners', async () => {
  for (const maxOutputBytes of [1, 10]) {
    const engine = mockEngine()
    const client = createFFmpegClient(async () => engine)
    await expect(
      client.run({
        inputs: [],
        output: job.output,
        maxOutputBytes,
        process: async (session, { output }) => {
          await session.exec([output])
          if (maxOutputBytes === 10) throw new Error('render failed')
        }
      })
    ).rejects.toThrow(maxOutputBytes === 1 ? 'memory limit' : 'render failed')
    expect(engine.terminations).toBe(1)
    expect(engine.files.size).toBe(0)
    expect(engine.events.size).toBe(0)
  }
})
