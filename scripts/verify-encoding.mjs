/** Opt-in real browser acceptance. Requires externally installed Playwright, Chrome,
 * ffmpeg and ffprobe; no browser tooling is shipped to users or added to Bun deps.
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/verify-encoding.mjs
 */
import assert from 'node:assert/strict'
import { execFileSync, execFile } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir, cpus, arch, totalmem } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
)
const evidence = resolve(process.env.ENCODING_EVIDENCE_DIR ?? 'output/encoding')
const fixtures = await mkdtemp(join(tmpdir(), 'audioframe-encoding-'))
await mkdir(evidence, { recursive: true })
const native = (binary, args) => execFileSync(binary, ['-v', 'error', ...args], { maxBuffer: 32 * 1024 * 1024 })
native('ffmpeg', [
  '-f',
  'lavfi',
  '-i',
  String.raw`aevalsrc=0.35*sin(2*PI*440*t)*gte(t\,0.5)|0.3*sin(2*PI*660*t)*gte(t\,0.5):s=44100:d=2.35`,
  '-y',
  join(fixtures, 'audio.wav')
])
native('ffmpeg', [
  '-f',
  'lavfi',
  '-i',
  'testsrc=size=200x200:rate=1',
  '-frames:v',
  '1',
  '-y',
  join(fixtures, 'artwork.png')
])
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
  args: ['--enable-precise-memory-info']
})
try {
  const page = await browser.newPage({ acceptDownloads: true })
  const cdp = await browser.newBrowserCDPSession()
  let peakBrowserRSS = 0
  let sampling = false
  const sampleRSS = async () => {
    if (sampling || !['darwin', 'linux'].includes(process.platform)) return
    sampling = true
    try {
      const { processInfo } = await cdp.send('SystemInfo.getProcessInfo')
      const rss = await new Promise((yes, no) =>
        execFile('ps', ['-o', 'rss=', '-p', processInfo.map((p) => p.id).join(',')], (error, stdout) =>
          error ? no(error) : yes(stdout)
        )
      )
      peakBrowserRSS = Math.max(
        peakBrowserRSS,
        rss
          .trim()
          .split(/\s+/)
          .reduce((sum, value) => sum + Number(value) * 1024, 0)
      )
    } catch {
      /* RSS measurement is optional; heap observations still run. */
    } finally {
      sampling = false
    }
  }
  await sampleRSS()
  const baselineBrowserRSS = peakBrowserRSS
  const rssTimer = setInterval(() => {
    void sampleRSS()
  }, 500)
  browser.on('disconnected', () => clearInterval(rssTimer))
  const errors = [],
    mediaUploads = [],
    engineRequests = [],
    outputs = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && !request.url().includes('__nextjs'))
      mediaUploads.push(request.url())
    if (request.url().includes('ffmpeg-core.wasm')) engineRequests.push(request.url())
  })
  await page.addInitScript(() => {
    window.encodingResources = { created: [], revoked: [], peakHeap: 0 }
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      const url = create(blob)
      window.encodingResources.created.push(url)
      return url
    }
    URL.revokeObjectURL = (url) => {
      window.encodingResources.revoked.push(url)
      revoke(url)
    }
    setInterval(() => {
      window.encodingResources.peakHeap = Math.max(
        window.encodingResources.peakHeap,
        performance.memory?.usedJSHeapSize ?? 0
      )
    }, 100)
  })
  await page.goto(process.env.ENCODING_BASE_URL ?? 'http://localhost:3000/create')
  await page.locator('input[type=file]').nth(0).setInputFiles(join(fixtures, 'audio.wav'))
  await page.locator('input[type=file]').nth(1).setInputFiles(join(fixtures, 'artwork.png'))
  await page.getByRole('button', { name: 'Create your frame', exact: true }).click()
  assert.equal(engineRequests.length, 0, 'preview must not load WASM')
  for (const mode of ['Cover', 'Spectrum', 'Lighting']) {
    if (mode !== 'Cover') await page.getByRole('button', { name: 'Back to editing', exact: true }).click()
    await page.getByRole('tab', { name: 'Style', exact: true }).click()
    await page.getByRole('radio', { name: mode, exact: true }).press('Space')
    assert.equal(await page.getByRole('radio', { name: mode, exact: true }).getAttribute('aria-checked'), 'true')
    await page.getByRole('tab', { name: 'Text', exact: true }).click()
    await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Real encoding acceptance')
    await page.getByRole('tab', { name: 'Lyrics', exact: true }).click()
    await page.getByRole('tab', { name: 'Timed LRC', exact: true }).click()
    await page.getByRole('textbox', { name: 'Timed lyrics', exact: true }).fill('[00:00]START\n[00:01]ONE\n[00:02]TWO')
    if (mode === 'Cover') {
      for (const frame of [29, 30, 59, 60, 70]) {
        await page.locator('audio').evaluate(
          (audio, time) => {
            audio.currentTime = time
            audio.dispatchEvent(new Event('timeupdate'))
          },
          (frame + 0.1) / 30
        )
        await page.waitForTimeout(120)
        const png = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL().split(',')[1])
        await writeFile(join(evidence, `reference-${frame}.png`), Buffer.from(png, 'base64'))
      }
    }
    await page.getByRole('button', { name: 'Output preferences', exact: true }).click()
    for (const format of ['MP4', 'WebM']) {
      await page.getByRole('radio', { name: format, exact: true }).check()
      const oldURL = (await page.locator('video').count()) ? await page.locator('video').getAttribute('src') : null
      console.log(`Exporting ${mode} ${format}`)
      const started = Date.now()
      await page.getByRole('button', { name: /^(Export video|Export another video)$/ }).click()
      await page.waitForFunction(
        (old) => {
          const video = document.querySelector('video')
          return (
            (video?.getAttribute('src') && video.getAttribute('src') !== old) ||
            document.body.textContent.includes('Export could not finish')
          )
        },
        oldURL,
        { timeout: 180000 }
      )
      assert.equal(
        await page.getByText('Export could not finish', { exact: true }).count(),
        0,
        await page.locator('main').innerText()
      )
      const seconds = (Date.now() - started) / 1000
      const download = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download video', exact: true }).click()
      const artifact = join(fixtures, `${mode.toLowerCase()}.${format.toLowerCase()}`)
      await (await download).saveAs(artifact)
      const metadata = JSON.parse(
        native('ffprobe', ['-count_frames', '-show_streams', '-show_format', '-of', 'json', artifact]).toString()
      )
      const v = metadata.streams.find((stream) => stream.codec_type === 'video')
      const a = metadata.streams.find((stream) => stream.codec_type === 'audio')
      assert.equal(v.codec_name, format === 'MP4' ? 'h264' : 'vp8')
      assert.equal(a.codec_name, format === 'MP4' ? 'aac' : 'opus')
      assert.equal(a.channels, 2)
      assert.equal(v.width, 568)
      assert.equal(v.height, 320)
      assert.equal(v.r_frame_rate, '30/1')
      assert.equal(Number(v.nb_read_frames), 71, 'partial final chunk must have exactly eleven frames')
      assert.ok(Math.abs(Number(metadata.format.duration) - 2.35) < 0.04)
      const samples = native('ffmpeg', [
        '-i',
        artifact,
        '-map',
        '0:a:0',
        '-ac',
        '1',
        '-ar',
        '22050',
        '-f',
        'f32le',
        '-'
      ])
      const rms = (start, end) => {
        let energy = 0
        for (let index = Math.floor(start * 22050); index < end * 22050; index++)
          energy += samples.readFloatLE(index * 4) ** 2
        return Math.sqrt(energy / ((end - start) * 22050))
      }
      assert.ok(rms(0.05, 0.3) < 0.005, 'initial silence must remain silent')
      assert.ok(rms(0.6, 0.9) > 0.1, 'audio onset must remain aligned')
      console.log(`Verified codecs/audio ${mode} ${format}`)
      const playback = await page.locator('video').evaluate(async (video) => {
        await video.play()
        await new Promise((resolve) => setTimeout(resolve, 300))
        video.pause()
        video.currentTime = 2.1
        await new Promise((resolve, reject) => {
          video.addEventListener('seeked', resolve, { once: true })
          setTimeout(() => reject(new Error('Generated video did not seek')), 5000)
        })
        return { time: video.currentTime, width: video.videoWidth, duration: video.duration }
      })
      assert.equal(playback.width, 568)
      assert.ok(playback.time >= 2)
      if (mode === 'Cover') {
        native('ffmpeg', [
          '-i',
          artifact,
          '-vf',
          String.raw`select=eq(n\,29)+eq(n\,30)+eq(n\,59)+eq(n\,60)+eq(n\,70)`,
          '-fps_mode',
          'vfr',
          '-y',
          join(evidence, `${format.toLowerCase()}-frame-%d.png`)
        ])
      }
      if (mode !== 'Cover') {
        const frame = (index) =>
          native('ffmpeg', [
            '-i',
            artifact,
            '-vf',
            `select=eq(n\\,${index})`,
            '-frames:v',
            '1',
            '-pix_fmt',
            'rgb24',
            '-f',
            'rawvideo',
            '-'
          ])
        const before = frame(0),
          after = frame(30)
        let maximum = 0
        for (let y = 185; y < 280; y++)
          for (let x = 34; x < 534; x++)
            for (let channel = 0; channel < 3; channel++) {
              const index = (y * 568 + x) * 3 + channel
              maximum = Math.max(maximum, Math.abs(before[index] - after[index]))
            }
        assert.ok(maximum > 10, 'reactive effects must respond to audio outside the lyric region')
      }
      outputs.push({
        mode,
        format,
        seconds,
        bytes: Number(metadata.format.size),
        video: v.codec_name,
        audio: a.codec_name,
        frames: Number(v.nb_read_frames),
        duration: Number(metadata.format.duration)
      })
    }
  }
  const pixels = (name) => native('ffmpeg', ['-i', join(evidence, name), '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'])
  const textDifference = (a, b) => {
    let difference = 0
    for (let y = 150; y < 175; y++)
      for (let x = 278; x < 420; x++)
        for (let c = 0; c < 3; c++) difference += Math.abs(a[(y * 568 + x) * 3 + c] - b[(y * 568 + x) * 3 + c])
    return difference / (25 * 142 * 3)
  }
  for (const format of ['mp4', 'webm'])
    for (const [encoded, frame, previous] of [
      [2, 30, 29],
      [4, 60, 59]
    ]) {
      const actual = pixels(`${format}-frame-${encoded}.png`)
      const expected = textDifference(actual, pixels(`reference-${frame}.png`))
      const stale = textDifference(actual, pixels(`reference-${previous}.png`))
      assert.ok(expected < 5 && expected < stale * 0.7, 'lyrics must switch on the absolute chunk-boundary frame')
    }
  const retained = await page.locator('video').getAttribute('src')
  await page.getByRole('button', { name: 'Export another video', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel export', exact: true }).click()
  await page.getByText('Export cancelled', { exact: true }).waitFor()
  assert.equal(await page.locator('video').getAttribute('src'), retained)
  // Force a real FFmpeg asset-load failure after cancellation terminated the engine.
  await page.route('**/ffmpeg/core/ffmpeg-core.wasm', (route) => route.abort())
  await page.getByRole('button', { name: 'Export another video', exact: true }).click()
  await page.getByText('Export could not finish', { exact: true }).waitFor({ timeout: 30000 })
  assert.equal(await page.locator('video').getAttribute('src'), retained)
  await page.unroute('**/ffmpeg/core/ffmpeg-core.wasm')
  await page.getByRole('button', { name: 'Retry export', exact: true }).click()
  await page.waitForFunction(
    (old) =>
      document.querySelector('video')?.getAttribute('src') &&
      document.querySelector('video').getAttribute('src') !== old,
    retained,
    { timeout: 180000 }
  )
  await page.screenshot({ path: join(evidence, 'desktop-result.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: join(evidence, 'mobile-result.png'), fullPage: true })
  // Date.now changes independently of timers to model a suspended/background tab.
  await page.evaluate(() => {
    const now = Date.now()
    Date.now = () => now + 3600001
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.getByText('This preview has expired', { exact: true }).waitFor()
  assert.equal(await page.locator('video').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Download video', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Clear project', exact: true }).first().click()
  await page.getByRole('button', { name: 'Clear project', exact: true }).last().click()
  await page.getByRole('button', { name: 'Create your frame', exact: true }).waitFor()
  const resources = await page.evaluate(() => window.encodingResources)
  const outstanding = resources.created.filter((url) => !resources.revoked.includes(url))
  assert.deepEqual(outstanding, [], 'clear must revoke inputs, output and download URLs')
  assert.deepEqual(errors, [])
  assert.deepEqual(mediaUploads, [])
  const evidenceReport = {
    browser: await browser.version(),
    platform: process.platform,
    device: { cpu: cpus()[0]?.model, arch: arch(), systemMemoryBytes: totalmem() },
    outputs,
    resources: {
      peakJSHeapBytes: resources.peakHeap,
      baselineBrowserRSSBytes: baselineBrowserRSS,
      peakBrowserRSSBytes: peakBrowserRSS,
      outstandingURLsAfterClear: outstanding.length
    },
    errors,
    mediaUploads,
    engineLoads: engineRequests.length
  }
  await writeFile(join(evidence, 'verification.json'), `${JSON.stringify(evidenceReport, null, 2)}\n`)
  console.log(JSON.stringify(evidenceReport, null, 2))
} finally {
  await browser.close()
  await rm(fixtures, { recursive: true, force: true })
}
