import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baselineURL = process.env.BASELINE_URL
const candidateURL = process.env.CANDIDATE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
if (!baselineURL) throw new Error('BASELINE_URL is required')
const output = path.resolve('evidence/checkout-timber/review/render-benchmark.json')
const browser = await chromium.launch()

function summarize(intervals) {
  const ordered = [...intervals].sort((a, b) => a - b)
  const at = (fraction) => ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))]
  return { samples: ordered.length, medianMs: at(.5), p95Ms: at(.95), maxMs: ordered.at(-1), over25Ms: ordered.filter((value) => value > 25).length, over50Ms: ordered.filter((value) => value > 50).length }
}

async function measureOnce(baseURL, index) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  const run = await page.evaluate(async () => {
      const intervals = []
      let previous = performance.now()
      let active = true
      const tick = (now) => {
        intervals.push(now - previous)
        previous = now
        if (active) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
      await new Promise((resolve) => {
        const check = () => document.querySelector('.hero-stage')?.getAttribute('data-opening-state') === 'open' ? resolve() : requestAnimationFrame(check)
        requestAnimationFrame(check)
      })
      active = false
      const scene = document.querySelector('.scene-host')
      const canvas = scene?.querySelector('canvas')
      const materialResources = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/materials/'))
      return {
        intervals: intervals.slice(1),
        materialTransferBytes: materialResources.reduce((total, entry) => total + entry.transferSize, 0),
        materialDecodedBytes: materialResources.reduce((total, entry) => total + entry.decodedBodySize, 0),
        materialRequests: materialResources.length,
        context: {
          css: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
          drawingBuffer: canvas ? [canvas.width, canvas.height] : null,
          pixelRatio: scene?.getAttribute('data-pixel-ratio'),
          drawCalls: Number(scene?.getAttribute('data-draw-calls')),
          triangles: Number(scene?.getAttribute('data-triangles')),
        },
      }
  })
  await context.close()
  return { run: index, ...summarize(run.intervals), materialTransferBytes: run.materialTransferBytes, materialDecodedBytes: run.materialDecodedBytes, materialRequests: run.materialRequests, context: run.context }
}

const baseline = { label: process.env.BASELINE_LABEL ?? 'reviewed baseline', baseURL: baselineURL, runs: [] }
const candidate = { label: process.env.CANDIDATE_LABEL ?? 'working candidate', baseURL: candidateURL, runs: [] }
for (let index = 1; index <= 6; index += 1) {
  const order = index % 2 ? [[baseline, baselineURL], [candidate, candidateURL]] : [[candidate, candidateURL], [baseline, baselineURL]]
  for (const [target, url] of order) target.runs.push(await measureOnce(url, index))
}
const report = {
  measuredAt: new Date().toISOString(),
  method: 'Six paired fresh Chromium contexts per immutable baseline/candidate, 1440x900 CSS px at requested DPR 2 with the application cap unchanged. Pair order alternates AB/BA to limit order drift. requestAnimationFrame intervals cover the same unaccelerated 6.5-second opening. Network cache and visual quality settings are unchanged.',
  successCriterion: 'No material median/p95 frame-interval regression or new >50 ms tail pattern; preserve the exact composition and application DPR cap.',
  limitations: 'Headless software-rendered frame intervals are not CPU, GPU or physical-device timings. Transfer sizes on localhost can be zero when served from cache; decoded body bytes and request counts are retained.',
  baseline,
  candidate,
}
await browser.close()
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
