/** Opt-in real-file/UI acceptance; uses the same external Playwright setup as verify-encoding.mjs. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
)
const evidence = resolve(process.env.ENCODING_EVIDENCE_DIR ?? 'output/release/ui')
const fixtures = await mkdtemp(join(tmpdir(), 'audioframe-release-ui-'))
await mkdir(evidence, { recursive: true })
const native = (args) => execFileSync('ffmpeg', ['-v', 'error', ...args])
native(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-y', join(fixtures, 'audio.wav')])
native(['-f', 'lavfi', '-i', 'testsrc=size=200x200:rate=1', '-frames:v', '1', '-y', join(fixtures, 'artwork.png')])
native(['-f', 'lavfi', '-i', 'sine=duration=421:sample_rate=8000', '-y', join(fixtures, 'long.wav')])
native(['-f', 'lavfi', '-i', 'color=size=16x16:duration=1', '-an', '-y', join(fixtures, 'silent.mp4')])
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH })
const checks = []
try {
  const page = await browser.newPage({ acceptDownloads: true })
  const errors = [],
    uploads = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && !request.url().includes('__nextjs'))
      uploads.push(request.url())
  })
  // Delay only our named fixture to exercise a real pending FileReader cancellation.
  await page.addInitScript(() => {
    const original = FileReader.prototype.readAsArrayBuffer
    const abort = FileReader.prototype.abort
    const pending = new WeakMap()
    FileReader.prototype.readAsArrayBuffer = function (blob) {
      if (blob.name === 'delayed.wav')
        pending.set(
          this,
          setTimeout(() => original.call(this, blob), 1500)
        )
      else original.call(this, blob)
    }
    FileReader.prototype.abort = function () {
      clearTimeout(pending.get(this))
      abort.call(this)
    }
  })
  await page.goto(process.env.ENCODING_BASE_URL ?? 'http://localhost:3010/create')
  const audio = page.getByLabel('Choose audio file', { exact: true })
  const artwork = page.getByLabel('Choose artwork file', { exact: true })
  const create = page.getByRole('button', { name: 'Create your frame', exact: true })
  assert.equal(await create.isDisabled(), true)
  const upload = (name, contents) => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(contents) })
  for (const [file, error] of [
    [upload('empty.wav', ''), 'This file is empty. Choose another audio file.'],
    [
      upload('renamed.mp3', 'This is text, not audio'),
      'This file does not contain valid MP3, WAV, M4A, or MP4 audio. Choose another file.'
    ],
    [join(fixtures, 'silent.mp4'), 'This MP4 has no audio track. Choose a file that contains audio.'],
    [join(fixtures, 'long.wav'), 'Choose a track that is 7 minutes or shorter.']
  ]) {
    await audio.setInputFiles(file)
    await page.getByText(error, { exact: true }).waitFor()
    assert.equal(await create.isDisabled(), true)
  }
  checks.push('Real empty, renamed-text, video-only MP4 and 421-second audio rejected')
  await audio.setInputFiles({
    name: 'delayed.wav',
    mimeType: 'audio/wav',
    buffer: await readFile(join(fixtures, 'audio.wav'))
  })
  await page.getByRole('button', { name: 'Cancel audio loading', exact: true }).click()
  await page
    .locator('button')
    .filter({ hasText: /^Choose audio file$/ })
    .waitFor()
  await page.waitForTimeout(1600)
  assert.equal(await page.getByRole('button', { name: 'Remove audio', exact: true }).count(), 0)
  await audio.setInputFiles(join(fixtures, 'audio.wav'))
  await page.getByRole('button', { name: 'Remove audio', exact: true }).waitFor()
  await artwork.setInputFiles(upload('invalid.png', 'not a PNG'))
  await page.getByText('This file is not a valid PNG image.', { exact: true }).waitFor()
  assert.equal(await create.isDisabled(), true)
  await artwork.setInputFiles(join(fixtures, 'artwork.png'))
  await create.click()
  checks.push('Interrupted native file loading discards stale result; valid replacements recover')
  await page.getByRole('tab', { name: 'Text', exact: true }).click()
  await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Release settings round trip')
  const settingsDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export settings', exact: true }).click()
  const settingsPath = join(fixtures, 'settings.json')
  await (await settingsDownload).saveAs(settingsPath)
  const settings = JSON.parse(await readFile(settingsPath, 'utf8'))
  assert.equal(settings.preferences.details.title, 'Release settings round trip')
  await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Edited title')
  await page.getByLabel('Import JSON settings file').setInputFiles(settingsPath)
  await page.getByRole('dialog', { name: 'Replace current settings?' }).waitFor()
  await page.getByRole('button', { name: 'Keep current settings', exact: true }).press('Escape')
  assert.equal(await page.getByRole('textbox', { name: 'Song title', exact: true }).inputValue(), 'Edited title')
  await page.getByLabel('Import JSON settings file').setInputFiles(settingsPath)
  await page.getByRole('button', { name: 'Apply settings', exact: true }).click()
  assert.equal(
    await page.getByRole('textbox', { name: 'Song title', exact: true }).inputValue(),
    settings.preferences.details.title
  )
  await page
    .getByLabel('Import JSON settings file')
    .setInputFiles(upload('invalid.json', JSON.stringify({ ...settings, media: 'private-file' })))
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent?.includes('settings'))
  assert.equal(
    await page.getByRole('textbox', { name: 'Song title', exact: true }).inputValue(),
    settings.preferences.details.title
  )
  checks.push('Downloaded JSON round trip, cancelled replacement, strict unknown-key rejection')

  const layouts = []
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport)
    for (const dark of [false, true]) {
      if ((await page.getByRole('switch', { name: 'Dark theme' }).getAttribute('aria-checked')) !== String(dark))
        await page.getByRole('switch', { name: 'Dark theme' }).click()
      await page.getByRole('tab', { name: 'Style', exact: true }).click()
      for (const mode of ['Cover', 'Spectrum', 'Lighting']) {
        await page.getByRole('radio', { name: mode, exact: true }).press('Space')
        assert.equal(await page.getByRole('radio', { name: mode, exact: true }).getAttribute('aria-checked'), 'true')
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `overflow at ${viewport.width}px ${mode}`
        )
      }
      const button = await page.getByRole('button', { name: 'Output preferences', exact: true }).boundingBox()
      assert.ok(button.width >= 44 && button.height >= 44)
      layouts.push({ ...viewport, dark, modes: ['Cover', 'Spectrum', 'Lighting'], primaryTouchTarget: button })
      if (viewport.width === 390 || viewport.width === 1280)
        await page.screenshot({
          path: join(evidence, `editor-${viewport.width}-${dark ? 'dark' : 'light'}.png`),
          fullPage: true
        })
    }
  }
  await page.getByRole('tab', { name: 'Style', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  assert.equal(await page.getByRole('tab', { name: 'Text', exact: true }).getAttribute('aria-selected'), 'true')
  await page.getByRole('tab', { name: 'Style', exact: true }).click()
  await page.getByRole('radio', { name: 'Spectrum', exact: true }).press('Space')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('audio').evaluate(async (element) => {
    element.currentTime = 0
    await element.play()
  })
  await page.waitForTimeout(200)
  const first = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL())
  await page.waitForTimeout(200)
  assert.equal(await page.locator('canvas').evaluate((canvas) => canvas.toDataURL()), first)
  await page.locator('audio').evaluate((element) => element.pause())
  await page.getByRole('slider', { name: 'Seek position' }).press('Home')
  await page.getByRole('slider', { name: 'Seek position' }).press('ArrowRight')
  assert.equal(await page.locator('audio').evaluate((element) => element.currentTime), 1)
  await page.getByRole('slider', { name: 'Volume' }).press('Home')
  assert.equal(await page.locator('audio').evaluate((element) => element.volume), 0)
  await page.getByRole('slider', { name: 'Volume' }).press('End')
  assert.equal(await page.locator('audio').evaluate((element) => element.volume), 1)
  checks.push(
    'Responsive real editor modes/themes/orientation, 44px primary target, keyboard tabs/radios/seek/volume, reduced-motion playback'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Clear project', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Clear this local project?' })
  await dialog.waitFor()
  const dialogBounds = await dialog.boundingBox()
  assert.ok(dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= 390)
  await page.screenshot({ path: join(evidence, 'mobile-clear-dialog.png'), fullPage: true })
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab')
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
    assert.ok(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
      'dialog must contain keyboard focus'
    )
  }
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await page.waitForFunction(() => document.activeElement?.textContent === 'Clear project')
  assert.ok(
    await page
      .getByRole('button', { name: 'Clear project', exact: true })
      .evaluate((element) => element === document.activeElement)
  )
  await page.getByRole('button', { name: 'Clear project', exact: true }).click()
  await dialog.getByRole('button', { name: 'Clear project', exact: true }).click()
  await create.waitFor()
  checks.push('Clear dialog focus containment, Escape restoration and confirmed reset')
  const blocked = await browser.newPage()
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'WebAssembly', { value: undefined })
  })
  await blocked.goto(process.env.ENCODING_BASE_URL ?? 'http://localhost:3010/create')
  await blocked.getByText('This browser cannot run the local editor', { exact: true }).waitFor()
  assert.equal(await blocked.getByRole('button', { name: 'Create your frame', exact: true }).isDisabled(), true)
  await blocked.close()
  checks.push('Missing WASM produces actionable capability failure and disabled conversion')
  assert.deepEqual(errors, [])
  assert.deepEqual(uploads, [])
  const report = {
    testedAt: new Date().toISOString(),
    browser: await browser.version(),
    environment: 'Desktop Chrome; mobile sizes are viewport emulation',
    checks,
    layouts,
    errors,
    mediaUploads: uploads
  }
  await writeFile(join(evidence, 'verification.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
  await rm(fixtures, { recursive: true, force: true })
}
