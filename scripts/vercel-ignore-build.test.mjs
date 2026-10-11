import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./vercel-ignore-build.mjs', import.meta.url))
const repositories = []
const manifest = { name: 'build-fixture', version: '0.1.0', scripts: { build: 'next build' } }

afterEach(() => {
  for (const root of repositories.splice(0)) rmSync(root, { recursive: true, force: true })
})

function run(root, command, args, variables = {}) {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('VERCEL_')) delete env[key]
  }
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...env, ...variables } })
}

function git(root, ...args) {
  const result = run(root, 'git', args)
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

function commit(root) {
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'Fixture change')
  return git(root, 'rev-parse', 'HEAD')
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'audioframe-vercel-'))
  repositories.push(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Build test')
  git(root, 'config', 'user.email', 'build-test@example.invalid')
  git(root, 'config', 'commit.gpgsign', 'false')
  git(root, 'config', 'core.hooksPath', '/dev/null')
  write(root, 'README.md', 'Documentation\n')
  write(root, 'docs/FFMPEG.md', 'Media documentation\n')
  write(root, 'app/page.tsx', 'export default function Page() { return null }\n')
  write(root, 'package.json', JSON.stringify(manifest))
  return { root, previous: commit(root) }
}

function ignoredBuild(root, previous) {
  const result = run(root, 'node', [script], previous === undefined ? {} : { VERCEL_GIT_PREVIOUS_SHA: previous })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe('')
  return result.status
}

test.each(['README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'docs/nested/guide.md', 'docs/a\nb.md'])(
  'skips documentation-only changes to %s, including the automatic version bump',
  (path) => {
    const { root, previous } = setup()
    write(root, path, 'Updated documentation\n')
    write(root, 'package.json', JSON.stringify({ ...manifest, version: '0.1.1' }))
    commit(root)
    expect(ignoredBuild(root, previous)).toBe(0)
  }
)

test.each(['app/page.tsx', 'vercel.json', 'bun.lock', 'scripts/build.mjs', 'public/logo.svg', 'docs/example.ts'])(
  'builds mixed documentation and product/tooling changes to %s',
  (path) => {
    const { root, previous } = setup()
    write(root, 'README.md', 'Updated documentation\n')
    write(root, path, 'Changed\n')
    commit(root)
    expect(ignoredBuild(root, previous)).toBe(1)
  }
)

test('checks the entire range since the last successful deployment', () => {
  const { root, previous } = setup()
  write(root, 'app/page.tsx', 'export default function Page() { return "Updated" }\n')
  commit(root)
  write(root, 'README.md', 'Latest documentation-only commit\n')
  commit(root)
  expect(ignoredBuild(root, previous)).toBe(1)
})

test('builds when the manifest changes beyond its version', () => {
  const { root, previous } = setup()
  write(root, 'README.md', 'Updated documentation\n')
  write(root, 'package.json', JSON.stringify({ ...manifest, version: '0.1.1', scripts: { build: 'different build' } }))
  commit(root)
  expect(ignoredBuild(root, previous)).toBe(1)
})

test('builds an explicit version-only release or an unchanged redeployment', () => {
  const { root, previous } = setup()
  expect(ignoredBuild(root, previous)).toBe(1)
  write(root, 'package.json', JSON.stringify({ ...manifest, version: '0.2.0' }))
  commit(root)
  expect(ignoredBuild(root, previous)).toBe(1)
})

test('skips deleted documentation but builds code moved into documentation', () => {
  const { root, previous } = setup()
  rmSync(join(root, 'docs/FFMPEG.md'))
  commit(root)
  expect(ignoredBuild(root, previous)).toBe(0)
  renameSync(join(root, 'app/page.tsx'), join(root, 'docs/example.md'))
  commit(root)
  expect(ignoredBuild(root, previous)).toBe(1)
})

test.each([undefined, 'invalid-sha', 'f'.repeat(40)])(
  'builds when the previous SHA is missing or unavailable: %s',
  (sha) => {
    const { root } = setup()
    write(root, 'README.md', 'Updated documentation\n')
    commit(root)
    expect(ignoredBuild(root, sha)).toBe(1)
  }
)

test('builds when shallow history does not contain the previous deployment', () => {
  const { root, previous } = setup()
  write(root, 'README.md', 'Updated documentation\n')
  commit(root)
  const shallow = mkdtempSync(join(tmpdir(), 'audioframe-vercel-shallow-'))
  repositories.push(shallow)
  git(shallow, 'clone', '--quiet', '--depth=1', `file://${root}`, '.')
  expect(ignoredBuild(shallow, previous)).toBe(1)
})

test('builds when the previous deployment is not an ancestor', () => {
  const { root, previous } = setup()
  write(root, 'README.md', 'Different history\n')
  const sibling = commit(root)
  git(root, 'checkout', '--quiet', previous)
  write(root, 'README.md', 'Updated documentation\n')
  commit(root)
  expect(ignoredBuild(root, sibling)).toBe(1)
})
