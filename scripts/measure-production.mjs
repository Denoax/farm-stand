import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.clearBrowserCache')

await page.addInitScript(() => {
  window.__farmStandLayoutShifts = []
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__farmStandLayoutShifts.push(entry.value)
    }
  }).observe({ type: 'layout-shift', buffered: true })
})

const resources = async () => page.evaluate(() => [performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource')]
  .filter(Boolean)
  .map((entry) => ({
    path: new URL(entry.name).pathname,
    initiatorType: entry.initiatorType,
    transferBytes: entry.transferSize,
    encodedBodyBytes: entry.encodedBodySize,
    decodedBodyBytes: entry.decodedBodySize,
  })))

const summarize = (entries) => ({
  requests: entries.length,
  transferBytes: entries.reduce((sum, entry) => sum + entry.transferBytes, 0),
  encodedBodyBytes: entries.reduce((sum, entry) => sum + entry.encodedBodyBytes, 0),
  decodedBodyBytes: entries.reduce((sum, entry) => sum + entry.decodedBodyBytes, 0),
})

const mediaSummary = (entries) => {
  const assets = entries.filter((entry) => /\.(woff2|avif|webp|gltf|bin|jpe?g|mp4)(\?|$)/i.test(entry.path))
  return {
    ...summarize(assets),
    imageEncodedBytes: assets.filter((entry) => /\.(avif|webp|jpe?g)(\?|$)/i.test(entry.path)).reduce((sum, entry) => sum + entry.encodedBodyBytes, 0),
    videoEncodedBytes: assets.filter((entry) => /\.mp4(\?|$)/i.test(entry.path)).reduce((sum, entry) => sum + entry.encodedBodyBytes, 0),
    fontEncodedBytes: assets.filter((entry) => /\.woff2(\?|$)/i.test(entry.path)).reduce((sum, entry) => sum + entry.encodedBodyBytes, 0),
    assets,
  }
}

await page.goto(baseURL, { waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
await page.evaluate(() => document.fonts.ready)
const initialEntries = await resources()
const initialMarketMediaRequests = initialEntries.filter((entry) => /\/media\/(catalogue-expanded|farm-life-motion)\//.test(entry.path))

const renderer = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
  if (!gl) return null
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
  }
})

const sceneBefore = await page.locator('.scene-host').evaluate((node) => ({
  renderCount: Number(node.dataset.renderCount),
  drawCalls: Number(node.dataset.drawCalls),
  triangles: Number(node.dataset.triangles),
  rendering: node.dataset.rendering,
}))

await page.locator('#shop').scrollIntoViewIfNeeded()
await page.getByRole('button', { name: /^All 48/ }).click()
for (const card of await page.locator('.product-card').all()) {
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(80)
}
await page.locator('#farm-life').scrollIntoViewIfNeeded()
for (const id of ['hens', 'cattle', 'sheep']) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.waitForTimeout(180)
}
await page.locator('#contact').scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
const offscreenFirst = await page.locator('.scene-host').evaluate((node) => ({ renderCount: Number(node.dataset.renderCount), rendering: node.dataset.rendering }))
await page.waitForTimeout(500)
const offscreenSecond = await page.locator('.scene-host').evaluate((node) => ({ renderCount: Number(node.dataset.renderCount), rendering: node.dataset.rendering }))
await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
await page.waitForTimeout(500)
const resumed = await page.locator('.scene-host').evaluate((node) => ({ renderCount: Number(node.dataset.renderCount), rendering: node.dataset.rendering }))

const totalEntries = await resources()
const layoutShifts = await page.evaluate(() => ({
  values: window.__farmStandLayoutShifts,
  cumulative: window.__farmStandLayoutShifts.reduce((sum, value) => sum + value, 0),
}))
const rendererName = renderer?.unmaskedRenderer ?? renderer?.renderer ?? 'Unavailable'

const result = {
  measuredAt: new Date().toISOString(),
  source: { baseURL, viewport: '1440x960 CSS px', devicePixelRatio: 1, browser: 'project Playwright Chromium' },
  initial: {
    ...summarize(initialEntries),
    media: mediaSummary(initialEntries),
    initialMarketMediaRequests,
  },
  afterFullPageVisit: {
    ...summarize(totalEntries),
    media: mediaSummary(totalEntries),
  },
  scene: {
    before: sceneBefore,
    offscreenFirst,
    offscreenSecond,
    resumed,
    pausedWithoutNewRenders: offscreenFirst.renderCount === offscreenSecond.renderCount && offscreenSecond.rendering === 'paused',
    resumedWithCurrentScene: resumed.renderCount > offscreenSecond.renderCount && resumed.rendering === 'active',
  },
  layoutShifts,
  renderer: {
    ...renderer,
    accelerationClassification: /swiftshader|llvmpipe|software/i.test(rendererName) ? 'software' : 'not identified as software; physical hardware not established',
  },
  limitations: [
    'Localhost transfer sizes do not predict rural-network latency.',
    'Headless Chromium does not establish physical-device performance or cross-browser parity.',
    'The entrance intentionally requests four small poster/photo assets immediately so its HTML links never wait for lazy media.',
    'Animal video requests depend on viewport intersection and browser media buffering; transfer totals are not whole-file payload guarantees.',
  ],
}

await fs.mkdir(path.resolve('evidence/real-farm/review'), { recursive: true })
await fs.writeFile(path.resolve('evidence/real-farm/review/production-measurements.json'), `${JSON.stringify(result, null, 2)}\n`)
await browser.close()
console.log(JSON.stringify({
  initial: { ...result.initial, media: { ...result.initial.media, assets: undefined } },
  afterFullPageVisit: { ...result.afterFullPageVisit, media: { ...result.afterFullPageVisit.media, assets: undefined } },
  scene: result.scene,
  layoutShifts: result.layoutShifts,
  renderer: result.renderer,
}, null, 2))
