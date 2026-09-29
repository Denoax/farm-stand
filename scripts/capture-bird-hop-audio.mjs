import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve(process.env.EVIDENCE_ROOT ?? 'evidence/bird-hop/review')
const motionDir = path.join(evidenceDir, 'motion')
const rawDir = path.join(motionDir, 'raw')
await fs.mkdir(rawDir, { recursive: true })

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, runs: [], errors: [] }

async function capture(label, viewport, withAudio) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: rawDir, size: viewport } })
  const page = await context.newPage()
  const videoStartedAt = Date.now()
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`${label} console: ${message.text()}`) })
  page.on('pageerror', (error) => report.errors.push(`${label} page: ${error.message}`))
  await page.addInitScript(() => {
    window.__capturedSounds = []
    addEventListener('farmstandsound', (event) => window.__capturedSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  await page.goto(`${baseURL}?recordSound=1`, { waitUntil: 'networkidle' })
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
      window.__birdReviewRecorder = recorder
      window.__birdReviewChunks = chunks
      recorder.start(100)
    })
  }
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await page.waitForSelector('[data-opening-state="open"]', { timeout: 12000 })
  await page.getByRole('button', { name: 'Hear the bird chirp' }).click()
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'Hear the bird chirp' }).focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(900)
  if (withAudio) {
    await page.getByRole('link', { name: 'Explore the demo' }).click()
    await page.waitForSelector('[data-handoff-state="complete"]', { timeout: 9000 })
  }
  const sounds = await page.evaluate(() => window.__capturedSounds ?? [])
  let rawAudio
  if (withAudio) {
    const dataURL = await page.evaluate(() => new Promise((resolve, reject) => {
      const recorder = window.__birdReviewRecorder
      const chunks = window.__birdReviewChunks
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
  const video = page.video()
  const scene = await page.locator('.scene-host').evaluate((element) => ({ ...element.dataset }))
  await context.close()
  if (!video) throw new Error(`Visual recording unavailable for ${label}`)
  const rawVideo = await video.path()
  const output = path.join(motionDir, `${label}-normal-speed${withAudio ? '-actual-browser-audio' : ''}.webm`)
  if (withAudio && rawAudio) {
    const audioOffsetSeconds = Math.max(0, (audioStartedAt - videoStartedAt) / 1000)
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawVideo, '-itsoffset', audioOffsetSeconds.toFixed(3), '-i', rawAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', output])
  } else {
    await fs.copyFile(rawVideo, output)
  }
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-show_entries', 'format=duration,size', '-of', 'json', output])
  report.runs.push({ label, viewport, withAudio, audioOffsetSeconds: withAudio ? (audioStartedAt - videoStartedAt) / 1000 : null, output: path.relative(evidenceDir, output), sounds, scene, probe: JSON.parse(stdout) })
}

await capture('desktop-opening-bird-leaves', { width: 1440, height: 900 }, true)
await capture('portrait-opening-bird', { width: 390, height: 844 }, false)
await browser.close()
await fs.writeFile(path.join(motionDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.errors.length) process.exitCode = 1
