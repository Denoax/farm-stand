import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/market-expansion/review')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'project Playwright Chromium',
  pacing: 'Real 6.2 second opening timeline and normal-speed delivered animal clips; no recording-time acceleration.',
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  expectedMediaCancellations: [],
  captures: [],
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
}

async function recordJourney(label, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(viewport.width < 600 ? { hasTouch: true, isMobile: true } : {}),
    recordVideo: { dir: evidenceDir, size: viewport },
  })
  const page = await context.newPage()
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const failure = { label, url: request.url(), error: request.failure()?.errorText ?? 'unknown' }
    if (failure.error === 'net::ERR_ABORTED' && /\.mp4(?:$|\?)/.test(failure.url)) report.expectedMediaCancellations.push(failure)
    else report.requestFailures.push(failure)
  })

  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  await screenshot(page, `${label}-opening-before.png`)
  await page.getByRole('button', { name: 'Open the stand' }).click()
  await page.waitForTimeout(4600)
  await screenshot(page, `${label}-opening-threshold.png`)
  await page.locator('.hero-stage').waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('.hero-stage')?.getAttribute('data-opening-state') === 'open', undefined, { timeout: 9000 })
  await screenshot(page, `${label}-opening-after.png`)

  await page.getByRole('navigation', { name: /straight to/i }).getByRole('link', { name: 'Shop' }).click()
  await page.getByRole('heading', { name: 'Shop the stand.' }).waitFor()
  await screenshot(page, `${label}-market-picks.png`)
  await page.getByRole('button', { name: /^Fruit & veg 28/ }).click()
  await page.getByRole('button', { name: 'Fruit 16' }).click()
  await page.getByLabel('Search the market').fill('currants')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Clear and show market picks' }).click()
  await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /^All 48/ }).click()
  const shirt = page.locator('#product-farm-tee')
  await shirt.getByLabel('Size').selectOption('s')
  await shirt.getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /Open demonstration basket, 2 items/ }).click()
  await page.waitForTimeout(450)
  await screenshot(page, `${label}-basket-variants.png`)
  await page.getByRole('button', { name: 'Close basket' }).click()

  for (const scene of ['hens', 'cattle', 'sheep']) {
    await page.locator(`#${scene}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(2100)
    await screenshot(page, `${label}-${scene}.png`)
  }

  const video = page.video()
  await context.close()
  if (video) {
    const destination = path.join(evidenceDir, `${label}-visitor-paced.webm`)
    await fs.rename(await video.path(), destination)
    report.captures.push(path.basename(destination))
  }
}

await recordJourney('desktop-1440x900', { width: 1440, height: 900 })
await recordJourney('portrait-390x844', { width: 390, height: 844 })

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
