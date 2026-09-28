import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/brighter-stage/review')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, captures: [], consoleErrors: [], pageErrors: [] }

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('ERR_FAILED')) report.consoleErrors.push({ label, message: message.text() })
  })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
}

async function captureLoadingPoster() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  observe(page, 'loading-poster')
  await page.route('**/models/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
    await route.continue()
  })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.hero-stage[data-opening-state="waiting"]')
  await page.waitForTimeout(250)
  const target = path.join(evidenceDir, 'loading-first-paint-poster.png')
  await page.screenshot({ path: target })
  report.captures.push(path.basename(target))
  await context.close()
}

async function captureReducedMotion() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  observe(page, 'reduced-motion')
  await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Open basket preview/ }).waitFor()
  const target = path.join(evidenceDir, 'reduced-motion-direct-shop-portrait.png')
  await page.screenshot({ path: target })
  report.captures.push(path.basename(target))
  await context.close()
}

async function captureSceneFailure() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  observe(page, 'scene-failure')
  await page.route('**/models/**', (route) => route.abort())
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage[data-opening-state="fallback"]')
  await page.getByRole('button', { name: /Open basket preview/ }).waitFor()
  const target = path.join(evidenceDir, 'scene-failure-static-fallback.png')
  await page.screenshot({ path: target })
  report.captures.push(path.basename(target))
  await context.close()
}

await captureLoadingPoster()
await captureReducedMotion()
await captureSceneFailure()
await browser.close()

await fs.writeFile(path.join(evidenceDir, 'safeguard-capture.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length) process.exitCode = 1
