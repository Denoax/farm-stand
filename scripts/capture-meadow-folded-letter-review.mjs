import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/meadow-folded-letter/final')
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
  exactMeadowInput: {
    archiveLocated: false,
    originalLocated: false,
    expectedOriginal: 'reference/meadow-original.png',
    expectedSha256: '2630f13f43f54857f5fdcf9a053dba46c9b82eeeddb12d38c39904ec0c172baa',
    deliveryStatus: 'incomplete',
  },
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

async function createPage(viewport, label, recordVideo) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(recordVideo ? { recordVideo: { dir: rawDir, size: viewport } } : {}),
  })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, label)
  return { context, page }
}

async function armPhaseCapture(page, target) {
  await page.evaluate((phase) => {
    document.body.removeAttribute('data-fold-capture')
    window.__foldCaptureTarget = phase
  }, target)
}

async function waitForPausedPhase(page, target, halfProgress = false) {
  await page.locator(`body[data-fold-capture="${target}"]`).waitFor({ timeout: 5000 })
  if (halfProgress) {
    await page.evaluate(() => {
      document.getAnimations().forEach((animation) => {
        const duration = Number(animation.effect?.getTiming().duration)
        if (Number.isFinite(duration)) animation.currentTime = duration * .5
      })
    })
  }
}

async function resumeToward(page, target) {
  await armPhaseCapture(page, target)
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()))
  await waitForPausedPhase(page, target)
}

async function captureFoldSet(label, viewport) {
  const { context, page } = await createPage(viewport, label)
  await page.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
  await page.locator('#visit').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  const visit = page.locator('#visit')
  const save = async (suffix) => {
    const name = `${label}-${suffix}.png`
    await visit.screenshot({ path: path.join(evidenceDir, name), animations: 'allow' })
    report.captures.push(name)
  }
  await save('closed')
  await page.evaluate(() => {
    window.__foldCaptureTarget = 'opening-extract'
    new MutationObserver(() => {
      const phase = document.querySelector('.visiting-envelope')?.getAttribute('data-phase')
      if (phase !== window.__foldCaptureTarget) return
      requestAnimationFrame(() => {
        document.getAnimations().forEach((animation) => animation.pause())
        document.body.dataset.foldCapture = phase
      })
    }).observe(document.querySelector('.visiting-envelope'), { attributes: true, attributeFilter: ['data-phase'] })
  })
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await waitForPausedPhase(page, 'opening-extract')
  await save('flap-open')
  await resumeToward(page, 'opening-hold')
  await save('extracted-still-folded')
  await resumeToward(page, 'opening-upper')
  await page.evaluate(() => {
    document.getAnimations().forEach((animation) => {
      const duration = Number(animation.effect?.getTiming().duration)
      if (Number.isFinite(duration)) animation.currentTime = duration * .5
    })
  })
  await save('upper-hinge')
  await resumeToward(page, 'opening-lower')
  await page.evaluate(() => {
    document.getAnimations().forEach((animation) => {
      const duration = Number(animation.effect?.getTiming().duration)
      if (Number.isFinite(duration)) animation.currentTime = duration * .5
    })
  })
  await save('lower-hinge')
  await resumeToward(page, 'open')
  await save('open')

  const geometry = await page.locator('.visiting-envelope__stage').evaluate((stage) => {
    const rect = (selector) => {
      const bounds = stage.querySelector(selector).getBoundingClientRect()
      return { width: Math.round(bounds.width), height: Math.round(bounds.height) }
    }
    return {
      panelHeight: getComputedStyle(stage).getPropertyValue('--letter-panel-height').trim(),
      packet: rect('.visiting-letter'),
      envelope: rect('.visiting-envelope__shell'),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  report[`${label}Geometry`] = geometry
  await context.close()
}

async function captureAlbum(label, viewport) {
  const { context, page } = await createPage(viewport, `${label}-album`)
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  const name = `${label}-album.png`
  await page.locator('#farm-life').screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
  await context.close()
}

async function scrollToward(page, selector) {
  const target = await page.locator(selector).evaluate((element) => Math.min(
    element.getBoundingClientRect().top + scrollY - 90,
    document.documentElement.scrollHeight - innerHeight,
  ))
  let steps = 0
  while (await page.evaluate(() => scrollY) < target - 20 && steps < 90) {
    await page.mouse.wheel(0, 330)
    await page.waitForTimeout(150)
    steps += 1
  }
  await page.waitForTimeout(250)
}

async function recordDesktopJourney() {
  const viewport = { width: 1440, height: 900 }
  const { context, page } = await createPage(viewport, 'desktop-journey', true)
  await context.addInitScript(() => {
    window.__foldedLetterSounds = []
    addEventListener('farmstandsound', (event) => window.__foldedLetterSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  await page.goto(`${baseURL}?recordSound=1#farm-life`, { waitUntil: 'networkidle' })
  await page.mouse.click(12, 320)
  await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
  await page.waitForFunction(() => Boolean(window.__farmStandAudioStream), null, { timeout: 8000 })
  await page.evaluate(() => {
    const recorder = new MediaRecorder(window.__farmStandAudioStream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
    window.__foldedLetterRecorder = { recorder, chunks }
    recorder.start(100)
  })

  await page.waitForTimeout(650)
  await scrollToward(page, '#sheep')
  const sheepFilm = page.locator('#sheep .farm-album__film')
  await sheepFilm.press('Space')
  await page.waitForTimeout(450)
  await sheepFilm.press('Enter')
  await page.waitForTimeout(650)
  await page.evaluate(() => history.replaceState(null, '', location.pathname + location.search))
  await scrollToward(page, '#visit')
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Fold visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="closed"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(650)

  const audioDataURL = await page.evaluate(() => new Promise((resolve, reject) => {
    const state = window.__foldedLetterRecorder
    if (!state) return reject(new Error('Audio recorder state missing'))
    state.recorder.addEventListener('stop', () => {
      const reader = new FileReader()
      reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
      reader.addEventListener('error', () => reject(reader.error), { once: true })
      reader.readAsDataURL(new Blob(state.chunks, { type: 'audio/webm;codecs=opus' }))
    }, { once: true })
    state.recorder.stop()
  }))
  const sounds = await page.evaluate(() => window.__foldedLetterSounds ?? [])
  const rawAudioPath = path.join(rawDir, 'folded-letter-browser-audio-raw.webm')
  const audioPath = path.join(rawDir, 'folded-letter-browser-audio.webm')
  await fs.writeFile(rawAudioPath, Buffer.from(String(audioDataURL).split(',')[1], 'base64'))
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawAudioPath, '-c:a', 'copy', audioPath])
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Desktop recording unavailable')
  const rawVideo = await video.path()
  const videoDuration = await duration(rawVideo)
  const audioDuration = await duration(audioPath)
  const offset = Math.max(0, videoDuration - audioDuration)
  const output = path.join(evidenceDir, 'desktop-1440x900-normal-speed-open-close-actual-browser-audio.webm')
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
  const { context, page } = await createPage(viewport, 'portrait-journey', true)
  await page.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
  await scrollToward(page, '#visit')
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: 'Fold visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="closed"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: 'Open visiting letter' }).click()
  await page.locator('.visiting-envelope[data-phase="open"]').waitFor({ timeout: 5000 })
  await page.waitForTimeout(650)
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Portrait recording unavailable')
  const output = path.join(evidenceDir, 'portrait-390x844-normal-speed-open-close.webm')
  await fs.rm(output, { force: true })
  await fs.rename(await video.path(), output)
  report.captures.push(path.basename(output))
}

async function verifyLoopWraps() {
  const { context, page } = await createPage({ width: 1280, height: 720 }, 'loop-wraps')
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
    report.loopWraps.push({
      id,
      source,
      wraps: Number(await entry.getAttribute('data-loop-count')),
      playbackRate: await video.evaluate((element) => element.playbackRate),
      paused: await video.evaluate((element) => element.paused),
      stableNode: await video.evaluate((element, animalId) => element === document.querySelector(`#${animalId} video`), id),
    })
  }
  await context.close()
}

await captureFoldSet('desktop-1440x900', { width: 1440, height: 900 })
await captureFoldSet('portrait-390x844', { width: 390, height: 844 })
await captureFoldSet('narrow-320x740', { width: 320, height: 740 })
await captureAlbum('desktop-1440x900', { width: 1440, height: 900 })
await captureAlbum('wide-1920x900', { width: 1920, height: 900 })
await captureAlbum('ultrawide-2560x1080', { width: 2560, height: 1080 })
await verifyLoopWraps()
await recordDesktopJourney()
await recordPortraitJourney()
await browser.close()
await fs.rm(rawDir, { recursive: true, force: true })
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)

if (
  report.consoleErrors.length
  || report.pageErrors.length
  || report.requestFailures.length
  || report.loopWraps.some(({ wraps, playbackRate, paused, stableNode }) => wraps < 2 || playbackRate !== 1 || paused || !stableNode)
) process.exitCode = 1
