import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const reviewDir = path.resolve('evidence/v2.4/review')
const afterDir = path.join(reviewDir, 'after')
const failureDir = path.join(reviewDir, 'failure')
await Promise.all([
  fs.mkdir(afterDir, { recursive: true }),
  fs.mkdir(failureDir, { recursive: true }),
])

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  method: 'Playwright Chromium video capture with native wheel scrolling and unmodified page pixels',
  deviceScaleFactor: 1,
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  mediaCancellations: [],
  captures: [],
  renderer: null,
}

function monitor(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push({ label, text: message.text() })
  })
  page.on('pageerror', (error) => report.pageErrors.push({ label, text: error.message }))
  page.on('requestfailed', (request) => {
    const failure = { label, url: request.url(), error: request.failure()?.errorText ?? 'unknown' }
    if (/\.mp4(?:\?|$)/.test(failure.url) && failure.error === 'net::ERR_ABORTED') report.mediaCancellations.push(failure)
    else report.requestFailures.push(failure)
  })
}

async function rendererDetails(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    if (!gl) return null
    const debug = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    return {
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer,
      accelerationClassification: /swiftshader|llvmpipe|software/i.test(renderer) ? 'software' : 'not identified as software; physical hardware not established',
    }
  })
}

async function shot(page, directory, name) {
  await page.screenshot({ path: path.join(directory, name) })
  report.captures.push(path.relative(reviewDir, path.join(directory, name)))
}

async function nativeScrollTo(page, target, pace = 34) {
  for (let guard = 0; guard < 240; guard += 1) {
    const current = await page.evaluate(() => scrollY)
    const distance = target - current
    if (Math.abs(distance) < 3) break
    const delta = Math.sign(distance) * Math.min(Math.abs(distance), 150)
    await page.mouse.wheel(0, delta)
    await page.waitForTimeout(pace)
  }
}

async function scenePoint(page, selector, progress) {
  return page.locator(selector).evaluate((node, value) => {
    const top = node.getBoundingClientRect().top + scrollY
    return top + Math.max(node.offsetHeight - innerHeight, 0) * value
  }, progress)
}

async function recordedSession(viewport, videoName) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(viewport.width < 600 ? { hasTouch: true, isMobile: true } : {}),
    recordVideo: { dir: reviewDir, size: viewport },
  })
  const page = await context.newPage()
  monitor(page, videoName)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  return { context, page, videoName }
}

async function closeRecorded({ context, page, videoName }) {
  const video = page.video()
  await context.close()
  if (!video) return
  const destination = path.join(reviewDir, videoName)
  await fs.rename(await video.path(), destination)
  report.captures.push(videoName)
}

async function captureJourney(viewport, label) {
  const current = await recordedSession(viewport, `v2.4-full-journey-${label}.webm`)
  const { page } = current
  if (!report.renderer) report.renderer = await rendererDetails(page)
  await page.waitForTimeout(1200)

  const heroFrames = [
    [.02, 'attached'],
    [.47, 'pre-contact'],
    [.54, 'contact'],
    [.64, 'settled'],
    [.72, 'cut-midpoint'],
    [.88, 'stand'],
  ]
  for (const [progress, state] of heroFrames) {
    await nativeScrollTo(page, await scenePoint(page, '.hero-stage', progress), 42)
    await page.waitForTimeout(280)
    await shot(page, afterDir, `${state}-${label}.png`)
  }

  await nativeScrollTo(page, await scenePoint(page, '#shop', 0), 34)
  await page.waitForTimeout(900)
  await shot(page, afterDir, `shop-first-viewport-${label}.png`)
  const appleCard = page.locator('#product-apple')
  await appleCard.getByRole('button', { name: 'View details' }).click()
  await page.waitForTimeout(900)
  await shot(page, afterDir, `product-detail-${label}.png`)
  await page.getByRole('dialog', { name: 'Orchard apples' }).getByRole('button', { name: 'Add to basket' }).click()
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: 'Close product details' }).click()
  await page.waitForTimeout(550)
  await page.locator('#product-eggs').getByRole('button', { name: 'Add to basket' }).click()
  await page.locator('#product-harvest-box').scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  await shot(page, afterDir, `shop-final-box-${label}.png`)
  await page.getByRole('button', { name: /Open demonstration basket/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await page.waitForTimeout(350)
  await shot(page, afterDir, `multi-item-drawer-${label}.png`)
  await page.getByRole('button', { name: 'Preview collection' }).click()
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: 'Save this preview' }).click()
  await page.waitForTimeout(700)
  await shot(page, afterDir, `collection-preview-${label}.png`)
  await page.getByRole('button', { name: 'Close basket' }).click()
  await page.waitForTimeout(500)
  const feedback = page.getByRole('button', { name: 'Dismiss basket update' })
  if (await feedback.isVisible()) await feedback.click()

  for (const [progress, state] of [[.04, 'entry'], [.35, 'active'], [.68, 'clearing'], [.96, 'resolved']]) {
    await nativeScrollTo(page, await scenePoint(page, '.weather-story', progress), 38)
    await page.waitForTimeout(420)
    await shot(page, afterDir, `weather-${state}-${label}.png`)
  }

  for (const animal of ['hens', 'cattle', 'sheep']) {
    await nativeScrollTo(page, await scenePoint(page, `#${animal}`, animal === 'sheep' ? .7 : .48), 38)
    await page.waitForTimeout(850)
    await shot(page, afterDir, `${animal}-focal-${label}.png`)
  }

  await nativeScrollTo(page, await scenePoint(page, '#visit', 0), 34)
  await page.waitForTimeout(800)
  await nativeScrollTo(page, await scenePoint(page, '#website', .28), 34)
  await page.waitForTimeout(900)
  await page.getByLabel('Opens').fill('10:30')
  await page.getByLabel('Closes').fill('13:30')
  await page.waitForTimeout(650)
  await shot(page, afterDir, `service-sample-update-${label}.png`)
  await nativeScrollTo(page, await scenePoint(page, '#contact', .5), 34)
  await page.waitForTimeout(1000)
  await shot(page, afterDir, `contact-ending-${label}.png`)
  await nativeScrollTo(page, await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 34)
  await page.waitForTimeout(1200)
  await closeRecorded(current)
}

await captureJourney({ width: 1440, height: 900 }, 'desktop')
await captureJourney({ width: 390, height: 844 }, 'portrait')

{
  const current = await recordedSession({ width: 1440, height: 900 }, 'v2.4-hero-reversal-and-interruption-desktop.webm')
  const { page } = current
  await nativeScrollTo(page, await scenePoint(page, '.hero-stage', .9), 38)
  await page.waitForTimeout(650)
  await nativeScrollTo(page, await scenePoint(page, '.hero-stage', .34), 32)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Open demonstration basket/ }).click()
  await page.waitForTimeout(500)
  await shot(page, afterDir, 'drawer-during-hero-desktop.png')
  await page.getByRole('button', { name: 'Close basket' }).click()
  await nativeScrollTo(page, await scenePoint(page, '.hero-stage', .84), 18)
  await page.waitForTimeout(800)
  await closeRecorded(current)
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  monitor(page, 'delayed-models')
  await page.route('**/models/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2600))
    await route.continue()
  })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  await shot(page, failureDir, 'delayed-model-poster-portrait.png')
  await page.waitForSelector('.hero-stage--ready', { timeout: 10000 })
  await page.waitForTimeout(350)
  await shot(page, failureDir, 'poster-to-live-portrait.png')
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.route('**/media/weather-rain.mp4', (route) => route.abort())
  await page.goto(`${baseURL}#shop`, { waitUntil: 'domcontentloaded' })
  await nativeScrollTo(page, await scenePoint(page, '.weather-story', .5), 24)
  await page.waitForTimeout(450)
  await shot(page, failureDir, 'weather-video-failure-desktop.png')
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.route('**/media/farm-life/sheep.avif', (route) => route.abort())
  await page.goto(`${baseURL}#sheep`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await shot(page, failureDir, 'sheep-direct-hash-media-failure-portrait.png')
  await context.close()
}

await browser.close()
await fs.writeFile(path.join(reviewDir, 'capture-runtime-v2.4.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length) process.exitCode = 1
