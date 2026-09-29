import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve(process.env.EVIDENCE_ROOT ?? 'evidence/video-bird/review/audio')
const rawDir = path.join(evidenceDir, 'raw')
await fs.mkdir(rawDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } } })
const page = await context.newPage()
const errors = []
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('requestfailed', (request) => errors.push(`request: ${request.url()} :: ${request.failure()?.errorText}`))
await page.addInitScript(() => {
  window.__capturedSounds = []
  addEventListener('farmstandsound', (event) => window.__capturedSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
})

await page.goto(`${baseURL}?recordSound=1#shop`, { waitUntil: 'networkidle' })
await page.mouse.click(8, 320)
await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
if (await page.locator('.music-toggle').getAttribute('data-music-state') !== 'muted') await page.locator('.music-toggle').click()
await page.waitForFunction(() => document.querySelector('.music-toggle')?.getAttribute('data-music-state') === 'muted')

await page.evaluate(() => {
  const stream = window.__farmStandAudioStream
  if (!stream) throw new Error('Web Audio capture stream unavailable')
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  const chunks = []
  recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
  window.__soundPoolRecorder = recorder
  window.__soundPoolChunks = chunks
  recorder.start(100)
})

const apple = page.locator('#product-apple')
for (let index = 0; index < 3; index += 1) {
  await apple.getByRole('button', { name: 'View details' }).click()
  await page.waitForTimeout(320)
  await page.getByRole('dialog', { name: /Orchard apples/ }).getByRole('button', { name: 'Close product details' }).click()
  await page.waitForTimeout(320)
}
await apple.getByRole('button', { name: 'Add to basket' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Open basket preview, 1 items/ }).click()
await page.waitForTimeout(350)
await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
const drawer = page.getByRole('dialog', { name: /Your basket/ })
const increase = drawer.getByRole('button', { name: 'Increase Orchard apples quantity' })
for (let index = 0; index < 6; index += 1) {
  await increase.click()
  await page.waitForTimeout(130)
}
await page.waitForTimeout(500)
await drawer.getByRole('button', { name: 'Close basket' }).click()
await page.waitForTimeout(500)

const audioDataURL = await page.evaluate(() => new Promise((resolve, reject) => {
  const recorder = window.__soundPoolRecorder
  const chunks = window.__soundPoolChunks
  if (!recorder || !chunks) return reject(new Error('Audio recording state missing'))
  recorder.addEventListener('stop', () => {
    const reader = new FileReader()
    reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
    reader.readAsDataURL(new Blob(chunks, { type: 'audio/webm;codecs=opus' }))
  }, { once: true })
  recorder.stop()
}))
const heard = await page.evaluate(() => window.__capturedSounds ?? [])
const rawAudio = path.join(rawDir, 'browser-master.webm')
await fs.writeFile(rawAudio, Buffer.from(String(audioDataURL).split(',')[1], 'base64'))
const video = page.video()
await context.close()
if (!video) throw new Error('Visual recording unavailable')
const rawVideo = await video.path()
const output = path.join(evidenceDir, 'sound-pool-actual-browser-audio.webm')
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawVideo, '-i', rawAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', '-shortest', output])
const { stdout: streams } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name', '-show_entries', 'format=duration,size', '-of', 'json', output])
await fs.writeFile(path.join(evidenceDir, 'sound-pool-capture.json'), `${JSON.stringify({
  capturedAt: new Date().toISOString(), baseURL,
  method: 'The Opus track is the application Web Audio master recorded in the same Chromium interaction run. FFmpeg only muxed that track with Playwright video; no replacement or post-production sound was added.',
  heard, streams: JSON.parse(streams), errors,
}, null, 2)}\n`)
await browser.close()
if (errors.length) process.exitCode = 1
