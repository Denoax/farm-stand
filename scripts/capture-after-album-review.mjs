import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/after-album/review')
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
}

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText ?? ''
    if (!error.includes('ERR_ABORTED')) report.requestFailures.push({ label, url: request.url(), error })
  })
}

async function still(page, name, locator) {
  if (locator) await locator.screenshot({ path: path.join(evidenceDir, name) })
  else await page.screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
}

async function captureViewport(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, label)
  await page.goto(`${baseURL}#sheep`, { waitUntil: 'networkidle' })
  const seamY = await page.evaluate(() => Math.max(0, document.querySelector('#visit').getBoundingClientRect().top + scrollY - innerHeight * .72))
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), seamY)
  await page.waitForTimeout(250)
  await still(page, `${label}-sheep-to-visit.png`)

  for (const id of ['visit', 'website', 'contact']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await still(page, `${label}-${id}.png`, page.locator(`#${id}`))
  }

  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await still(page, `${label}-footer.png`, page.locator('.site-footer'))
  await context.close()
}

async function captureStates() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL).origin })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
  })
  const page = await context.newPage()
  observe(page, 'states')
  await page.goto(`${baseURL}#website`, { waitUntil: 'networkidle' })
  await page.getByText('Try changing the hours', { exact: true }).click()
  await page.getByLabel('Opens').fill('14:00')
  await page.getByLabel('Closes').fill('12:00')
  await still(page, 'desktop-hours-invalid.png', page.locator('.try-update'))
  await page.getByRole('button', { name: 'Reset sample' }).click()
  await still(page, 'desktop-hours-reset.png', page.locator('.try-update'))

  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.getByLabel('Business name (optional)').fill('Cedar Lane Workshop')
  await page.getByLabel('What should your website help with?').fill('Keep sample opening information clear.\nShow seasonal work without repeating the same note.')
  await page.getByRole('button', { name: 'Copy website note' }).click()
  await page.getByText('Note copied', { exact: true }).waitFor()
  await still(page, 'desktop-contact-copy-success.png', page.locator('#contact'))
  await context.close()

  const denied = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await denied.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('review denial') } } })
  })
  const deniedPage = await denied.newPage()
  observe(deniedPage, 'clipboard-denied')
  await deniedPage.goto(`${baseURL}#contact`, { waitUntil: 'networkidle' })
  await deniedPage.getByLabel('What should your website help with?').fill('Keep the sample collection note easy to update.')
  await deniedPage.getByRole('button', { name: 'Copy website note' }).click()
  await deniedPage.getByText(/Clipboard unavailable/).waitFor()
  await deniedPage.getByText(/Clipboard unavailable/).scrollIntoViewIfNeeded()
  await still(deniedPage, 'portrait-contact-clipboard-denied.png')
  await denied.close()

  const narrow = await browser.newContext({ viewport: { width: 320, height: 740 }, deviceScaleFactor: 1 })
  const narrowPage = await narrow.newPage()
  observe(narrowPage, 'narrow-320')
  await narrowPage.goto(`${baseURL}#contact`, { waitUntil: 'networkidle' })
  await still(narrowPage, 'narrow-320-contact.png', narrowPage.locator('#contact'))
  await narrow.close()

  const textContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  const textPage = await textContext.newPage()
  observe(textPage, 'text-200')
  await textPage.goto(`${baseURL}#contact`, { waitUntil: 'networkidle' })
  await textPage.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await textPage.locator('#contact').scrollIntoViewIfNeeded()
  await still(textPage, 'desktop-contact-text-200.png')
  report.text200Overflow = await textPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await textContext.close()
}

async function scrollToward(page, selector) {
  const target = await page.locator(selector).evaluate((element) => Math.min(
    element.getBoundingClientRect().top + scrollY - 90,
    document.documentElement.scrollHeight - innerHeight,
  ))
  let steps = 0
  while (await page.evaluate(() => scrollY) < target - 20 && steps < 80) {
    await page.mouse.wheel(0, 340)
    await page.waitForTimeout(230)
    steps += 1
  }
  await page.waitForTimeout(350)
}

async function duration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=duration:format=duration', '-of', 'csv=p=0', file])
  const value = stdout.split(/[\s,]+/).map(Number).find((candidate) => Number.isFinite(candidate))
  if (value === undefined) throw new Error(`Could not read the duration of ${file}.`)
  return value
}

async function recordDesktopJourney() {
  const viewport = { width: 1440, height: 900 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: viewport } })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL).origin })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
    window.__afterAlbumSounds = []
    addEventListener('farmstandsound', (event) => window.__afterAlbumSounds.push({ ...event.detail, atMs: Math.round(performance.now()) }))
  })
  const page = await context.newPage()
  observe(page, 'desktop-journey')
  await page.goto(`${baseURL}?recordSound=1#sheep`, { waitUntil: 'networkidle' })
  await page.mouse.click(12, 320)
  await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
  await page.waitForFunction(() => Boolean(window.__farmStandAudioStream), null, { timeout: 8000 })
  const startedAt = Date.now()
  await page.evaluate(() => {
    const recorder = new MediaRecorder(window.__farmStandAudioStream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
    window.__afterAlbumRecorder = { recorder, chunks }
    recorder.start(100)
  })

  await page.waitForTimeout(700)
  await scrollToward(page, '#visit')
  await page.locator('#visit summary').click()
  await page.waitForTimeout(650)
  await scrollToward(page, '#website')
  await page.getByText('Try changing the hours', { exact: true }).click()
  await page.waitForTimeout(450)
  await page.getByLabel('Opens').fill('10:30')
  await page.getByLabel('Closes').fill('12:30')
  await page.waitForTimeout(650)
  await page.getByRole('button', { name: 'Reset sample' }).click()
  await page.waitForTimeout(650)
  await scrollToward(page, '#contact')
  await page.getByLabel('Business name (optional)').fill('Cedar Lane Workshop')
  await page.getByLabel('What should your website help with?').fill('Keep opening information clear and make seasonal work easy to browse.')
  await page.getByRole('button', { name: 'Copy website note' }).click()
  await page.getByText('Note copied', { exact: true }).waitFor()
  await page.waitForTimeout(800)
  await scrollToward(page, '.site-footer')
  await page.getByText('About this demonstration', { exact: true }).click()
  await page.waitForTimeout(650)
  await page.getByText('Sources & credits', { exact: true }).click()
  await page.waitForTimeout(1200)

  const audioDataURL = await page.evaluate(() => new Promise((resolve, reject) => {
    const state = window.__afterAlbumRecorder
    if (!state) return reject(new Error('Audio recorder state is missing.'))
    state.recorder.addEventListener('stop', () => {
      const reader = new FileReader()
      reader.addEventListener('loadend', () => resolve(reader.result), { once: true })
      reader.addEventListener('error', () => reject(reader.error), { once: true })
      reader.readAsDataURL(new Blob(state.chunks, { type: 'audio/webm;codecs=opus' }))
    }, { once: true })
    state.recorder.stop()
  }))
  const sounds = await page.evaluate(() => window.__afterAlbumSounds ?? [])
  const rawAudio = path.join(rawDir, 'after-album-browser-audio.webm')
  const audio = path.join(rawDir, 'after-album-browser-audio-normalized.webm')
  await fs.writeFile(rawAudio, Buffer.from(String(audioDataURL).split(',')[1], 'base64'))
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawAudio, '-c:a', 'copy', audio])
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Playwright did not create the desktop ending video.')
  const rawVideo = await video.path()
  const videoDuration = await duration(rawVideo)
  const audioDuration = await duration(audio)
  const endAlignedOffset = Math.max(0, videoDuration - audioDuration)
  const output = path.join(evidenceDir, 'desktop-1440x900-ending-actual-browser-audio.webm')
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', endAlignedOffset.toFixed(3), '-i', rawVideo,
    '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'libopus', '-shortest', output,
  ])
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,duration:format=duration,size', '-of', 'json', output])
  report.captures.push(path.basename(output))
  report.audioJourney = {
    startedAt: new Date(startedAt).toISOString(),
    method: 'The audio track is the application Web Audio master recorded during the same visible Chromium interaction run. FFmpeg only muxed that browser track with Playwright video; no replacement or post-production sound was added.',
    videoDuration,
    audioDuration,
    endAlignedOffset,
    sounds,
    streams: JSON.parse(stdout),
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
  await page.goto(`${baseURL}#sheep`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  for (const selector of ['#visit', '#website', '#contact', '.site-footer']) await scrollToward(page, selector)
  await page.waitForTimeout(700)
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Playwright did not create the portrait ending video.')
  const output = path.join(evidenceDir, 'portrait-390x844-ending-normal-speed.webm')
  await fs.rm(output, { force: true })
  await fs.rename(await video.path(), output)
  report.captures.push(path.basename(output))
}

await captureViewport('desktop-1440x900', { width: 1440, height: 900 })
await captureViewport('portrait-390x844', { width: 390, height: 844 })
await captureStates()
await recordDesktopJourney()
await recordPortraitJourney()
await browser.close()
await fs.rm(rawDir, { recursive: true, force: true })
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)

const requiredSounds = ['details-open', 'clear', 'confirm']
const heard = new Set(report.audioJourney.sounds.map(({ name }) => name))
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length || report.text200Overflow > 1 || requiredSounds.some((name) => !heard.has(name))) process.exitCode = 1
