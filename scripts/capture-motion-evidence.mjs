import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'project Playwright Chromium',
  cadence: '25 ms programmed scroll steps and real configured animation durations; video capture overhead excluded from timing claims',
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  captures: [],
}

async function contextWithPage(viewport, recordName) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(viewport.width < 600 ? { hasTouch: true, isMobile: true } : {}),
    recordVideo: { dir: evidenceDir, size: viewport },
  })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => report.pageErrors.push(error.message))
  page.on('requestfailed', (request) => report.requestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }))
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  return { context, page, recordName }
}

async function closeRecorded({ context, page, recordName }) {
  const video = page.video()
  await context.close()
  if (!video) return
  const source = await video.path()
  const destination = path.join(evidenceDir, recordName)
  await fs.rename(source, destination)
  report.captures.push(recordName)
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
}

async function scrollStage(page, from, to, steps = 36) {
  const travel = await page.locator('.hero-stage').evaluate((node) => node.offsetHeight - innerHeight)
  for (let index = 0; index <= steps; index += 1) {
    const progress = from + (to - from) * (index / steps)
    await page.evaluate((top) => window.scrollTo(0, top), travel * progress)
    await page.waitForTimeout(25)
  }
}

{
  const session = await contextWithPage({ width: 1440, height: 900 }, 'v2.2-hero-handoff-desktop.webm')
  await scrollStage(session.page, 0, 0.72)
  await screenshot(session.page, 'v2.2-desktop-handoff-mid.png')
  await scrollStage(session.page, 0.72, 0.97, 18)
  await screenshot(session.page, 'v2.2-desktop-handoff-arrival.png')
  await scrollStage(session.page, 0.97, 0.38, 28)
  await session.page.waitForTimeout(250)
  await closeRecorded(session)
}

{
  const session = await contextWithPage({ width: 390, height: 844 }, 'v2.2-interactions-portrait.webm')
  await session.page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  const apple = session.page.locator('#product-apple')
  await apple.getByRole('button', { name: 'View details' }).tap()
  await session.page.waitForTimeout(650)
  await screenshot(session.page, 'v2.2-portrait-product-detail.png')
  await session.page.getByRole('dialog', { name: 'Orchard apples' }).getByRole('button', { name: 'Add to basket' }).tap()
  await session.page.waitForTimeout(450)
  await session.page.getByRole('button', { name: 'Close product details' }).tap()
  await session.page.waitForTimeout(430)
  await session.page.getByRole('button', { name: 'Farm goods' }).tap()
  await session.page.waitForTimeout(320)
  await session.page.getByRole('button', { name: 'All' }).tap()
  await session.page.waitForTimeout(320)
  const dismissFeedback = session.page.getByRole('button', { name: 'Dismiss basket update' })
  if (await dismissFeedback.isVisible()) await dismissFeedback.tap()
  await session.page.locator('#farm-life').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }))
  await session.page.waitForTimeout(800)
  await session.page.getByRole('tab', { name: 'Cattle' }).tap()
  await session.page.waitForTimeout(700)
  await session.page.getByRole('tab', { name: 'Sheep' }).tap()
  await session.page.waitForTimeout(700)
  await screenshot(session.page, 'v2.2-portrait-farm-life.png')
  await closeRecorded(session)
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await screenshot(page, 'v2.2-desktop-farm-life.png')
  await context.close()
}

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime-v2.2.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
