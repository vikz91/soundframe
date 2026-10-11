import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const source = dirname(dirname(fileURLToPath(import.meta.url)))
const repositories = []

afterEach(() => {
  for (const path of repositories.splice(0)) rmSync(path, { recursive: true, force: true })
})

function run(root, args, env = {}) {
  // Tests run from hooks too: do not inherit Git's index or repository overrides.
  const environment = { ...process.env, VERSION_BUMP: 'patch', ...env }
  for (const key of Object.keys(environment)) {
    if (key.startsWith('GIT_')) delete environment[key]
  }
  return spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', env: environment })
}

function git(root, ...args) {
  const result = run(root, ['git', ...args])
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout
}

function manifest(root, reference) {
  return JSON.parse(
    reference !== undefined ? git(root, 'show', `${reference}:package.json`) : readFileSync(join(root, 'package.json'))
  )
}

function setup(version = '0.1.0') {
  const root = mkdtempSync(join(tmpdir(), 'audioframe-version-'))
  repositories.push(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Hook test')
  git(root, 'config', 'user.email', 'hook-test@example.invalid')
  git(root, 'config', 'commit.gpgsign', 'false')
  git(root, 'config', 'core.hooksPath', '.husky/_')
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, '.husky/_'), { recursive: true })
  copyFileSync(join(source, 'scripts/pre-commit.mjs'), join(root, 'scripts/pre-commit.mjs'))
  copyFileSync(join(source, '.husky/pre-commit'), join(root, '.husky/pre-commit'))
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir')
  writeFileSync(join(root, '.gitignore'), 'node_modules\n')
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(
      {
        name: 'hook-fixture',
        version,
        scripts: { 'commit:check': 'bun scripts/pre-commit.mjs', 'lint:staged': 'bun scripts/lint-fixture.mjs' }
      },
      null,
      2
    ) + '\n'
  )
  writeFileSync(
    join(root, 'scripts/lint-fixture.mjs'),
    "import process from 'node:process'\nprocess.exit(process.env.FAIL_LINT === '1' ? 1 : 0)\n"
  )
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'Fixture baseline')
  copyFileSync(join(source, '.husky/_/h'), join(root, '.husky/_/h'))
  copyFileSync(join(source, '.husky/_/pre-commit'), join(root, '.husky/_/pre-commit'))
  writeFileSync(join(root, 'change.txt'), 'Changed\n')
  git(root, 'add', 'change.txt')
  return root
}

test.each([
  ['patch', '0.1.1'],
  ['minor', '0.2.0'],
  ['major', '1.0.0']
])('%s bump is included in the same commit', (release, expected) => {
  const root = setup()
  const result = run(root, ['git', 'commit', '-qm', 'Actual hooked commit'], { VERSION_BUMP: release })
  expect(result.status).toBe(0)
  expect(manifest(root, 'HEAD').version).toBe(expected)
  expect(manifest(root).version).toBe(expected)
  expect(git(root, 'rev-list', '--count', 'HEAD').trim()).toBe('2')
  expect(git(root, 'show', 'HEAD:change.txt')).toBe('Changed\n')
})

test('lint failure prevents both commit and bump', () => {
  const root = setup()
  const result = run(root, ['git', 'commit', '-qm', 'Rejected'], { FAIL_LINT: '1' })
  expect(result.status).not.toBe(0)
  expect(manifest(root).version).toBe('0.1.0')
  expect(manifest(root, '').version).toBe('0.1.0')
  expect(git(root, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
})

test('unstaged manifest edits are preserved and block the commit', () => {
  const root = setup()
  const content = JSON.stringify({ ...manifest(root), unrelated: true }, null, 2) + '\n'
  writeFileSync(join(root, 'package.json'), content)
  const result = run(root, ['git', 'commit', '-qm', 'Rejected'])
  expect(result.status).not.toBe(0)
  expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(content)
  expect(manifest(root, '').unrelated).toBeUndefined()
})

test('retry after a later hook rejection does not double bump', () => {
  const root = setup()
  writeFileSync(join(root, '.husky/_/commit-msg'), '#!/bin/sh\nexit 1\n', { mode: 0o755 })
  expect(run(root, ['git', 'commit', '-qm', 'Rejected later']).status).not.toBe(0)
  expect(manifest(root).version).toBe('0.1.1')
  rmSync(join(root, '.husky/_/commit-msg'))
  expect(run(root, ['git', 'commit', '-qm', 'Retry']).status).toBe(0)
  expect(manifest(root, 'HEAD').version).toBe('0.1.1')
})

test('a manually staged higher version is respected', () => {
  const root = setup()
  writeFileSync(join(root, 'package.json'), JSON.stringify({ ...manifest(root), version: '0.5.0' }, null, 2) + '\n')
  git(root, 'add', 'package.json')
  expect(run(root, ['git', 'commit', '-qm', 'Manual bump']).status).toBe(0)
  expect(manifest(root, 'HEAD').version).toBe('0.5.0')
})

test('prerelease versions use SemVer increment rules', () => {
  const root = setup('1.0.0-beta.1')
  expect(run(root, ['git', 'commit', '-qm', 'Release']).status).toBe(0)
  expect(manifest(root, 'HEAD').version).toBe('1.0.0')
})

test.each(['banana', '0.0.1'])('invalid or decreasing versions block commits: %s', (version) => {
  const root = setup()
  writeFileSync(join(root, 'package.json'), JSON.stringify({ ...manifest(root), version }, null, 2) + '\n')
  git(root, 'add', 'package.json')
  expect(run(root, ['git', 'commit', '-qm', 'Rejected']).status).not.toBe(0)
  expect(git(root, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
})
