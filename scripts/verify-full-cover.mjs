/** Opt-in Full cover acceptance using external Playwright/Chrome and native FFmpeg.
 * Uses the running editor; never installs browser dependencies or uploads media.
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-full-cover.mjs
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
)
const evidence = resolve(process.env.ENCODING_EVIDENCE_DIR ?? 'output/full-cover')
const resolution = process.env.ENCODING_RESOLUTION ?? '320p'
assert.ok(['320p', '720p'].includes(resolution))
const [width, height] = resolution === '720p' ? [1280, 720] : [568, 320]
const fixtures = await mkdtemp(join(tmpdir(), 'audioframe-full-cover-'))
await mkdir(evidence, { recursive: true })
const native = (args) => execFileSync('ffmpeg', ['-v', 'error', ...args], { maxBuffer: 8 * 1024 * 1024 })
native([
  '-f',
  'lavfi',
  '-i',
  String.raw`aevalsrc=0.8*sin(2*PI*440*t)*gte(t\,0.5):s=32000:d=2.35`,
  '-y',
  join(fixtures, 'audio.wav')
])
const artwork = process.env.ARTWORK_PATH ?? join(fixtures, 'artwork.png')
if (!process.env.ARTWORK_PATH) {
  native(['-f', 'lavfi', '-i', 'testsrc=size=400x400:rate=1', '-frames:v', '1', '-y', artwork])
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH })
const checks = []
try {
  const page = await browser.newPage({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2
  })
  const errors = [],
    uploads = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && !request.url().includes('__nextjs')) {
      uploads.push(request.url())
    }
  })
  await page.goto(process.env.ENCODING_BASE_URL ?? 'http://localhost:3000/create')
  await page.getByLabel('Choose audio file', { exact: true }).setInputFiles(join(fixtures, 'audio.wav'))
  await page.getByLabel('Choose artwork file', { exact: true }).setInputFiles(artwork)
  await page.getByRole('button', { name: 'Create your frame', exact: true }).click()
  const radio = (name) => page.getByRole('radio', { name, exact: true })
  const select = async (name) => {
    await radio(name).press('Space')
    assert.equal(await radio(name).getAttribute('aria-checked'), 'true')
  }
  const savePreset = async () => {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export settings', exact: true }).click()
    return JSON.parse(await readFile(await (await download).path(), 'utf8'))
  }
  assert.equal(await radio('Classic').getAttribute('aria-checked'), 'true')
  await select('Lighting')
  await select('Violet')
  await select('Full cover')
  await page.getByText('Lighting is available in Classic.', { exact: false }).waitFor()
  assert.equal(await radio('Fit artwork').getAttribute('aria-checked'), 'true')
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      canvas &&
      canvas.width === Math.max(568, Math.min(1920, Math.ceil(canvas.getBoundingClientRect().width * devicePixelRatio)))
    )
  })
  checks.push('Preview backing raster matches display width at 2× pixel density, capped at 1920px')
  const baseline = await savePreset()
  await select('Segmented')
  await select('Accent')
  await select('Blue')
  await page.getByRole('slider', { name: 'Sensitivity', exact: true }).press('End')
  await page.getByRole('combobox', { name: 'Typeface', exact: true }).click()
  await page.getByRole('option', { name: 'Clean sans', exact: true }).click()
  await select('Classic')
  assert.equal(await radio('Lighting').getAttribute('aria-checked'), 'true')
  assert.equal(await radio('Violet').getAttribute('aria-checked'), 'true')
  assert.equal(await page.getByRole('slider', { name: 'Sensitivity', exact: true }).getAttribute('aria-valuenow'), '60')
  assert.match(await page.getByRole('combobox', { name: 'Typeface', exact: true }).innerText(), /Space Grotesk/)
  await select('Full cover')
  assert.equal(await radio('Segmented').getAttribute('aria-checked'), 'true')
  assert.equal(await radio('Blue').getAttribute('aria-checked'), 'true')
  assert.equal(
    await page.getByRole('slider', { name: 'Sensitivity', exact: true }).getAttribute('aria-valuenow'),
    '100'
  )
  assert.match(await page.getByRole('combobox', { name: 'Typeface', exact: true }).innerText(), /Clean sans/)
  checks.push('Switching layouts restores independent Classic and Full cover choices')
  await select('None')
  assert.equal(await page.getByRole('radiogroup', { name: 'Bar pattern', exact: true }).count(), 0)
  await select('Bars')
  await select('Thin')
  await select('Ivory')
  await page.getByRole('tab', { name: 'Text', exact: true }).click()
  await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Full cover acceptance')
  assert.equal(await page.getByRole('radiogroup', { name: 'Show song details', exact: true }).count(), 0)
  await page.getByRole('tab', { name: 'Lyrics', exact: true }).click()
  await page.getByRole('tab', { name: 'Timed LRC', exact: true }).click()
  await page.getByRole('textbox', { name: 'Timed lyrics', exact: true }).fill('[00:00]প্রথম লাইন\n[00:01]Second line')
  await page.getByRole('tab', { name: 'Style', exact: true }).click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(evidence, 'desktop-fit.png'), fullPage: true })
  await select('Fill frame')
  await page.getByRole('slider', { name: 'Vertical position', exact: true }).press('Home')
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(evidence, 'desktop-fill.png'), fullPage: true })
  await select('Fit artwork')
  checks.push('Fit/Fill, crop positioning, Bars/None, details and LRC controls exercised')
  const preset = await savePreset()
  assert.equal(preset.preferences.layout, 'full-cover')
  assert.equal(preset.preferences.mode, 'lighting')
  assert.equal('showDetails' in preset.preferences.fullCover, false)
  preset.preferences.fullCover.showDetails = false // Old presets cannot suppress entered details anymore.
  await select('Classic')
  await page.getByLabel('Import JSON settings file').setInputFiles({
    name: 'full-cover.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(preset))
  })
  await page.getByRole('button', { name: 'Apply settings', exact: true }).click()
  assert.equal(await radio('Full cover').getAttribute('aria-checked'), 'true')
  assert.equal(await page.locator('canvas').count(), 1)
  assert.equal('showDetails' in (await savePreset()).preferences.fullCover, false)
  checks.push('Full cover settings downloaded and imported without losing selected media')
  const legacy = structuredClone(baseline)
  delete legacy.preferences.layout
  delete legacy.preferences.fullCover
  await page.getByLabel('Import JSON settings file').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy))
  })
  await page.getByRole('button', { name: 'Apply settings', exact: true }).click()
  assert.equal(await radio('Classic').getAttribute('aria-checked'), 'true')
  await select('Cover')
  await select('Full cover')
  await page.getByRole('tab', { name: 'Text', exact: true }).click()
  assert.equal(await page.getByRole('radiogroup', { name: 'Show song details', exact: true }).count(), 0)
  await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('আজটুকুই')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Abhishek Deb')
  await page.getByRole('textbox', { name: 'Album', exact: true }).fill('Aajtukui')
  await page.getByRole('textbox', { name: 'Website', exact: true }).fill('abhishekdeb.com')
  await page.getByRole('tab', { name: 'Style', exact: true }).click()
  checks.push('Full cover renders all entered details without a visibility toggle, including old Hide details presets')
  checks.push('Legacy preset opens Classic; Full cover bars selected while retained Classic mode is Cover')
  await page.waitForTimeout(250)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(evidence, 'mobile-fit.png'), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      canvas &&
      canvas.width === Math.max(568, Math.min(1920, Math.ceil(canvas.getBoundingClientRect().width * devicePixelRatio)))
    )
  })
  checks.push('390px mobile viewport has no horizontal overflow (emulation only)')
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.getByRole('button', { name: 'Output preferences', exact: true }).click()
  await select(resolution)
  const outputs = []
  for (const format of ['MP4', 'WebM']) {
    await select(format)
    const previous = (await page.locator('video').count()) ? await page.locator('video').getAttribute('src') : null
    await page.getByRole('button', { name: /^(Export video|Export another video)$/ }).click()
    await page.waitForFunction(
      (old) => {
        const video = document.querySelector('video')
        return (
          (video?.getAttribute('src') && video.getAttribute('src') !== old) ||
          document.body.textContent.includes('Export could not finish')
        )
      },
      previous,
      { timeout: 180000 }
    )
    assert.equal(await page.getByText('Export could not finish', { exact: true }).count(), 0)
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download video', exact: true }).click()
    const path = join(evidence, `full-cover.${format.toLowerCase()}`)
    await (await downloading).saveAs(path)
    const probe = JSON.parse(
      execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path])
    )
    const video = probe.streams.find((stream) => stream.codec_type === 'video')
    const audio = probe.streams.find((stream) => stream.codec_type === 'audio')
    assert.deepEqual([video.width, video.height, video.r_frame_rate], [width, height, '30/1'])
    assert.equal(video.codec_name, format === 'MP4' ? 'h264' : 'vp8')
    assert.equal(audio.codec_name, format === 'MP4' ? 'aac' : 'opus')
    assert.ok(Math.abs(Number(probe.format.duration) - 2.35) < 0.1)
    native(['-i', path, '-f', 'null', '-'])
    const pixels = (time) =>
      native([
        '-ss',
        String(time),
        '-i',
        path,
        '-vf',
        'scale=568:320,crop=512:60:28:244',
        '-frames:v',
        '1',
        '-pix_fmt',
        'rgb24',
        '-f',
        'rawvideo',
        'pipe:1'
      ])
    const quiet = pixels(0),
      loud = pixels(1)
    const ivoryCount = (rgb) => {
      let count = 0
      for (let i = 0; i < rgb.length; i += 3) {
        if (rgb[i] > 210 && rgb[i + 1] > 200 && rgb[i + 2] > 170) count++
      }
      return count
    }
    assert.ok(
      ivoryCount(loud) > ivoryCount(quiet) + 15,
      'Encoded bars must grow after silence when Classic mode is Cover'
    )
    native(['-ss', '1', '-i', path, '-frames:v', '1', '-y', join(evidence, `encoded-${format.toLowerCase()}.png`)])
    const playable = await page.locator('video').evaluate(async (element) => {
      await element.play()
      await new Promise((resolve) => setTimeout(resolve, 200))
      element.pause()
      return { error: element.error?.message, time: element.currentTime }
    })
    assert.equal(playable.error, undefined)
    assert.ok(playable.time > 0)
    outputs.push({
      format,
      width: video.width,
      height: video.height,
      duration: probe.format.duration,
      quietBars: ivoryCount(quiet),
      loudBars: ivoryCount(loud)
    })
    checks.push(
      `${format}: real browser WASM export, local download, native decode and browser playback; bars react after silence`
    )
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(uploads, [])
  await writeFile(join(evidence, 'observations.json'), JSON.stringify({ checks, outputs, errors, uploads }, null, 2))
  console.log(JSON.stringify({ checks, outputs, evidence }, null, 2))
} finally {
  await browser.close()
  await rm(fixtures, { recursive: true, force: true })
}
