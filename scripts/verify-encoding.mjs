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
import { createHash } from 'node:crypto'

const duration = Number(process.env.ENCODING_DURATION ?? 2.35)
const resolution = process.env.ENCODING_RESOLUTION ?? '320p'
assert.ok(Number.isFinite(duration) && duration >= 2.35 && duration <= 900, 'duration must be 2.35–900 seconds')
assert.ok(['320p', '720p'].includes(resolution), 'resolution must be 320p or 720p')
const [width, height] = resolution === '720p' ? [1280, 720] : [568, 320]
const scale = width / 568
const timeout = Number(process.env.ENCODING_TIMEOUT_MS ?? 3600000)
const baseURL = process.env.ENCODING_BASE_URL ?? 'http://localhost:3000/create'
const recoveryChecks = process.env.ENCODING_RECOVERY !== '0'
const modes = (process.env.ENCODING_MODES ?? 'Cover,Spectrum,Lighting').split(',')
const formats = (process.env.ENCODING_FORMATS ?? 'MP4,WebM').split(',')
assert.ok(modes.length && modes.every((mode) => ['Cover', 'Spectrum', 'Lighting'].includes(mode)))
assert.ok(formats.length && formats.every((format) => ['MP4', 'WebM'].includes(format)))
assert.ok(Number.isFinite(timeout) && timeout > 0, 'timeout must be positive milliseconds')
const boundaryTimes = [1, 2, 60, 120, 210, 300, 419, 600, 720, 899].filter((time) => time < duration)
const referenceFrames = [
  ...new Set(boundaryTimes.flatMap((time) => [time * 30 - 1, time * 30]).concat(Math.ceil(duration * 30) - 1))
]
const lyrics =
  '[00:00]START\n' +
  boundaryTimes
    .map(
      (time, i) =>
        `[${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}]${i % 2 ? 'TWO' : 'ONE'}`
    )
    .join('\n')

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
)
const evidence = resolve(process.env.ENCODING_EVIDENCE_DIR ?? 'output/encoding')
const fixtures = await mkdtemp(join(tmpdir(), 'audioframe-encoding-'))
await mkdir(evidence, { recursive: true })
// Native audio verification captures bounded mono float PCM through the complete timeline.
const nativeOutputLimit = Math.max(64 * 1024 * 1024, Math.ceil((duration + 1) * 22050 * 4) + 1024 * 1024)
const native = (binary, args) => execFileSync(binary, ['-v', 'error', ...args], { maxBuffer: nativeOutputLimit })
// Keep full-length stereo WAV fixtures below the input byte guard without changing short/legacy fixtures.
const fixtureSampleRate = duration > 420 ? 16000 : 32000
native('ffmpeg', [
  '-f',
  'lavfi',
  '-i',
  String.raw`aevalsrc=0.35*sin(2*PI*440*t)*gte(mod(t\,30)\,0.5)|0.3*sin(2*PI*660*t)*gte(mod(t\,30)\,0.5):s=${fixtureSampleRate}:d=${duration}`,
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
  page.setDefaultTimeout(30000)
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
  page.on('console', (message) => {
    if (message.text().startsWith('Encoding progress:')) console.log(message.text())
  })
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && !request.url().includes('__nextjs'))
      mediaUploads.push(request.url())
    if (request.url().includes('ffmpeg-core.wasm')) engineRequests.push(request.url())
  })
  await page.addInitScript(() => {
    window.encodingResources = { created: [], revoked: [], peakHeap: 0, heartbeatGaps: [], stages: [] }
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
    let previous = performance.now()
    setInterval(() => {
      const now = performance.now()
      if (window.encodingResources.measuring) window.encodingResources.heartbeatGaps.push(now - previous)
      previous = now
      const percent = Number(
        document.querySelector('[aria-label="Video export progress"]')?.getAttribute('aria-valuenow') ?? 0
      )
      if (window.encodingResources.measuring && percent >= (window.encodingResources.lastLoggedPercent ?? 0) + 10) {
        window.encodingResources.lastLoggedPercent = Math.floor(percent / 10) * 10
        console.log(`Encoding progress: ${Math.round(percent)}%`)
      }
      const stage = document.querySelector('[aria-label="Export stages"] [aria-current="step"]')?.textContent?.trim()
      const stages = window.encodingResources.stages
      if (window.encodingResources.measuring && stage && stages.at(-1)?.stage !== stage) stages.push({ stage, ms: now })
    }, 50)
  })
  await page.goto(baseURL)
  const capabilities = await page.evaluate(() => ({
    secureContext: isSecureContext,
    crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB: navigator.deviceMemory ?? null
  }))
  // Capability probing is asynchronous; setInputFiles can bypass a disabled input.
  await page.locator('input[type=file]:enabled').nth(1).waitFor({ state: 'attached' })
  await page.locator('input[type=file]').nth(0).setInputFiles(join(fixtures, 'audio.wav'))
  await page.locator('input[type=file]').nth(1).setInputFiles(join(fixtures, 'artwork.png'))
  await page.getByRole('button', { name: 'Create your frame', exact: true }).click()
  assert.equal(engineRequests.length, 0, 'preview must not load WASM')
  await page.getByRole('button', { name: 'Output preferences', exact: true }).click()
  await page.getByRole('radio', { name: resolution, exact: true }).check()
  await page.getByRole('button', { name: 'Back to editing', exact: true }).click()
  for (const [modeIndex, mode] of modes.entries()) {
    if (modeIndex) await page.getByRole('button', { name: 'Back to editing', exact: true }).click()
    await page.getByRole('tab', { name: 'Style', exact: true }).click()
    await page.getByRole('radio', { name: mode, exact: true }).press('Space')
    assert.equal(await page.getByRole('radio', { name: mode, exact: true }).getAttribute('aria-checked'), 'true')
    await page.getByRole('tab', { name: 'Text', exact: true }).click()
    await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Real encoding acceptance')
    await page.getByRole('tab', { name: 'Lyrics', exact: true }).click()
    await page.getByRole('tab', { name: 'Timed LRC', exact: true }).click()
    await page.getByRole('textbox', { name: 'Timed lyrics', exact: true }).fill(lyrics)
    if (mode === 'Cover') {
      for (const frame of referenceFrames) {
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
    await page.getByRole('radio', { name: resolution, exact: true }).check()
    for (const format of formats) {
      await page.getByRole('radio', { name: format, exact: true }).check()
      const oldURL = (await page.locator('video').count()) ? await page.locator('video').getAttribute('src') : null
      console.log(`Exporting ${mode} ${format}`)
      const started = Date.now()
      await page.evaluate(() => {
        Object.assign(window.encodingResources, {
          measuring: true,
          lastLoggedPercent: 0,
          heartbeatGaps: [],
          stages: [],
          started: performance.now()
        })
      })
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
        { timeout }
      )
      assert.equal(
        await page.getByText('Export could not finish', { exact: true }).count(),
        0,
        await page.locator('main').innerText()
      )
      const seconds = (Date.now() - started) / 1000
      const observations = await page.evaluate(() => {
        const resources = window.encodingResources
        resources.measuring = false
        const gaps = resources.heartbeatGaps.sort((a, b) => a - b)
        return {
          mainThreadHeartbeat: {
            samples: gaps.length,
            p95Ms: gaps[Math.floor(gaps.length * 0.95)] ?? null,
            maximumMs: gaps.at(-1) ?? null
          },
          stages: resources.stages.map((item, i, stages) => ({
            stage: item.stage,
            seconds: ((stages[i + 1]?.ms ?? performance.now()) - item.ms) / 1000
          })),
          peakJSHeapBytes: resources.peakHeap
        }
      })
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
      assert.equal(v.width, width)
      assert.equal(v.height, height)
      assert.equal(v.r_frame_rate, '30/1')
      assert.equal(Number(v.nb_read_frames), Math.ceil(duration * 30), 'every frame must survive final assembly')
      assert.ok(Math.abs(Number(metadata.format.duration) - duration) < 0.04)
      // Decode the complete file, then inspect every video packet timestamp for drift/gaps.
      native('ffmpeg', ['-i', artifact, '-f', 'null', '-'])
      const packets = JSON.parse(
        native('ffprobe', [
          '-select_streams',
          'v:0',
          '-show_packets',
          '-show_entries',
          'packet=pts_time',
          '-of',
          'json',
          artifact
        ]).toString()
      ).packets
      assert.equal(packets.length, Math.ceil(duration * 30))
      const firstPTS = Number(packets[0].pts_time)
      assert.ok(Math.abs(firstPTS) < 0.04)
      let maximumTimestampError = 0
      for (let index = 0; index < packets.length; index++)
        maximumTimestampError = Math.max(
          maximumTimestampError,
          Math.abs(Number(packets[index].pts_time) - firstPTS - index / 30)
        )
      assert.ok(maximumTimestampError < 0.002, 'complete timeline must not accumulate concat drift')
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
      const audioMarkers = []
      for (let marker = 0; marker + 0.9 < duration; marker += 30) {
        const silence = rms(marker + 0.05, marker + 0.3),
          tone = rms(marker + 0.6, marker + 0.9)
        assert.ok(silence < 0.005 && tone > 0.1, `audio marker ${marker}s must remain aligned`)
        audioMarkers.push({ seconds: marker, silenceRMS: silence, toneRMS: tone })
      }
      console.log(`Verified codecs/audio ${mode} ${format}`)
      const playback = await page.locator('video').evaluate(
        async (video, seekTimes) => {
          await video.play()
          await new Promise((resolve) => setTimeout(resolve, 300))
          video.pause()
          const seeks = []
          for (const time of seekTimes) {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('Generated video did not seek')), 5000)
              video.addEventListener(
                'seeked',
                () => {
                  clearTimeout(timer)
                  resolve()
                },
                { once: true }
              )
              video.currentTime = time
            })
            seeks.push(video.currentTime)
          }
          return { time: video.currentTime, width: video.videoWidth, duration: video.duration, seeks }
        },
        [2.1, ...boundaryTimes.filter((time) => time > 2).map((time) => time + 0.1)]
      )
      assert.equal(playback.width, width)
      assert.ok(playback.time >= 2)
      if (mode === 'Cover') {
        native('ffmpeg', [
          '-i',
          artifact,
          '-vf',
          'select=' + referenceFrames.map((frame) => `eq(n\\,${frame})`).join('+'),
          '-fps_mode',
          'vfr',
          '-y',
          join(evidence, `${format.toLowerCase()}-frame-%d.png`)
        ])
      }
      const visualMarkers = []
      if (mode !== 'Cover') {
        const markerFrames = audioMarkers.flatMap((marker) => [marker.seconds * 30 + 3, marker.seconds * 30 + 24])
        const crop = {
          x: Math.ceil(34 * scale),
          y: Math.ceil(185 * scale),
          width: Math.floor(500 * scale),
          height: Math.floor(95 * scale)
        }
        const frames = native('ffmpeg', [
          '-i',
          artifact,
          '-vf',
          'select=' +
            markerFrames.map((index) => `eq(n\\,${index})`).join('+') +
            `,crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}:exact=1`,
          '-fps_mode',
          'vfr',
          '-pix_fmt',
          'rgb24',
          '-f',
          'rawvideo',
          '-'
        ])
        const size = crop.width * crop.height * 3
        assert.equal(frames.length, size * markerFrames.length)
        for (let marker = 0; marker < audioMarkers.length; marker++) {
          let maximum = 0
          for (let index = 0; index < size; index++)
            maximum = Math.max(
              maximum,
              Math.abs(frames[marker * size * 2 + index] - frames[(marker * 2 + 1) * size + index])
            )
          assert.ok(maximum > 10, `reactive effects must follow audio at ${audioMarkers[marker].seconds}s`)
          visualMarkers.push({ seconds: audioMarkers[marker].seconds, maximumPixelChange: maximum })
        }
      }
      outputs.push({
        mode,
        format,
        seconds,
        bytes: Number(metadata.format.size),
        video: v.codec_name,
        audio: a.codec_name,
        frames: Number(v.nb_read_frames),
        duration: Number(metadata.format.duration),
        maximumTimestampError,
        audioMarkers,
        visualMarkers,
        playback,
        observations
      })
      await writeFile(join(evidence, 'exports.json'), `${JSON.stringify(outputs, null, 2)}\n`)
    }
  }
  // Preview now follows display density; compare both images at the export dimensions.
  const pixels = (name) =>
    native('ffmpeg', [
      '-i',
      join(evidence, name),
      '-vf',
      `scale=${width}:${height}:flags=lanczos`,
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      '-'
    ])
  const textDifference = (a, b) => {
    let difference = 0
    let count = 0
    for (let y = Math.ceil(150 * scale); y < 175 * scale; y++)
      for (let x = Math.ceil(278 * scale); x < 420 * scale; x++)
        for (let c = 0; c < 3; c++) {
          difference += Math.abs(a[(y * width + x) * 3 + c] - b[(y * width + x) * 3 + c])
          count++
        }
    return difference / count
  }
  for (const format of modes.includes('Cover') ? formats.map((format) => format.toLowerCase()) : [])
    for (const time of boundaryTimes) {
      const frame = time * 30,
        previous = frame - 1,
        encoded = referenceFrames.indexOf(frame) + 1
      const actual = pixels(`${format}-frame-${encoded}.png`)
      const expected = textDifference(actual, pixels(`reference-${frame}.png`))
      const stale = textDifference(actual, pixels(`reference-${previous}.png`))
      assert.ok(expected < 5 && expected < stale * 0.7, 'lyrics must switch on the absolute chunk-boundary frame')
    }
  if (recoveryChecks) {
    const retained = await page.locator('video').getAttribute('src')
    await page.getByRole('button', { name: 'Export another video', exact: true }).click()
    // Cancel after at least one encoded batch, rather than only during preparation.
    await page.waitForFunction(
      () => Number(document.querySelector('[aria-label="Video export progress"]')?.getAttribute('aria-valuenow')) >= 10,
      undefined,
      { timeout: 30000 }
    )
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
      { timeout }
    )
  }
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
    testedAt: new Date().toISOString(),
    baseURL,
    inputDuration: duration,
    recoveryChecks,
    modes,
    formats,
    resolution,
    dimensions: { width, height },
    environment: 'Desktop Chrome; viewport emulation is not physical mobile evidence',
    capabilities,
    engine: {
      package: '@ffmpeg/core 0.12.10',
      threads: 1,
      wasmSHA256: createHash('sha256')
        .update(
          await (
            await fetch(new URL('/ffmpeg/core/ffmpeg-core.wasm', baseURL))
          )
            .arrayBuffer()
            .then((bytes) => Buffer.from(bytes))
        )
        .digest('hex')
    },
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
  await rm(join(evidence, 'failure.json'), { force: true })
  console.log(JSON.stringify(evidenceReport, null, 2))
} catch (error) {
  await writeFile(
    join(evidence, 'failure.json'),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        baseURL,
        inputDuration: duration,
        resolution,
        modes,
        formats,
        error: String(error)
      },
      null,
      2
    ) + '\n'
  )
  throw error
} finally {
  await browser.close()
  await rm(fixtures, { recursive: true, force: true })
}
