import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const destination = fileURLToPath(new URL('../public/ffmpeg/', import.meta.url))
const workerSource = dirname(fileURLToPath(import.meta.resolve('@ffmpeg/ffmpeg/worker')))
const coreSource = dirname(fileURLToPath(import.meta.resolve('@ffmpeg/core')))

await mkdir(join(destination, 'core'), { recursive: true })
await Promise.all([
  ...['index.js', 'classes.js', 'types.js', 'utils.js', 'worker.js', 'const.js', 'errors.js'].map((name) =>
    copyFile(join(workerSource, name), join(destination, name))
  ),
  ...['ffmpeg-core.js', 'ffmpeg-core.wasm'].map((name) =>
    copyFile(join(coreSource, name), join(destination, 'core', name))
  )
])
console.log('FFmpeg browser assets copied to public/ffmpeg')
