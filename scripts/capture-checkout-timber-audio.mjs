import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/checkout-timber/review')
await fs.mkdir(evidenceDir, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => {
  sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
  window.__mixEvidence = { starts: [], stops: [] }
  window.addEventListener('farmstandsound', (event) => window.__mixEvidence.starts.push({ at: performance.now(), ...event.detail }))
  window.addEventListener('farmstandsoundstop', (event) => window.__mixEvidence.stops.push({ at: performance.now(), ...event.detail }))
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', (error) => errors.push(error.message))
await page.goto(`${baseURL}?recordSound=1`, { waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready')
await page.waitForTimeout(650)
const music = page.locator('.music-toggle')
if (await music.getAttribute('data-music-state') !== 'playing') await music.click()
await page.waitForFunction(() => document.querySelector('.music-toggle')?.getAttribute('data-music-state') === 'playing')
await page.waitForFunction(() => Boolean(window.__farmStandAudioStream))
await page.evaluate(() => {
  const stream = window.__farmStandAudioStream
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  const chunks = []
  recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
  recorder.start(250)
  window.__reviewRecorder = { recorder, chunks, startedAt: performance.now(), markers: [{ name: 'music-bed', at: performance.now() }] }
})

async function mark(name) {
  await page.evaluate((value) => window.__reviewRecorder.markers.push({ name: value, at: performance.now() }), name)
}

async function animal(kind, bed) {
  await mark(`${kind}-${bed}`)
  await page.evaluate((value) => {
    // Exercise the delegated semantic sound path without also requesting the
    // entrance Polaroid's leaf navigation transition.
    const target = document.createElement('button')
    target.dataset.animalSound = value
    document.body.append(target)
    target.click()
    target.remove()
  }, kind)
  await page.waitForTimeout(1900)
}

await page.waitForTimeout(1400)
await animal('hens', 'over-music')
await animal('cattle', 'over-music')
await animal('sheep', 'over-music')
await mark('bird-over-music')
await page.getByRole('button', { name: 'Hear the bird chirp' }).click()
await page.waitForTimeout(2100)
await mark('music-muted')
await music.click()
await page.waitForFunction(() => document.querySelector('.music-toggle')?.getAttribute('data-music-state') === 'muted')
await page.waitForTimeout(900)
await animal('hens', 'without-music')
await animal('cattle', 'without-music')
await animal('sheep', 'without-music')
await mark('bird-without-music')
await page.getByRole('button', { name: 'Hear the bird chirp' }).click()
await page.waitForTimeout(2200)

const captured = await page.evaluate(async () => {
  const state = window.__reviewRecorder
  const stopped = new Promise((resolve) => state.recorder.addEventListener('stop', resolve, { once: true }))
  state.recorder.stop()
  await stopped
  const blob = new Blob(state.chunks, { type: state.recorder.mimeType })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return { base64: btoa(binary), mimeType: blob.type, startedAt: state.startedAt, markers: state.markers, events: window.__mixEvidence }
})
const audioPath = path.join(evidenceDir, 'animal-bird-mix-same-run.webm')
await fs.writeFile(audioPath, Buffer.from(captured.base64, 'base64'))
const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,sample_rate,channels', '-of', 'json', audioPath])
let loudness = ''
try {
  const analysis = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', audioPath, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'])
  loudness = analysis.stderr
} catch (error) {
  loudness = error.stderr ?? ''
}
const relative = (at) => Math.round(at - captured.startedAt)
const report = {
  capturedAt: new Date().toISOString(),
  browserAudio: true,
  postProductionAudio: false,
  errors,
  markers: captured.markers.map((marker) => ({ ...marker, elapsedMs: relative(marker.at) })),
  starts: captured.events.starts.map((event) => ({ ...event, elapsedMs: relative(event.at) })),
  stops: captured.events.stops.map((event) => ({ ...event, elapsedMs: relative(event.at) })),
  ffprobe: JSON.parse(probe.stdout),
  graph: { master: 0.82, music: 0.061, effects: 0.62, bird: 0.075, hens: 0.15, cattle: 0.039, sheep: 0.058, animalMusicDucking: false },
}
await fs.writeFile(path.join(evidenceDir, 'audio-mix-evidence.json'), JSON.stringify(report, null, 2))
await fs.writeFile(path.join(evidenceDir, 'audio-ebur128.txt'), loudness)
await context.close()
await browser.close()
if (errors.length) process.exitCode = 1
