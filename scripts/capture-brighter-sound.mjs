import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/brighter-stage/review')
const rawDir = path.join(evidenceDir, 'sound-capture-raw')
await fs.mkdir(rawDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } } })
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
const heard = []
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
page.on('pageerror', (error) => pageErrors.push(error.message))
await page.addInitScript(() => addEventListener('farmstandsound', (event) => { window.__capturedSounds = [...(window.__capturedSounds ?? []), event.detail] }))

await page.goto(`${baseURL}?recordSound=1`, { waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready')
await page.getByRole('button', { name: 'Play background music' }).click()
await page.waitForSelector('.sound-controls[data-sound-status="ready"]', { timeout: 8000 })
await page.getByRole('button', { name: 'Pause background music' }).waitFor()

await page.evaluate(async () => {
  const stream = window.__farmStandAudioStream
  if (!stream) throw new Error('The application Web Audio capture stream was not created.')
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  const chunks = []
  recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
  window.__farmStandAudioRecorder = recorder
  window.__farmStandAudioChunks = chunks
  recorder.start(100)
})

await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 10_000 })
await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 500 })))
await page.waitForSelector('[data-leaf-state="complete"]', { timeout: 3500 })
await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
await page.getByRole('button', { name: /Open basket preview, 1 items/ }).click()
await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
const drawer = page.getByRole('dialog', { name: /Your basket/ })
await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
await drawer.getByRole('button', { name: 'Remove' }).click()
await drawer.getByRole('button', { name: 'Close basket' }).click()
await page.getByRole('button', { name: 'Pause background music' }).click()
await page.waitForTimeout(450)

const audioDataURL = await page.evaluate(() => new Promise((resolve, reject) => {
  const recorder = window.__farmStandAudioRecorder
  const chunks = window.__farmStandAudioChunks
  if (!recorder || !chunks) return reject(new Error('Audio recorder state is missing.'))
  recorder.addEventListener('stop', () => {
    const reader = new FileReader()
    reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
    reader.addEventListener('error', () => reject(reader.error), { once: true })
    reader.readAsDataURL(new Blob(chunks, { type: 'audio/webm;codecs=opus' }))
  }, { once: true })
  recorder.stop()
}))
heard.push(...await page.evaluate(() => window.__capturedSounds ?? []))

const audioRawPath = path.join(rawDir, 'actual-browser-master-raw.webm')
const audioPath = path.join(rawDir, 'actual-browser-master.webm')
await fs.writeFile(audioRawPath, Buffer.from(String(audioDataURL).split(',')[1], 'base64'))
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', audioRawPath, '-c:a', 'copy', audioPath])
const rawVideo = page.video()
await context.close()
if (!rawVideo) throw new Error('Playwright did not create the visual recording.')
const videoPath = await rawVideo.path()

async function duration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file])
  return Number(stdout.trim())
}

const videoDuration = await duration(videoPath)
const audioDuration = await duration(audioPath)
const endAlignedOffset = Math.max(0, videoDuration - audioDuration)
const outputPath = path.join(evidenceDir, 'desktop-sound-on-actual-browser-audio.webm')
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', endAlignedOffset.toFixed(3), '-i', videoPath, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', '-shortest', outputPath])
const { stdout: streamReport } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,duration', '-show_entries', 'format=duration,size', '-of', 'json', outputPath])
await fs.writeFile(path.join(evidenceDir, 'sound-capture.json'), `${JSON.stringify({
  capturedAt: new Date().toISOString(), baseURL,
  method: 'The audio track is the application Web Audio master recorded in Chromium during this same interaction run. FFmpeg only restores timestamps and muxes that browser track with Playwright video; no replacement sound was added.',
  videoDuration, audioDuration, endAlignedOffset, output: path.basename(outputPath), heard, streams: JSON.parse(streamReport), consoleErrors, pageErrors,
}, null, 2)}\n`)
await browser.close()
if (consoleErrors.length || pageErrors.length) process.exitCode = 1
