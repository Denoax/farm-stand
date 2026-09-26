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

const summarizeResources = async () => page.evaluate(() => {
  const entries = [performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource')]
    .filter(Boolean)
    .map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    }))
  return {
    transferBytes: entries.reduce((total, entry) => total + entry.transferSize, 0),
    encodedBodyBytes: entries.reduce((total, entry) => total + entry.encodedBodySize, 0),
    decodedBodyBytes: entries.reduce((total, entry) => total + entry.decodedBodySize, 0),
    entries,
  }
})

await page.goto(baseURL, { waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
await page.evaluate(() => document.fonts.ready)
const cold = await summarizeResources()

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

const scene = await page.locator('.scene-host').evaluate((node) => ({
  drawCalls: Number(node.dataset.drawCalls),
  triangles: Number(node.dataset.triangles),
  devicePixelRatio: window.devicePixelRatio,
}))

const stats = (values) => {
  const ordered = [...values].sort((a, b) => a - b)
  const percentile = (value) => ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * value))]
  return {
    samples: values.length,
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: ordered.at(-1),
    over20ms: values.filter((value) => value > 20).length,
    over34ms: values.filter((value) => value > 34).length,
    rawMs: values,
  }
}

const continuousIntervals = await page.evaluate(() => new Promise((resolve) => {
  const values = []
  let last = performance.now()
  const sample = (now) => {
    values.push(now - last)
    last = now
    window.dispatchEvent(new Event('farmstageprogress'))
    if (values.length >= 180) resolve(values.slice(5))
    else requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
}))

const steadyIntervals = await page.evaluate(() => new Promise((resolve) => {
  const values = []
  let last = performance.now()
  const sample = (now) => {
    values.push(now - last)
    last = now
    if (values.length >= 180) resolve(values.slice(5))
    else requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
}))

const scrollIntervals = await page.evaluate(() => new Promise((resolve) => {
  const stage = document.querySelector('.hero-stage')
  const end = Math.max((stage?.offsetHeight ?? innerHeight) - innerHeight, 1)
  const values = []
  let last = performance.now()
  let frame = 0
  const sample = (now) => {
    values.push(now - last)
    last = now
    frame += 1
    const phase = frame <= 90 ? frame / 90 : (180 - frame) / 90
    scrollTo(0, end * Math.max(0, phase))
    if (frame >= 180) resolve(values.slice(5))
    else requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
}))

await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
const warm = await summarizeResources()

const pickAssets = (entries) => entries
  .filter((entry) => /\.(woff2|avif|webp|gltf|bin|jpg)(\?|$)/.test(entry.name))
  .map((entry) => ({ name: new URL(entry.name).pathname, transferBytes: entry.transferSize, encodedBodyBytes: entry.encodedBodySize }))

const rendererName = renderer?.unmaskedRenderer ?? renderer?.renderer ?? 'Unavailable'
const result = {
  measuredAt: new Date().toISOString(),
  method: 'Playwright Chromium 153 production preview on localhost; 1440×960 CSS px; DPR 1; screenshots/video disabled during interval sampling.',
  cache: {
    cold: { transferBytes: cold.transferBytes, encodedBodyBytes: cold.encodedBodyBytes, decodedBodyBytes: cold.decodedBodyBytes },
    warm: { transferBytes: warm.transferBytes, encodedBodyBytes: warm.encodedBodyBytes, decodedBodyBytes: warm.decodedBodyBytes },
  },
  requestedAssets: pickAssets(cold.entries),
  scene,
  renderer: {
    ...renderer,
    accelerationClassification: /swiftshader|llvmpipe|software/i.test(rendererName) ? 'software' : 'not identified as software; physical hardware not established',
  },
  frameIntervals: {
    forcedContinuousBaseline: stats(continuousIntervals),
    settledOnDemand: stats(steadyIntervals),
    forwardReverseScroll: stats(scrollIntervals),
  },
  limitations: [
    'Frame intervals are requestAnimationFrame wall-clock intervals, not GPU timings.',
    'Headless Chromium and the reported renderer do not establish physical-device or hardware performance.',
    'Localhost transfer does not predict rural-network latency; encoded bytes are still useful delivery evidence.',
  ],
}

await fs.writeFile(path.resolve('evidence/production-measurements.json'), `${JSON.stringify(result, null, 2)}\n`)
await browser.close()
console.log(JSON.stringify({
  cache: result.cache,
  scene: result.scene,
  renderer: result.renderer,
  frameIntervals: {
    forcedContinuousBaseline: { ...result.frameIntervals.forcedContinuousBaseline, rawMs: undefined },
    settledOnDemand: { ...result.frameIntervals.settledOnDemand, rawMs: undefined },
    forwardReverseScroll: { ...result.frameIntervals.forwardReverseScroll, rawMs: undefined },
  },
}, null, 2))
