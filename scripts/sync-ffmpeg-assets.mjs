import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchFFmpegCore } from './patch-ffmpeg-core.mjs'

const destination = fileURLToPath(new URL('../public/ffmpeg/', import.meta.url))
const workerSource = dirname(fileURLToPath(import.meta.resolve('@ffmpeg/ffmpeg/worker')))
const coreSource = dirname(fileURLToPath(import.meta.resolve('@ffmpeg/core')))
// Validate compatibility before copying any runtime assets.
const core = patchFFmpegCore(await readFile(join(coreSource, 'ffmpeg-core.js'), 'utf8'))

await mkdir(join(destination, 'core'), { recursive: true })
await Promise.all([
  ...['index.js', 'classes.js', 'types.js', 'utils.js', 'worker.js', 'const.js', 'errors.js'].map((name) =>
    copyFile(join(workerSource, name), join(destination, name))
  ),
  writeFile(join(destination, 'core', 'ffmpeg-core.js'), core),
  copyFile(join(coreSource, 'ffmpeg-core.wasm'), join(destination, 'core', 'ffmpeg-core.wasm'))
])
console.log('FFmpeg browser assets copied to public/ffmpeg')
