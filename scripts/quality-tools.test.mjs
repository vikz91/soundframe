import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = dirname(dirname(fileURLToPath(import.meta.url)))
const fixtures = []
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true })
})

function lint(code, { typeAware = false, typeCheck = false, filename = 'example.tsx' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'audioframe-lint-'))
  fixtures.push(root)
  copyFileSync(join(source, '.oxlintrc.json'), join(root, '.oxlintrc.json'))
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir')
  symlinkSync(join(source, 'scripts'), join(root, 'scripts'), 'dir')
  writeFileSync(join(root, filename), code)
  if (typeAware) {
    copyFileSync(join(source, '.oxlintrc.type-aware.json'), join(root, '.oxlintrc.type-aware.json'))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
          module: 'esnext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: true,
          noEmit: true
        },
        include: [filename]
      })
    )
  }
  const result = spawnSync(
    join(source, 'node_modules/.bin/oxlint'),
    [
      '--format',
      'json',
      '--max-warnings=0',
      ...(typeAware ? ['-c', '.oxlintrc.type-aware.json'] : []),
      ...(typeCheck ? ['--type-check'] : []),
      filename
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  )
  if (result.error) throw result.error
  const report = JSON.parse(result.stdout)
  return { status: result.status, rules: report.diagnostics.map((diagnostic) => diagnostic.code) }
}

test('native lint rules retain Hooks, accessibility, Next.js, and TypeScript checks', () => {
  const result = lint(`
    import { useState } from 'react'
    export default function Example({ enabled }: { enabled: boolean }) {
      if (enabled) useState(0)
      const value: any = 1
      return <img src={String(value)} />
    }
  `)
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('react-hooks(rules-of-hooks)')
  expect(result.rules).toContain('jsx-a11y(alt-text)')
  expect(result.rules).toContain('next(no-img-element)')
  expect(result.rules).toContain('typescript(no-explicit-any)')
})

test('local plugin retains the Next.js internal-navigation check', () => {
  const result = lint(`export function navigate() { window.location.assign('/other') }`)
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('audioframe(no-location-assign-relative-destination)')
})

test('local navigation rule covers global objects, computed properties, prefixes, and reassigned destinations', () => {
  const result = lint(`
    export function navigate(id: string) {
      location.assign('/other')
      window.location.href = '#section'
      globalThis.location.assign('../other')
      self.location['assign']('?page=2')
      document['location']['href'] = 'other'
      window['location']['assign'](\`/users/\${id}\`)
      const destination = '/other'
      window.location.assign(destination)
      const prefix = '/users/'
      window.location.href = prefix + id
      let target = 'https://example.test'
      target = '/other'
      location.assign(target)
    }
  `)
  expect(result.status).not.toBe(0)
  expect(result.rules).toEqual(Array(9).fill('audioframe(no-location-assign-relative-destination)'))
})

test('local navigation rule accepts external URLs, unknown destinations, location reads, and shadowed objects', () => {
  const result = lint(
    `
      export function navigate(destination) {
        window.location.assign('https://example.test')
        window.location.assign('https' + '://example.test')
        location.href = '//example.test'
        globalThis.location.assign('mailto:hello@example.test')
        self.location.href = 'custom:page'
        const target = 'https://example.test'
        window.location.assign(target)
        window.location.assign(destination)
        window.location.assign(\`\${destination}/other\`)
        return new URL(window.location.href).href
      }
      export function shadowed(window, location, self, document, globalThis) {
        window.location.assign('/other')
        location.href = '/other'
        self.location.assign('/other')
        document.location.href = '/other'
        globalThis.location.assign('/other')
      }
      export function cyclic() {
        const first = second
        const second = first
        window.location.assign(first)
      }
    `,
    { filename: 'example.js' }
  )
  expect(result.status).toBe(0)
  expect(result.rules).toEqual([])
})

test('native React rules retain unsafe lifecycle and render-return checks in JavaScript', () => {
  const result = lint(
    `
    import React from 'react'
    export default class Example extends React.Component {
      componentWillMount() {}
      render() {}
    }
  `,
    { filename: 'example.jsx' }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('react(no-unsafe)')
  expect(result.rules).toContain('react(require-render-return)')
})

test('automatic JSX imports and JSX-only variable usages do not produce unused warnings', () => {
  const result = lint(`
    import { Fragment } from 'react'
    export default function Example() { return <Fragment>Ready</Fragment> }
  `)
  expect(result.status).toBe(0)
  expect(result.rules).toEqual([])
})

test('type-aware profile detects promise misuse and TypeScript 7 compiler errors', () => {
  const result = lint(
    `
      declare function work(): Promise<void>
      declare const target: { callback: () => void }
      export function example() {
        work()
        target.callback = async () => { await work() }
      }
      export async function badAwait() { await 123 }
      export const answer: string = 42
    `,
    { typeAware: true, typeCheck: true }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('typescript(no-floating-promises)')
  expect(result.rules).toContain('typescript(no-misused-promises)')
  expect(result.rules).toContain('typescript(await-thenable)')
  expect(result.rules).toContain('typescript(TS2322)')
})

test('type-aware profile detects unsafe values across assignments, calls, members, arguments, and returns', () => {
  const result = lint(
    `
      declare const value: ReturnType<typeof JSON.parse>
      declare function consume(input: string): void
      export function example() {
        const copy = value
        value()
        consume(copy.member)
        consume(value)
        return value
      }
    `,
    { typeAware: true }
  )
  expect(result.status).not.toBe(0)
  for (const rule of [
    'no-unsafe-assignment',
    'no-unsafe-call',
    'no-unsafe-member-access',
    'no-unsafe-return',
    'no-unsafe-argument'
  ])
    expect(result.rules).toContain(`typescript(${rule})`)
})

test('type-aware profile retains the local navigation rule and accepts handled promises', () => {
  const result = lint(
    `
      declare function work(): Promise<void>
      export async function example() { await work() }
      export function navigate() { window.location.assign('/other') }
    `,
    { typeAware: true }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toEqual(['audioframe(no-location-assign-relative-destination)'])
})

test('type-aware profile retains native unsafe lifecycle and render-return checks', () => {
  const result = lint(
    `
      import React from 'react'
      export default class Example extends React.Component {
        componentWillMount() {}
        render() {}
      }
    `,
    { typeAware: true }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('react(no-unsafe)')
  expect(result.rules).toContain('react(require-render-return)')
})

test('type-aware profile rejects deprecated APIs', () => {
  const result = lint(
    `
      /** @deprecated Use modernApi instead. */
      declare function legacyApi(): void
      export function example() { legacyApi() }
    `,
    { typeAware: true }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toEqual(['typescript(no-deprecated)'])
})
