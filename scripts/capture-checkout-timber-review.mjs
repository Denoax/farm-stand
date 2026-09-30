import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const reviewDir = path.resolve('evidence/checkout-timber/review')
const posterDir = path.resolve('evidence/checkout-timber/poster-source')
const boundaryDir = path.resolve('evidence/checkout-timber/boundary-frames')
await Promise.all([reviewDir, posterDir, boundaryDir].map((directory) => fs.mkdir(directory, { recursive: true })))

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, consoleErrors: [], pageErrors: [], requestFailures: [], captures: [] }

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => report.requestFailures.push({ label, url: request.url(), error: request.failure()?.errorText }))
}

async function shot(page, name, options = {}) {
  await page.screenshot({ path: path.join(reviewDir, name), ...options })
  report.captures.push(name)
}

async function poster(name, viewport, settled) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  if (settled) await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  if (settled) await page.waitForSelector('.scene-host[data-bird-state="ready"][data-bird-entrance="1.0000"]')
  await page.addStyleTag({ content: '.site-header,.hero-copy,.entrance-links,.market-opening__progress,.scroll-cue,.scene-status,.floating-basket,.bird-hit-target,.scene-vignette{display:none!important}' })
  await page.waitForTimeout(settled ? 120 : 350)
  const source = path.join(posterDir, `${name}.png`)
  await page.screenshot({ path: source })
  await context.close()
  const destination = path.resolve(`public/media/${name}.avif`)
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-c:v', 'libaom-av1', '-crf', '28', '-still-picture', '1', destination])
  report.captures.push(path.relative(process.cwd(), destination))
}

async function captureScene(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, label)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.waitForTimeout(450)
  await shot(page, `${label}-open.png`)
  if (viewport.width >= 1000) {
    await shot(page, `${label}-upper-left-joint.png`, { clip: { x: 0, y: 70, width: 430, height: 300 } })
    await shot(page, `${label}-lower-right-joint.png`, { clip: { x: viewport.width - 430, y: viewport.height - 300, width: 430, height: 300 } })
  }
  await page.evaluate(() => scrollTo(0, document.querySelector('#shop')?.getBoundingClientRect().top ?? 900))
  await page.waitForTimeout(250)
  await shot(page, `${label}-compact-header.png`)
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(250)
  await shot(page, `${label}-full-header.png`)
  await context.close()
}

async function recordCheckout(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: reviewDir, size: viewport } })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: { apple: 2, 'farm-tee:s': 1, 'farm-tee:m': 1 } }))
  })
  const page = await context.newPage()
  observe(page, label)
  await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Open basket preview, 4 items/ }).click()
  await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
  const drawer = page.locator('.basket-dialog')
  await page.waitForTimeout(450)
  await shot(page, `${label}-basket.png`)
  await drawer.getByRole('button', { name: 'Choose collection' }).click()
  await drawer.getByLabel(/Saturday pickup/).check()
  await page.waitForTimeout(450)
  await shot(page, `${label}-collection.png`)
  await drawer.getByRole('button', { name: 'Continue to checkout' }).click()
  await page.waitForTimeout(550)
  await shot(page, `${label}-checkout.png`)
  await drawer.getByRole('button', { name: 'Complete preview' }).click()
  await drawer.getByRole('heading', { name: 'Preview complete', exact: true }).waitFor()
  await page.waitForTimeout(700)
  await shot(page, `${label}-complete.png`)
  const video = page.video()
  await context.close()
  if (video) {
    await fs.rename(await video.path(), path.join(reviewDir, `${label}-checkout-normal-speed.webm`))
    report.captures.push(`${label}-checkout-normal-speed.webm`)
  }
}

async function screencast(page, label, perform) {
  const rawDir = path.join(boundaryDir, label)
  await fs.mkdir(rawDir, { recursive: true })
  const session = await page.context().newCDPSession(page)
  const frames = []
  const writes = []
  session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const index = frames.length
    frames.push({ index, timestamp: metadata.timestamp, pageScaleFactor: metadata.pageScaleFactor, offsetTop: metadata.offsetTop })
    writes.push(fs.writeFile(path.join(rawDir, `${String(index).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64')))
    void session.send('Page.screencastFrameAck', { sessionId })
  })
  await session.send('Page.startScreencast', { format: 'jpeg', quality: 96, everyNthFrame: 1 })
  await perform()
  await session.send('Page.stopScreencast')
  await Promise.all(writes)
  const deltas = frames.slice(1).map((frame, index) => frame.timestamp - frames[index].timestamp).filter((delta) => delta > 0)
  const averageDelta = deltas.reduce((total, value) => total + value, 0) / Math.max(1, deltas.length)
  const cadence = Math.max(1, Math.min(120, Math.round(1 / averageDelta)))
  const timing = { label, frames: frames.length, captureCadenceFps: cadence, averageDeltaSeconds: averageDelta, timestamps: frames }
  await fs.writeFile(path.join(reviewDir, `${label}-timing.json`), JSON.stringify(timing, null, 2))
  if (frames.length > 1) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(cadence), '-i', path.join(rawDir, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(reviewDir, `${label}-native-capture.mp4`)])
    report.captures.push(`${label}-native-capture.mp4`, `${label}-timing.json`)
  }
  await session.detach()
}

async function captureBoundaries() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  observe(page, 'boundaries')
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await page.waitForFunction(() => Number(document.querySelector('.hero-stage')?.getAttribute('data-requested-progress')) >= .79, undefined, { polling: 'raf' })
  await screencast(page, 'opening-completion-boundary', async () => {
    await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 3000 })
    await page.waitForTimeout(650)
  })
  await screencast(page, 'leaf-start-boundary', async () => {
    await page.waitForTimeout(500)
    await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 })))
    await page.waitForSelector('.video-handoff[data-initial-frame="presented"]')
    await page.waitForTimeout(1300)
  })
  await context.close()
}

await poster('market-opening-poster-desktop', { width: 1536, height: 1024 }, false)
await poster('market-opening-poster-portrait', { width: 640, height: 960 }, false)
await poster('market-opening-settled-desktop', { width: 1536, height: 1024 }, true)
await poster('market-opening-settled-portrait', { width: 640, height: 960 }, true)
await captureScene('desktop-1440x900', { width: 1440, height: 900 })
await captureScene('portrait-390x844', { width: 390, height: 844 })
await recordCheckout('desktop-1280x720', { width: 1280, height: 720 })
await recordCheckout('portrait-390x844', { width: 390, height: 844 })
await captureBoundaries()
await browser.close()
await fs.writeFile(path.join(reviewDir, 'capture-report.json'), JSON.stringify(report, null, 2))
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
