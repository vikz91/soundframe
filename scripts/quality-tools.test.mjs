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

function lint(code, { typeAware = false, typeCheck = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'audioframe-lint-'))
  fixtures.push(root)
  copyFileSync(join(source, '.oxlintrc.json'), join(root, '.oxlintrc.json'))
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir')
  writeFileSync(join(root, 'example.tsx'), code)
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
        include: ['example.tsx']
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
      'example.tsx'
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

test('compatibility plugin retains the Next.js internal-navigation check', () => {
  const result = lint(`export function navigate() { window.location.assign('/other') }`)
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('next-compat(no-location-assign-relative-destination)')
})

test('compatibility plugin retains deprecated React API and render-return checks', () => {
  const result = lint(`
    import React from 'react'
    export default class Example extends React.Component {
      componentWillMount() {}
      render() {}
    }
  `)
  expect(result.status).not.toBe(0)
  expect(result.rules).toContain('react-compat(no-deprecated)')
  expect(result.rules).toContain('react-compat(require-render-return)')
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

test('type-aware profile retains compatibility rules and accepts handled promises', () => {
  const result = lint(
    `
      declare function work(): Promise<void>
      export async function example() { await work() }
      export function navigate() { window.location.assign('/other') }
    `,
    { typeAware: true }
  )
  expect(result.status).not.toBe(0)
  expect(result.rules).toEqual(['next-compat(no-location-assign-relative-destination)'])
})

test('type-aware profile retains deprecated React API and render-return checks', () => {
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
  expect(result.rules).toContain('react-compat(no-deprecated)')
  expect(result.rules).toContain('react-compat(require-render-return)')
})
