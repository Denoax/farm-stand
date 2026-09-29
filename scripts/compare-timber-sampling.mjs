import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baselineURL = process.env.BASELINE_URL
const candidateURL = process.env.CANDIDATE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
if (!baselineURL) throw new Error('BASELINE_URL is required')
const output = path.resolve('evidence/video-bird/review/timber/sampling-comparison.json')
const browser = await chromium.launch()

function summarize(intervals) {
  const ordered = [...intervals].sort((a, b) => a - b)
  const at = (fraction) => ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))]
  return { samples: ordered.length, medianMs: at(.5), p95Ms: at(.95), maxMs: ordered.at(-1), over25Ms: ordered.filter((value) => value > 25).length, over50Ms: ordered.filter((value) => value > 50).length }
}

async function measure(baseURL, label) {
  const runs = []
  for (let index = 1; index <= 3; index += 1) {
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
        const check = () => {
          if (document.querySelector('.hero-stage')?.getAttribute('data-opening-state') === 'open') resolve()
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      })
      active = false
      const scene = document.querySelector('.scene-host')
      const canvas = scene?.querySelector('canvas')
      return {
        intervals: intervals.slice(1),
        context: {
          css: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
          drawingBuffer: canvas ? [canvas.width, canvas.height] : null,
          antialias: scene?.getAttribute('data-context-antialias') ?? 'true (baseline context inspection)',
          samples: scene?.getAttribute('data-context-samples') ?? '4 (baseline context inspection)',
          pixelRatio: scene?.getAttribute('data-pixel-ratio') ?? (canvas ? String(canvas.width / canvas.clientWidth) : null),
          drawCalls: scene?.getAttribute('data-draw-calls'),
          triangles: scene?.getAttribute('data-triangles'),
        },
      }
    })
    runs.push({ run: index, ...summarize(run.intervals), context: run.context })
    await context.close()
  }
  return { label, baseURL, runs }
}

const report = {
  measuredAt: new Date().toISOString(),
  method: 'Three independent fresh Chromium contexts per immutable baseline/candidate, 1440x900 CSS pixels at DPR 2. requestAnimationFrame intervals cover the same unaccelerated 6.5-second opening. Headless software rendering is not physical-device or GPU-timing evidence.',
  baseline: await measure(baselineURL, 'c253259 baseline'),
  candidate: await measure(candidateURL, 'working candidate'),
}
await browser.close()
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
