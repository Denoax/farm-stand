import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.goto(baseURL, { waitUntil: 'networkidle' })
await page.waitForSelector('.hero-stage--ready')
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })

const hero = await page.evaluate(async () => {
  const stage = document.querySelector('.hero-stage')
  const travel = stage.offsetHeight - innerHeight
  const traverse = async (from, to, steps) => {
    const intervals = []
    let previous = performance.now()
    for (let index = 0; index <= steps; index += 1) {
      scrollTo(0, travel * (from + (to - from) * index / steps))
      await new Promise((resolve) => requestAnimationFrame((now) => {
        intervals.push(now - previous)
        previous = now
        resolve()
      }))
    }
    intervals.shift()
    return intervals
  }

  const summarize = (intervals) => {
    const ordered = [...intervals].sort((a, b) => a - b)
    return {
      samples: intervals.length,
      medianFrameIntervalMs: ordered[Math.floor(ordered.length * 0.5)],
      p95FrameIntervalMs: ordered[Math.floor(ordered.length * 0.95)],
      maxFrameIntervalMs: ordered.at(-1),
    }
  }

  await traverse(0, 1, 24)
  await traverse(1, 0, 24)
  const runs = []
  for (let index = 0; index < 3; index += 1) {
    const forward = await traverse(0, 1, 48)
    runs.push(summarize(forward))
    await traverse(1, 0, 24)
  }
  return {
    runs,
    note: 'Three measured forward traversals after one unreported forward/reverse warm-up; each run contains 48 requestAnimationFrame intervals.',
  }
})

await page.locator('#shop').scrollIntoViewIfNeeded()
const detailTrigger = page.locator('#product-apple').getByRole('button', { name: 'View details' })
await page.locator('#product-apple').evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
const detailOpenMs = await detailTrigger.evaluate((button) => new Promise((resolve) => {
  const started = performance.now()
  let sawClone = false
  const observer = new MutationObserver(() => {
    if (document.querySelector('.product-transition-clone')) sawClone = true
    else if (sawClone) {
      observer.disconnect()
      resolve(performance.now() - started)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  button.click()
}))
const detailCloseMs = await page.getByRole('button', { name: 'Close product details' }).evaluate((button) => new Promise((resolve) => {
  const dialog = button.closest('dialog')
  const started = performance.now()
  dialog.addEventListener('close', () => resolve(performance.now() - started), { once: true })
  button.click()
}))

const result = {
  measuredAt: new Date().toISOString(),
  source: {
    baseURL,
    viewport: '1440x900 CSS px',
    devicePixelRatio: 1,
    browser: 'project Playwright Chromium',
    limitation: 'Headless Chromium uses software rendering in this environment; frame intervals are end-to-end requestAnimationFrame cadence, not GPU timings or physical-device evidence.',
  },
  hero,
  detail: { openObservedMs: detailOpenMs, closeObservedMs: detailCloseMs },
}

await fs.mkdir(path.resolve('evidence'), { recursive: true })
await fs.writeFile(path.resolve('evidence/motion-measurements-v2.2.json'), `${JSON.stringify(result, null, 2)}\n`)
await context.close()
await browser.close()
console.log(JSON.stringify(result, null, 2))
