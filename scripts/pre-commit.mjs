import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { format, resolveConfig } from 'prettier'
import { gt, inc, valid } from 'semver'

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

async function preCommit() {
  const release = process.env.VERSION_BUMP ?? 'patch'
  if (!['patch', 'minor', 'major'].includes(release)) {
    throw new Error('VERSION_BUMP must be patch, minor, or major.')
  }

  if (spawnSync('git', ['diff', '--quiet', '--', 'package.json']).status !== 0) {
    throw new Error('package.json has unstaged edits. Stage them or set them aside before committing.')
  }

  const staged = JSON.parse(git('show', ':package.json'))
  if (!valid(staged.version)) throw new Error('package.json must contain a valid SemVer version.')

  let previous
  if (spawnSync('git', ['cat-file', '-e', 'HEAD:package.json'], { stdio: 'ignore' }).status === 0) {
    previous = JSON.parse(git('show', 'HEAD:package.json')).version
    if (!valid(previous)) throw new Error('The committed package.json version is not valid SemVer.')
  }

  const alreadyBumped = previous && staged.version !== previous
  if (alreadyBumped && !gt(staged.version, previous)) {
    throw new Error('The staged version must be greater than the committed version.')
  }
  const next = alreadyBumped ? staged.version : inc(staged.version, release)
  if (!next) throw new Error('Cannot increment the package version.')

  const lint = spawnSync('bun', ['run', 'lint:staged'], { stdio: 'inherit' })
  if (lint.error) throw lint.error
  if (lint.status !== 0) throw new Error('Staged checks failed; version was not bumped.')

  if (alreadyBumped) {
    console.log(`Keeping staged version ${next}.`)
    return
  }

  git('diff', '--quiet', '--', 'package.json')
  const original = readFileSync('package.json', 'utf8')
  const manifest = JSON.parse(git('show', ':package.json'))
  manifest.version = next
  const content = await format(JSON.stringify(manifest), {
    ...(await resolveConfig('package.json')),
    filepath: 'package.json'
  })

  writeFileSync('package.json', content)
  try {
    git('add', '--', 'package.json')
  } catch (error) {
    writeFileSync('package.json', original)
    throw error
  }
  console.log(`Version ${staged.version} → ${next}; included in this commit.`)
}

try {
  await preCommit()
} catch (error) {
  console.error(`Commit blocked: ${error.message}`)
  process.exitCode = 1
}
