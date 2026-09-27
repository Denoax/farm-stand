import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const browser = await chromium.launch()

function summarize(intervals) {
  const ordered = [...intervals].sort((a, b) => a - b)
  return {
    samples: intervals.length,
    medianFrameIntervalMs: ordered[Math.floor(ordered.length * .5)],
    p95FrameIntervalMs: ordered[Math.floor(ordered.length * .95)],
    maxFrameIntervalMs: ordered.at(-1),
    intervalsOver25Ms: intervals.filter((value) => value > 25).length,
  }
}

async function measureRun(index) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  const measurement = await page.evaluate(async () => {
    const intervals = []
    let previous = performance.now()
    let done = false
    const sample = (now) => {
      intervals.push(now - previous)
      previous = now
      if (!done) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    const started = performance.now()
    document.querySelector('.market-opening__motion')?.click()
    await new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('.hero-stage')?.getAttribute('data-opening-state') === 'open') {
          done = true
          resolve()
        } else requestAnimationFrame(check)
      }
      requestAnimationFrame(check)
    })
    return {
      elapsedMs: performance.now() - started,
      intervals: intervals.slice(1),
      renderCount: Number(document.querySelector('.scene-host')?.getAttribute('data-render-count')),
    }
  })
  await context.close()
  return { run: index, elapsedMs: measurement.elapsedMs, renderCount: measurement.renderCount, ...summarize(measurement.intervals) }
}

const runs = []
for (let index = 1; index <= 3; index += 1) runs.push(await measureRun(index))

const result = {
  measuredAt: new Date().toISOString(),
  source: {
    baseURL,
    viewport: '1440x900 CSS px',
    devicePixelRatio: 1,
    browser: 'project Playwright Chromium',
    limitation: 'Headless Chromium uses software rendering here. Intervals are requestAnimationFrame cadence, not GPU timing and not physical-device evidence.',
  },
  opening: {
    runs,
    method: 'Three independent fresh browser contexts. Each run starts after network idle and scene readiness, uses the real Open the stand control, and records the complete unaccelerated 6.2 second timeline.',
  },
}

await fs.mkdir(path.resolve('evidence/market-expansion/review'), { recursive: true })
await fs.writeFile(path.resolve('evidence/market-expansion/review/motion-measurements.json'), `${JSON.stringify(result, null, 2)}\n`)
await browser.close()
console.log(JSON.stringify(result, null, 2))
