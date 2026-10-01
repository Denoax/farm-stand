import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/meadow-envelope/final')
const rawDir = path.join(evidenceDir, 'capture-raw')
await fs.mkdir(rawDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  captures: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  loopWraps: [],
}

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText ?? ''
    if (!error.includes('ERR_ABORTED')) report.requestFailures.push({ label, url: request.url(), error })
  })
}

async function duration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=duration:format=duration', '-of', 'csv=p=0', file])
  const value = stdout.split(/[\s,]+/).filter(Boolean).map(Number).find(Number.isFinite)
  if (value === undefined) throw new Error(`Could not read duration: ${file}`)
  return value
}

async function captureStillSet(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, label)
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  const albumName = `${label}-album.png`
  await page.locator('#farm-life').screenshot({ path: path.join(evidenceDir, albumName) })
  report.captures.push(albumName)

  await page.evaluate(() => history.replaceState(null, '', location.pathname))
  await page.locator('#visit').scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  const closedName = `${label}-envelope-closed.png`
  await page.locator('#visit').screenshot({ path: path.join(evidenceDir, closedName) })
  report.captures.push(closedName)
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.waitForTimeout(40)
  await page.evaluate(() => document.getAnimations().forEach((animation) => { animation.pause(); animation.currentTime = 240 }))
  const hingeName = `${label}-envelope-mid-hinge.png`
  await page.locator('#visit').screenshot({ path: path.join(evidenceDir, hingeName), animations: 'allow' })
  report.captures.push(hingeName)
  await page.evaluate(() => document.getAnimations().forEach((animation) => { animation.currentTime = 800 }))
  const extractionName = `${label}-envelope-mid-extraction.png`
  await page.locator('#visit').screenshot({ path: path.join(evidenceDir, extractionName), animations: 'allow' })
  report.captures.push(extractionName)
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()))
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor()
  const openName = `${label}-envelope-open.png`
  await page.locator('#visit').screenshot({ path: path.join(evidenceDir, openName) })
  report.captures.push(openName)

  const websiteName = `${label}-website-sign.png`
  await page.locator('#website').screenshot({ path: path.join(evidenceDir, websiteName) })
  report.captures.push(websiteName)
  await context.close()
}

async function scrollToward(page, selector) {
  const target = await page.locator(selector).evaluate((element) => Math.min(
    element.getBoundingClientRect().top + scrollY - 90,
    document.documentElement.scrollHeight - innerHeight,
  ))
  let steps = 0
  while (await page.evaluate(() => scrollY) < target - 20 && steps < 80) {
    await page.mouse.wheel(0, 330)
    await page.waitForTimeout(180)
    steps += 1
  }
  await page.waitForTimeout(300)
}

async function recordDesktopJourney() {
  const viewport = { width: 1440, height: 900 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: viewport } })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
    window.__meadowSounds = []
    addEventListener('farmstandsound', (event) => window.__meadowSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  const page = await context.newPage()
  observe(page, 'desktop-journey')
  await page.goto(`${baseURL}?recordSound=1#farm-life`, { waitUntil: 'networkidle' })
  await page.mouse.click(12, 320)
  await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
  await page.waitForFunction(() => Boolean(window.__farmStandAudioStream), null, { timeout: 8000 })
  await page.evaluate(() => {
    const recorder = new MediaRecorder(window.__farmStandAudioStream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
    window.__meadowRecorder = { recorder, chunks }
    recorder.start(100)
  })

  await page.waitForTimeout(900)
  await scrollToward(page, '#cattle')
  await scrollToward(page, '#sheep')
  await page.getByRole('button', { name: 'Pause animal films' }).click()
  await page.waitForTimeout(550)
  await page.getByRole('button', { name: 'Play animal films' }).click()
  await page.waitForTimeout(800)
  await page.evaluate(() => history.replaceState(null, '', location.pathname + location.search))
  await scrollToward(page, '#visit')
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor()
  await page.waitForTimeout(700)
  await scrollToward(page, '#website')
  await page.getByText('Try changing the hours', { exact: true }).click()
  await page.getByLabel('Opens').fill('10:30')
  await page.getByLabel('Closes').fill('12:30')
  await page.waitForTimeout(900)

  const audioDataURL = await page.evaluate(() => new Promise((resolve, reject) => {
    const state = window.__meadowRecorder
    if (!state) return reject(new Error('Audio recorder state missing'))
    state.recorder.addEventListener('stop', () => {
      const reader = new FileReader()
      reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
      reader.addEventListener('error', () => reject(reader.error), { once: true })
      reader.readAsDataURL(new Blob(state.chunks, { type: 'audio/webm;codecs=opus' }))
    }, { once: true })
    state.recorder.stop()
  }))
  const sounds = await page.evaluate(() => window.__meadowSounds ?? [])
  const rawAudioPath = path.join(rawDir, 'meadow-envelope-browser-audio-raw.webm')
  const audioPath = path.join(rawDir, 'meadow-envelope-browser-audio.webm')
  await fs.writeFile(rawAudioPath, Buffer.from(String(audioDataURL).split(',')[1], 'base64'))
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawAudioPath, '-c:a', 'copy', audioPath])
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Desktop recording unavailable')
  const rawVideo = await video.path()
  const videoDuration = await duration(rawVideo)
  const audioDuration = await duration(audioPath)
  const offset = Math.max(0, videoDuration - audioDuration)
  const output = path.join(evidenceDir, 'desktop-1440x900-normal-speed-actual-browser-audio.webm')
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', offset.toFixed(3), '-i', rawVideo, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', '-shortest', output])
  report.captures.push(path.basename(output))
  report.audioJourney = {
    method: 'The application Web Audio master was recorded in the same Chromium interaction run. FFmpeg only muxed that browser track with the Playwright video; no sound was added or replaced.',
    sounds,
    videoDuration,
    audioDuration,
    offset,
  }
}

async function recordPortraitJourney() {
  const viewport = { width: 390, height: 844 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: viewport } })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, 'portrait-journey')
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  for (const selector of ['#hens', '#cattle', '#sheep']) await scrollToward(page, selector)
  await page.evaluate(() => history.replaceState(null, '', location.pathname))
  await scrollToward(page, '#visit')
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor()
  await scrollToward(page, '#website')
  await page.waitForTimeout(700)
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Portrait recording unavailable')
  const output = path.join(evidenceDir, 'portrait-390x844-normal-speed.webm')
  await fs.rm(output, { force: true })
  await fs.rename(await video.path(), output)
  report.captures.push(path.basename(output))
}

async function verifyLoopWraps() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, 'loop-wraps')
  for (const id of ['hens', 'cattle', 'sheep']) {
    await page.goto(`${baseURL}#${id}`, { waitUntil: 'networkidle' })
    const entry = page.locator(`#${id}`)
    const video = entry.locator('video')
    await page.waitForFunction((selector) => !document.querySelector(selector).paused, `#${id} video`)
    const source = await video.getAttribute('src')
    for (let expected = 1; expected <= 2; expected += 1) {
      await video.evaluate((element) => { element.currentTime = Math.max(0, element.duration - .12) })
      await page.waitForFunction(([selector, count]) => document.querySelector(selector)?.dataset.loopCount === String(count), [`#${id}`, expected])
    }
    report.loopWraps.push({ id, source, wraps: Number(await entry.getAttribute('data-loop-count')), playbackRate: await video.evaluate((element) => element.playbackRate), paused: await video.evaluate((element) => element.paused) })
  }
  await context.close()
}

await captureStillSet('desktop-1440x900', { width: 1440, height: 900 })
await captureStillSet('portrait-390x844', { width: 390, height: 844 })
await captureStillSet('wide-1920x900', { width: 1920, height: 900 })
await verifyLoopWraps()
await recordDesktopJourney()
await recordPortraitJourney()
await browser.close()
await fs.rm(rawDir, { recursive: true, force: true })
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)

if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length || report.loopWraps.some(({ wraps, playbackRate, paused }) => wraps < 2 || playbackRate !== 1 || paused)) process.exitCode = 1
