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
    intervalsOver50Ms: intervals.filter((value) => value > 50).length,
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
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
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

async function measureHold(index) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  const result = await page.evaluate(async () => {
    const root = document.querySelector('[data-opening-state]')
    const started = performance.now()
    let acquired = false
    const durationMs = await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const value = root?.getAttribute('data-scroll-hold')
        if (value === 'active') acquired = true
        if (acquired && value === 'released') {
          observer.disconnect()
          resolve(performance.now() - started)
        }
      })
      observer.observe(root, { attributes: true, attributeFilter: ['data-scroll-hold'] })
      window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
    })
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    return {
      durationMs,
      acquired,
      repeated: root?.getAttribute('data-scroll-hold') === 'active',
      scrollY,
    }
  })
  await context.close()
  return { run: index, ...result }
}

const holdRuns = []
for (let index = 1; index <= 3; index += 1) holdRuns.push(await measureHold(index))

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
    method: 'Three independent fresh browser contexts. Each run starts after network idle and scene readiness, dispatches one downward wheel intent, and records the complete unaccelerated 6.5 second timeline.',
  },
  initialScrollHold: {
    runs: holdRuns,
    method: 'Three fresh contexts measure DOM acquisition-to-release on the independent real-time deadline, then send a second intent to verify the hold does not reacquire.',
  },
}

await fs.mkdir(path.resolve('evidence/permanent-frame/review'), { recursive: true })
await fs.writeFile(path.resolve('evidence/permanent-frame/review/motion-measurements.json'), `${JSON.stringify(result, null, 2)}\n`)
await browser.close()
console.log(JSON.stringify(result, null, 2))
