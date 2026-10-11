import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

const rootDocs = new Set(['README.md', 'CONTRIBUTING.md', 'AGENTS.md'])
const isDocumentation = (path) => rootDocs.has(path) || (path.startsWith('docs/') && path.endsWith('.md'))
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function shouldSkipBuild() {
  // Vercel supplies the last successful deployment, rather than the previous commit.
  // Missing history (including a shallow clone) must never hide an application change.
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA
  if (!previous || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(previous)) return false

  try {
    git('merge-base', '--is-ancestor', previous, 'HEAD')
    // Disable rename detection so moving code into docs still counts as deleting code.
    const paths = git('diff', '--name-only', '--no-renames', '-z', previous, 'HEAD', '--').split('\0').filter(Boolean)
    if (!paths.some(isDocumentation)) return false

    for (const path of paths) {
      if (isDocumentation(path)) continue
      if (path !== 'package.json') return false

      // The commit hook bumps the version even for documentation-only commits.
      // Any other manifest change still requires a build.
      const before = JSON.parse(git('show', `${previous}:package.json`))
      const after = JSON.parse(git('show', 'HEAD:package.json'))
      if (typeof before.version !== 'string' || typeof after.version !== 'string') return false
      delete before.version
      delete after.version
      if (!isDeepStrictEqual(before, after)) return false
    }
    return true
  } catch {
    return false
  }
}

const skip = shouldSkipBuild()
console.log(skip ? 'Skipping Vercel build: only documentation changed.' : 'Continuing Vercel build.')
// The Ignored Build Step uses the opposite of a normal success/failure convention.
process.exitCode = skip ? 0 : 1
