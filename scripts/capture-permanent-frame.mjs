import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/real-farm/review')
const sourceDir = path.resolve('evidence/real-farm/poster-source')
await fs.mkdir(evidenceDir, { recursive: true })
await fs.mkdir(sourceDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'Project Playwright Chromium',
  pacing: 'Normal-speed recordings use the complete 6.5 second application clock after one downward intent; no capture-only timeline acceleration is used.',
  rendererLimitation: 'Headless Chromium is software-rendered here; recordings are review evidence, not physical-device or hardware-GPU performance evidence.',
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  expectedFailures: [],
  fadeSamples: {},
  captures: [],
}

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const error = { label, message: message.text() }
    if ((label.startsWith('model-failure') || label.startsWith('plate-failure')) && /ERR_FAILED/.test(error.message)) report.expectedFailures.push(error)
    else report.consoleErrors.push(error)
  })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const failure = { label, url: request.url(), error: request.failure()?.errorText ?? 'unknown' }
    if ((label.startsWith('model-failure') && /\/models\//.test(failure.url)) || (label.startsWith('plate-failure') && /\/real-farm\//.test(failure.url))) report.expectedFailures.push(failure)
    else if (/\.mp4(?:$|\?)/.test(failure.url) && failure.error === 'net::ERR_ABORTED') report.expectedFailures.push(failure)
    else report.requestFailures.push(failure)
  })
}

async function screenshot(page, name, options = {}) {
  await page.screenshot({ path: path.join(evidenceDir, name), ...options })
  report.captures.push(name)
}

async function waitForProgress(page, target) {
  await page.waitForFunction((value) => Number(document.querySelector('.hero-stage')?.getAttribute('data-requested-progress')) >= value, target, { timeout: 9000, polling: 'raf' })
}

async function retainVideo(context, page, name) {
  const video = page.video()
  await context.close()
  if (!video) return
  await fs.rename(await video.path(), path.join(evidenceDir, name))
  report.captures.push(name)
}

async function recordOpening(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: evidenceDir, size: viewport } })
  const page = await context.newPage()
  observe(page, `${label}-opening`)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await screenshot(page, `${label}-01-closed.png`)
  report.fadeSamples[label] = await page.evaluate(async () => {
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
    const stage = document.querySelector('.hero-stage')
    const copy = document.querySelector('.hero-copy')
    while (stage?.getAttribute('data-opening-state') !== 'playing') await new Promise(requestAnimationFrame)
    const samples = []
    const startedAt = performance.now()
    for (let index = 0; index < 6; index += 1) {
      samples.push({ elapsedMs: Math.round(performance.now() - startedAt), opacity: Number(copy ? getComputedStyle(copy).opacity : 0) })
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    return samples
  })
  await screenshot(page, `${label}-02-copy-fading.png`)
  await waitForProgress(page, .28)
  await screenshot(page, `${label}-03-partly-open.png`)
  await waitForProgress(page, .49)
  await screenshot(page, `${label}-04-shutter-open.png`)
  await waitForProgress(page, .54)
  await screenshot(page, `${label}-05-roll-start.png`)
  await waitForProgress(page, .59)
  await screenshot(page, `${label}-06-roll-mid.png`)
  await waitForProgress(page, .68)
  await screenshot(page, `${label}-07-roll-occluded.png`)
  await waitForProgress(page, .8)
  await screenshot(page, `${label}-08-permanent-open-rest.png`)
  await waitForProgress(page, .96)
  await screenshot(page, `${label}-09-copy-photos-return.png`)
  await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 9000 })
  await page.waitForTimeout(3000)
  await screenshot(page, `${label}-10-stable-rest.png`)
  await page.mouse.wheel(0, 600)
  await page.waitForSelector('[data-leaf-state="playing"]')
  await page.waitForTimeout(520)
  await screenshot(page, `${label}-11-leaf-handoff.png`)
  await page.waitForSelector('[data-leaf-state="complete"]')
  await page.waitForTimeout(450)
  await screenshot(page, `${label}-12-shop-arrival.png`)
  await retainVideo(context, page, `${label}-opening-normal-speed.webm`)
}

async function captureOpenViewport(label, viewport, deviceScaleFactor = 1) {
  const context = await browser.newContext({ viewport, deviceScaleFactor })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, label)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await screenshot(page, `${label}.png`)
  await page.locator('.entrance-links a').first().screenshot({ path: path.join(evidenceDir, `${label}-nail-paper-closeup.png`) })
  report.captures.push(`${label}-nail-paper-closeup.png`)
  await context.close()
}

async function captureResizeSequence() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, 'resize-sequence')
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.waitForTimeout(300)
  await screenshot(page, 'widescreen-1920x1080-final.png')
  await page.setViewportSize({ width: 2560, height: 1440 })
  await page.waitForTimeout(300)
  await screenshot(page, 'widescreen-2560x1440-final.png')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await screenshot(page, 'resize-to-portrait-final.png')
  await context.close()
}

async function capturePosterSource(name, viewport, settled) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  if (settled) await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.addStyleTag({ content: '.site-header,.hero-copy,.entrance-links,.market-opening__progress,.scroll-cue,.scene-status,.basket-button,.scene-vignette{display:none!important}' })
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(sourceDir, `${name}.png`) })
  await context.close()
}

async function captureFailure(label, routePattern, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  observe(page, label)
  await page.route(routePattern, (route) => route.abort())
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--fallback')
  await screenshot(page, `${label}.png`)
  await context.close()
}

await recordOpening('desktop-1440x900', { width: 1440, height: 900 })
await recordOpening('portrait-390x844', { width: 390, height: 844 })
await captureOpenViewport('desktop-1440x900-final-dpr1', { width: 1440, height: 900 }, 1)
await captureOpenViewport('desktop-1440x900-final-dpr2', { width: 1440, height: 900 }, 2)
await captureOpenViewport('portrait-390x844-final', { width: 390, height: 844 }, 1)
await captureResizeSequence()

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const reducedPage = await reducedContext.newPage()
observe(reducedPage, 'reduced-motion')
await reducedPage.goto(baseURL, { waitUntil: 'networkidle' })
await screenshot(reducedPage, 'reduced-motion-portrait.png')
await reducedContext.close()

await captureFailure('model-failure-desktop', '**/models/**')
await captureFailure('plate-failure-desktop', '**/media/real-farm/*.avif')

const clearanceContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const clearancePage = await clearanceContext.newPage()
await clearancePage.goto(`${baseURL}?debugAppleClearance=1`)
await clearancePage.waitForSelector('.hero-stage--ready')
await clearancePage.evaluate(() => {
  document.querySelector('.hero-copy')?.remove()
  document.querySelector('.entrance-links')?.remove()
  document.querySelector('.scene-vignette')?.remove()
  window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
})
await waitForProgress(clearancePage, .68)
await screenshot(clearancePage, 'apple-clearance-side-debug.png')
report.appleClearance = await clearancePage.locator('.scene-host').evaluate((node) => ({
  clearance: node.getAttribute('data-apple-clearance'),
  collisionFree: node.getAttribute('data-apple-collision-free'),
  appleZ: node.getAttribute('data-apple-z'),
  appleHalfExtentZ: node.getAttribute('data-apple-half-extent-z'),
  postRearZ: node.getAttribute('data-post-rear-z'),
}))
await clearanceContext.close()

const contextLossContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const contextLossPage = await contextLossContext.newPage()
observe(contextLossPage, 'context-loss')
await contextLossPage.goto(baseURL, { waitUntil: 'networkidle' })
await contextLossPage.waitForSelector('.hero-stage--ready')
await contextLossPage.locator('.farm-canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
await contextLossPage.waitForSelector('.hero-stage--fallback')
await screenshot(contextLossPage, 'context-loss-desktop.png')
await contextLossContext.close()

const delayedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const delayedPage = await delayedContext.newPage()
observe(delayedPage, 'delayed-model')
await delayedPage.route('**/models/**/*.gltf', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1800))
  await route.continue()
})
await delayedPage.goto(baseURL, { waitUntil: 'domcontentloaded' })
await delayedPage.waitForTimeout(350)
await screenshot(delayedPage, 'delayed-model-first-paint-desktop.png')
await delayedPage.waitForSelector('.hero-stage--ready', { timeout: 6000 })
await screenshot(delayedPage, 'delayed-model-ready-desktop.png')
await delayedContext.close()

await capturePosterSource('market-opening-poster-desktop', { width: 1536, height: 1024 }, false)
await capturePosterSource('market-opening-poster-portrait', { width: 640, height: 960 }, false)
await capturePosterSource('market-opening-settled-desktop', { width: 1536, height: 1024 }, true)
await capturePosterSource('market-opening-settled-portrait', { width: 640, height: 960 }, true)
await capturePosterSource('farm-stand-social', { width: 1200, height: 630 }, true)

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
