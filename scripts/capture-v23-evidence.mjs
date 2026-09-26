import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173/farm-stand/'
const evidenceDir = path.resolve('evidence/v2.3')
await fs.mkdir(evidenceDir, { recursive: true })
const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, consoleErrors: [], pageErrors: [], requestFailures: [], captures: [] }

async function session(viewport, videoName) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...(viewport.width < 600 ? { hasTouch: true, isMobile: true } : {}), recordVideo: { dir: evidenceDir, size: viewport } })
  const page = await context.newPage()
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => report.pageErrors.push(error.message))
  page.on('requestfailed', (request) => report.requestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }))
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  return { context, page, videoName }
}

async function close({ context, page, videoName }) {
  const video = page.video()
  await context.close()
  if (!video) return
  await fs.rename(await video.path(), path.join(evidenceDir, videoName))
  report.captures.push(videoName)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
}

async function smoothScroll(page, target, steps = 45) {
  const start = await page.evaluate(() => scrollY)
  for (let index = 1; index <= steps; index += 1) {
    await page.evaluate((y) => scrollTo(0, y), start + (target - start) * index / steps)
    await page.waitForTimeout(24)
  }
}

{
  const current = await session({ width: 1440, height: 900 }, 'v2.3-full-journey-desktop.webm')
  const travel = await current.page.locator('.hero-stage').evaluate((node) => node.offsetHeight - innerHeight)
  for (const [progress, name] of [[.25, 'harvest-release'], [.52, 'harvest-fall'], [.68, 'basket-occlusion'], [.9, 'stand-resolution']]) {
    await smoothScroll(current.page, travel * progress, 18)
    await shot(current.page, `${name}-desktop.png`)
  }
  await current.page.locator('#shop').scrollIntoViewIfNeeded()
  await current.page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await current.page.locator('#product-eggs').getByRole('button', { name: 'Add to basket' }).click()
  await current.page.getByRole('button', { name: /Open demonstration basket/ }).click()
  await current.page.waitForTimeout(450)
  await shot(current.page, 'basket-drawer-desktop.png')
  await current.page.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await current.page.getByRole('button', { name: 'Close basket' }).click()
  const desktopFeedback = current.page.getByRole('button', { name: 'Dismiss basket update' })
  if (await desktopFeedback.isVisible()) await desktopFeedback.click()
  for (const selector of ['.weather-story', '#hens', '#cattle', '#sheep']) {
    const top = await current.page.locator(selector).evaluate((node) => node.offsetTop + (node.offsetHeight - innerHeight) * .55)
    await smoothScroll(current.page, top, 36)
    await shot(current.page, `${selector.replace(/[.#]/g, '')}-desktop.png`)
  }
  await close(current)
}

{
  const current = await session({ width: 390, height: 844 }, 'v2.3-full-journey-portrait.webm')
  const travel = await current.page.locator('.hero-stage').evaluate((node) => node.offsetHeight - innerHeight)
  await smoothScroll(current.page, travel * .62, 28)
  await shot(current.page, 'harvest-basket-portrait.png')
  await current.page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  await current.page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).tap()
  await current.page.getByRole('button', { name: /Open demonstration basket/ }).tap()
  await current.page.waitForTimeout(450)
  await shot(current.page, 'basket-drawer-portrait.png')
  await current.page.getByRole('button', { name: 'Close basket' }).tap()
  const portraitFeedback = current.page.getByRole('button', { name: 'Dismiss basket update' })
  if (await portraitFeedback.isVisible()) await portraitFeedback.tap()
  await current.page.locator('#sheep').scrollIntoViewIfNeeded()
  await shot(current.page, 'sheep-portrait.png')
  await close(current)
}

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
