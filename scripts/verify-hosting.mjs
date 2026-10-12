/** Read-only asset/hosting verification. Does not deploy or access Vercel credentials. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const origin = new URL(process.env.HOSTING_BASE_URL ?? 'https://audioframe.abhishekdeb.com').origin
const evidence = resolve(process.env.ENCODING_EVIDENCE_DIR ?? 'output/release/hosting')
await mkdir(evidence, { recursive: true })
const paths = [
  'index.js',
  'classes.js',
  'types.js',
  'utils.js',
  'worker.js',
  'const.js',
  'errors.js',
  'core/ffmpeg-core.js',
  'core/ffmpeg-core.wasm'
]
const assets = []
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
for (const path of paths) {
  const response = await fetch(new URL(`/ffmpeg/${path}`, origin))
  assert.equal(response.status, 200, `${path} must load`)
  assert.equal(new URL(response.url).origin, origin, `${path} must remain on the app origin`)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  const bytes = Buffer.from(await response.arrayBuffer())
  const type = response.headers.get('content-type')
  assert.ok(path.endsWith('.wasm') ? type?.includes('application/wasm') : /javascript/.test(type), `${path} MIME type`)
  const local = await readFile(resolve('public/ffmpeg', path))
  const sha256 = digest(bytes)
  assets.push({
    path,
    bytes: bytes.length,
    sha256,
    matchesLocalBuild: sha256 === digest(local),
    headers: Object.fromEntries(
      ['content-type', 'cache-control', 'x-content-type-options', 'x-vercel-cache'].map((key) => [
        key,
        response.headers.get(key)
      ])
    )
  })
}
const report = {
  testedAt: new Date().toISOString(),
  origin,
  assets,
  runtimeBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  matchesLocalBuild: assets.every((asset) => asset.matchesLocalBuild),
  accountPlanAndRemainingQuota: 'Unavailable; no authenticated Vercel account inspected',
  policySources: ['https://vercel.com/docs/limits', 'https://vercel.com/docs/plans/hobby']
}
await writeFile(join(evidence, 'verification.json'), JSON.stringify(report, null, 2) + '\n')
assert.ok(report.matchesLocalBuild, 'deployed runtime must match the locally tested build')
console.log(JSON.stringify(report, null, 2))
