import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve(process.env.EVIDENCE_ROOT ?? 'evidence/bird-performance/review')
const rawDir = path.join(evidenceDir, 'raw')
const motionDir = path.join(evidenceDir, 'recordings')
const frameDir = path.join(evidenceDir, 'frames')
await Promise.all([rawDir, motionDir, frameDir].map((directory) => fs.mkdir(directory, { recursive: true })))

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, runs: [], errors: [] }

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`${label} console: ${message.text()}`) })
  page.on('pageerror', (error) => report.errors.push(`${label} page: ${error.message}`))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? ''
    if (!reason.includes('ERR_ABORTED')) report.errors.push(`${label} request: ${request.url()} :: ${reason}`)
  })
}

async function capture(label, viewport, withAudio) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: rawDir, size: viewport } })
  const page = await context.newPage()
  const videoStartedAt = Date.now()
  observe(page, label)
  await page.addInitScript(() => {
    window.__reviewSounds = []
    window.__reviewHandoff = []
    addEventListener('farmstandsound', (event) => window.__reviewSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
    addEventListener('farmstandhandofftrace', (event) => window.__reviewHandoff.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  await page.goto(`${baseURL}?recordSound=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.mouse.click(8, Math.min(320, viewport.height / 2))
  await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
  if (await page.locator('.music-toggle').getAttribute('data-music-state') !== 'muted') await page.locator('.music-toggle').click()
  await page.waitForFunction(() => document.querySelector('.music-toggle')?.getAttribute('data-music-state') === 'muted')

  let audioStartedAt = 0
  if (withAudio) {
    audioStartedAt = Date.now()
    await page.evaluate(() => {
      const stream = window.__farmStandAudioStream
      if (!stream) throw new Error('Web Audio capture stream unavailable')
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      const chunks = []
      recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
      window.__performanceRecorder = recorder
      window.__performanceChunks = chunks
      recorder.start(100)
    })
  }

  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  const entrySamples = []
  let capturedEntry = false
  while (await page.locator('.hero-stage').getAttribute('data-opening-state') !== 'open') {
    const sample = await page.locator('.scene-host').evaluate((element) => ({ atMs: Math.round(performance.now()), ...element.dataset }))
    entrySamples.push(sample)
    if (!capturedEntry && sample.birdPhase === 'airborne-2') {
      await page.screenshot({ path: path.join(frameDir, `${label}-bird-entry.png`) })
      capturedEntry = true
    }
    if (entrySamples.length > 240) throw new Error(`${label} opening did not complete`)
    await page.waitForTimeout(35)
  }
  await page.screenshot({ path: path.join(frameDir, `${label}-bird-settled.png`) })

  const idleSamples = []
  const idleUntil = Date.now() + (withAudio ? 16_000 : 3_500)
  while (Date.now() < idleUntil) {
    idleSamples.push(await page.locator('.scene-host').evaluate((element) => ({ atMs: Math.round(performance.now()), ...element.dataset })))
    await page.waitForTimeout(200)
  }

  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  for (let reaction = 1; reaction <= 3; reaction += 1) {
    await bird.click()
    await page.waitForFunction((count) => document.querySelector('.scene-host')?.getAttribute('data-bird-reaction-count') === String(count), reaction)
    if (reaction === 3) {
      await page.waitForFunction(() => Number(document.querySelector('.scene-host')?.getAttribute('data-bird-turn-degrees') ?? 0) >= 180)
      await page.screenshot({ path: path.join(frameDir, `${label}-bird-full-turn.png`) })
    }
    await page.waitForFunction(() => document.querySelector('.scene-host')?.getAttribute('data-bird-reaction') === 'none')
  }

  await page.waitForSelector('[data-handoff-state="armed"]')
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 })))
  await page.waitForSelector('[data-handoff-state="covering"]')
  for (const deltaY of [80, -70, 120, -90, 140]) {
    await page.evaluate((delta) => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: delta })), deltaY)
    await page.evaluate(() => document.querySelector('.music-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await page.waitForTimeout(120)
  }
  await page.waitForSelector('.video-handoff[data-cover-hold="visible"]', { timeout: 6000 })
  await page.screenshot({ path: path.join(frameDir, `${label}-leaf-cover.png`) })
  await page.waitForSelector('[data-handoff-state="complete"]', { timeout: 8000 })

  const sounds = await page.evaluate(() => window.__reviewSounds)
  const handoff = await page.evaluate(() => window.__reviewHandoff)
  const scene = await page.locator('.scene-host').evaluate((element) => ({ ...element.dataset }))
  let rawAudio
  if (withAudio) {
    const dataURL = await page.evaluate(() => new Promise((resolve, reject) => {
      const recorder = window.__performanceRecorder
      const chunks = window.__performanceChunks
      if (!recorder || !chunks) return reject(new Error('Audio recording state missing'))
      recorder.addEventListener('stop', () => {
        const reader = new FileReader()
        reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
        reader.readAsDataURL(new Blob(chunks, { type: 'audio/webm;codecs=opus' }))
      }, { once: true })
      recorder.stop()
    }))
    rawAudio = path.join(rawDir, `${label}-audio.webm`)
    await fs.writeFile(rawAudio, Buffer.from(String(dataURL).split(',')[1], 'base64'))
  }

  const recordedVideo = page.video()
  await context.close()
  if (!recordedVideo) throw new Error(`Visual recording unavailable for ${label}`)
  const rawVideo = await recordedVideo.path()
  const output = path.join(motionDir, `${label}-normal-speed${withAudio ? '-actual-browser-audio' : ''}.webm`)
  if (withAudio && rawAudio) {
    const audioOffset = Math.max(0, (audioStartedAt - videoStartedAt) / 1000)
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawVideo, '-itsoffset', audioOffset.toFixed(3), '-i', rawAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', output])
  } else {
    await fs.copyFile(rawVideo, output)
  }
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-show_entries', 'format=duration,size', '-of', 'json', output])
  report.runs.push({ label, viewport, withAudio, entrySamples, idleSamples, sounds, handoff, scene, recording: path.relative(evidenceDir, output), probe: JSON.parse(stdout) })
}

async function captureAnimalTransition() {
  const label = 'desktop-animal-transition'
  const viewport = { width: 1440, height: 900 }
  const context = await browser.newContext({ viewport, recordVideo: { dir: rawDir, size: viewport } })
  const page = await context.newPage()
  observe(page, label)
  await page.addInitScript(() => {
    window.__reviewHandoff = []
    addEventListener('farmstandhandofftrace', (event) => window.__reviewHandoff.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  await page.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
  const origin = { hash: await page.evaluate(() => location.hash), scrollY: await page.evaluate(() => scrollY) }
  await page.locator('.entrance-links [data-animal-sound="hens"]').click()
  await page.waitForSelector('[data-handoff-state="covering"]')
  await page.waitForSelector('[data-handoff-state="covered"]', { timeout: 5000 })
  await page.waitForSelector('.video-handoff[data-cover-hold="visible"]', { timeout: 5000 })
  const covered = {
    hash: await page.evaluate(() => location.hash),
    scrollY: await page.evaluate(() => scrollY),
    mediaTime: Number(await page.locator('.video-handoff').getAttribute('data-media-time')),
    coverTime: Number(await page.locator('.video-handoff').getAttribute('data-cover-time')),
  }
  await page.screenshot({ path: path.join(frameDir, `${label}-leaf-cover.png`) })
  await page.waitForSelector('[data-handoff-state="idle"]', { timeout: 6000 })
  const final = { hash: await page.evaluate(() => location.hash), scrollY: await page.evaluate(() => scrollY), focusedId: await page.evaluate(() => document.activeElement?.id) }
  const handoff = await page.evaluate(() => window.__reviewHandoff)
  const recordedVideo = page.video()
  await context.close()
  if (!recordedVideo) throw new Error('Animal transition recording unavailable')
  const output = path.join(motionDir, `${label}-normal-speed.webm`)
  await fs.copyFile(await recordedVideo.path(), output)
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-show_entries', 'format=duration,size', '-of', 'json', output])
  report.runs.push({ label, viewport, withAudio: false, origin, covered, final, handoff, recording: path.relative(evidenceDir, output), probe: JSON.parse(stdout) })
}

function routeDiagram(run) {
  const samples = run.entrySamples.filter((sample) => Number.isFinite(Number(sample.birdX)) && Number.isFinite(Number(sample.birdZ)))
  const width = 1200
  const height = 640
  const pad = 70
  const xValues = samples.map((sample) => Number(sample.birdX))
  const zValues = samples.map((sample) => Number(sample.birdZ))
  const xMin = Math.min(...xValues) - .3
  const xMax = Math.max(...xValues) + .3
  const zMin = Math.min(...zValues) - .15
  const zMax = Math.max(...zValues) + .15
  const mapX = (value) => pad + (value - xMin) / (xMax - xMin) * (width - pad * 2)
  const mapZ = (value) => height / 2 - pad + (value - zMin) / (zMax - zMin) * (height / 2 - pad)
  const mapTimeX = (index) => pad + index / Math.max(1, samples.length - 1) * (width - pad * 2)
  const mapY = (value) => height - pad - value / .35 * (height / 2 - pad)
  const topPoints = samples.map((sample) => `${mapX(Number(sample.birdX)).toFixed(1)},${mapZ(Number(sample.birdZ)).toFixed(1)}`).join(' ')
  const sidePoints = samples.map((sample, index) => `${mapTimeX(index).toFixed(1)},${mapY(Math.max(0, Number(sample.birdFootY) - Number(sample.birdSupportY))).toFixed(1)}`).join(' ')
  const planted = samples.filter((sample) => sample.birdPlanted === 'true').map((sample) => `<circle cx="${mapX(Number(sample.birdX)).toFixed(1)}" cy="${mapZ(Number(sample.birdZ)).toFixed(1)}" r="4" fill="#687526"/>`).join('')
  // The scene sweeps the complete authored route every frame. Use those
  // cumulative diagnostics here so a collision between capture samples cannot
  // be hidden by an otherwise clean-looking evidence diagram.
  const minClearance = Number(run.scene.birdClearanceSweepMin)
  const minAppleClearance = Number(run.scene.birdAppleSweepMin)
  const minSupport = Number(run.scene.birdPlantedSupportSweepMin)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f3efdf"/><g font-family="sans-serif" fill="#173c32"><text x="${pad}" y="38" font-size="24" font-weight="700">${run.label}: measured bird route</text><text x="${pad}" y="66" font-size="15">Top view: root path; green points are planted. Minimum structure ${minClearance.toFixed(4)}, apple ${minAppleClearance.toFixed(4)} scene units.</text><polyline points="${topPoints}" fill="none" stroke="#cf6c2d" stroke-width="5" stroke-linecap="round"/>${planted}<line x1="${pad}" x2="${width - pad}" y1="${height / 2}" y2="${height / 2}" stroke="#a99b7d"/><text x="${pad}" y="${height / 2 + 35}" font-size="18" font-weight="700">Side contact over time</text><text x="${pad}" y="${height / 2 + 58}" font-size="14">Named foot height above counter; minimum planted support margin ${minSupport.toFixed(4)} scene units.</text><line x1="${pad}" x2="${width - pad}" y1="${height - pad}" y2="${height - pad}" stroke="#687526" stroke-width="2"/><polyline points="${sidePoints}" fill="none" stroke="#cf6c2d" stroke-width="4"/></g></svg>`
}

await capture('desktop', { width: 1440, height: 900 }, true)
await capture('portrait', { width: 390, height: 844 }, false)
await captureAnimalTransition()
await browser.close()
for (const run of report.runs.filter((candidate) => candidate.entrySamples)) {
  await fs.writeFile(path.join(frameDir, `${run.label}-bird-route-top-side.svg`), routeDiagram(run))
}
await fs.copyFile('/home/mani/Downloads/desktop-0-66.png', path.join(frameDir, 'reviewed-before-desktop-0-66.png'))
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.errors.length) process.exitCode = 1
