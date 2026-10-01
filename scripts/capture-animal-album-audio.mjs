import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const reviewDir = path.resolve('evidence/animal-album/review')
await fs.mkdir(reviewDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await context.addInitScript(() => {
  sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
  window.__albumSoundEvents = []
  window.addEventListener('farmstandsound', (event) => window.__albumSoundEvents.push({ at: performance.now(), ...event.detail }))
})
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
page.on('pageerror', (error) => pageErrors.push(error.message))

await page.goto(`${baseURL}?recordSound=1#hens`, { waitUntil: 'networkidle' })
await page.mouse.click(8, 320)
await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), undefined, { timeout: 8000 })
await page.waitForFunction(() => Boolean(window.__farmStandAudioStream))
await page.evaluate(() => {
  const recorder = new MediaRecorder(window.__farmStandAudioStream, { mimeType: 'audio/webm;codecs=opus' })
  const chunks = []
  recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
  recorder.start(150)
  window.__albumAudioRecorder = { recorder, chunks, startedAt: performance.now(), markers: [] }
})

async function cue(id, label) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await page.evaluate((name) => window.__albumAudioRecorder.markers.push({ name, at: performance.now() }), id)
  const button = page.locator(`#${id}`).getByRole('button', { name: label })
  await button.click()
  await button.click()
  await page.waitForTimeout(1900)
}

await cue('hens', 'Hear a cluck')
await cue('cattle', 'Hear the cattle')
await cue('sheep', 'Hear a bleat')

const captured = await page.evaluate(async () => {
  const state = window.__albumAudioRecorder
  const stopped = new Promise((resolve) => state.recorder.addEventListener('stop', resolve, { once: true }))
  state.recorder.stop()
  await stopped
  const bytes = new Uint8Array(await new Blob(state.chunks, { type: state.recorder.mimeType }).arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return { base64: btoa(binary), startedAt: state.startedAt, markers: state.markers, events: window.__albumSoundEvents }
})
const audioPath = path.join(reviewDir, 'animal-album-explicit-cues-same-run.webm')
await fs.writeFile(audioPath, Buffer.from(captured.base64, 'base64'))
const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,sample_rate,channels', '-of', 'json', audioPath])
const relative = (at) => Math.round(at - captured.startedAt)
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browserAudio: true,
  postProductionAudio: false,
  method: 'The file is the application Web Audio master recorded in Chromium during the same visible album interactions. No replacement or post-production sound was added.',
  markers: captured.markers.map((marker) => ({ ...marker, elapsedMs: relative(marker.at) })),
  starts: captured.events.map((event) => ({ ...event, elapsedMs: relative(event.at) })),
  cueCounts: Object.fromEntries(['hens', 'cattle', 'sheep'].map((name) => [name, captured.events.filter((event) => event.name === name).length])),
  ffprobe: JSON.parse(probe.stdout),
  consoleErrors,
  pageErrors,
}
await fs.writeFile(path.join(reviewDir, 'audio-capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)
await context.close()
await browser.close()
if (consoleErrors.length || pageErrors.length || Object.values(report.cueCounts).some((count) => count !== 1)) process.exitCode = 1
