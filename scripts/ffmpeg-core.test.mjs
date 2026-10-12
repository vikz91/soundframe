import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchFFmpegCore } from './patch-ffmpeg-core.mjs'

const corePath = fileURLToPath(import.meta.resolve('@ffmpeg/core'))
const source = readFileSync(corePath, 'utf8')

test('core compatibility patch rejects changed bindings instead of shipping an unchecked runtime', () => {
  expect(() => patchFFmpegCore(source.replace('function exec(', 'function changedExec('))).toThrow('binding changed')
  expect(() => patchFFmpegCore(source.replace('var stackRestore=', 'var changedRestore='))).toThrow('helpers changed')
})

test('real WASM core survives 420 sequential video commands, probing and a failed command', () => {
  const script = `
      import { readFile } from 'node:fs/promises';
      import { patchFFmpegCore } from ${JSON.stringify(new URL('./patch-ffmpeg-core.mjs', import.meta.url).href)};
      globalThis.self = { location: { href: 'file:///ffmpeg-core-test.js' } };
      const source = patchFFmpegCore(await readFile(${JSON.stringify(corePath)}, 'utf8'));
      const { default: createCore } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
      const core = await createCore({ wasmBinary: await readFile(${JSON.stringify(join(dirname(corePath), 'ffmpeg-core.wasm'))}) });
      let logs = [];
      core.setLogger(({ type, message }) => { if (type === 'stdout') logs.push(message); });
      core.FS.writeFile('/frames.rgba', new Uint8Array(568 * 320 * 4).fill(128));
      for (let i = 0; i < 420; i++) {
        core.exec('-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '568x320', '-framerate', '30',
          '-i', '/frames.rgba', '-an', '-frames:v', '1', '-c:v', 'libx264', '-preset', 'ultrafast',
          '-crf', '23', '-pix_fmt', 'yuv420p', '-bf', '0', '-g', '30', '-y', '/part.mp4');
        if (core.ret !== 0) throw new Error('Batch ' + i + ' failed: ' + core.ret);
        core.reset();
        logs = [];
        core.ffprobe('-v', 'error', '-show_entries', 'stream=codec_name', '/part.mp4');
        // This core's probe binding leaves ret at -1 even on success; inspect its codec output.
        if (!logs.includes('codec_name=h264')) throw new Error('Probe ' + i + ' did not find H.264');
        core.reset();
        core.FS.unlink('/part.mp4');
      }
      core.exec('-i', '/missing.wav', '/output.wav');
      if (core.ret === 0) throw new Error('Invalid input unexpectedly succeeded');
      core.reset();
      core.exec('-version');
      if (core.ret !== 0) throw new Error('Command after failure did not recover');
      console.log('420 batches and probes passed');
    `
  const result = spawnSync('node', ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    timeout: 45_000,
    maxBuffer: 1024 * 1024
  })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('420 batches and probes passed')
}, 50_000)
