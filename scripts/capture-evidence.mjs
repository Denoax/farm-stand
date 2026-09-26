import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, consoleErrors: [], pageErrors: [], requestFailures: [], captures: [] }

async function openPage(viewport, reducedMotion = 'no-preference', recordVideo = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion,
    ...(recordVideo ? { recordVideo: { dir: evidenceDir, size: viewport } } : {}),
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
  return { context, page }
}

async function shot(page, filename, locator) {
  const target = path.join(evidenceDir, filename)
  if (locator) await locator.screenshot({ path: target })
  else await page.screenshot({ path: target })
  report.captures.push(filename)
}

async function reveal(page, selector) {
  await page.locator(selector).evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }))
  await page.waitForTimeout(300)
}

{
  const { context, page } = await openPage({ width: 1440, height: 960 })
  await shot(page, 'v2-desktop-hero.png')
  const cleanSceneStyle = await page.addStyleTag({ content: '.site-header, .hero-copy, .stand-transition, .scroll-cue { visibility: hidden !important; }' })
  await page.screenshot({ path: path.join(evidenceDir, 'v2-clean-hero-scene.png') })
  await cleanSceneStyle.evaluate((node) => node.remove())

  const transitionY = await page.locator('.hero-stage').evaluate((node) => (node.offsetHeight - innerHeight) * 0.82)
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), transitionY)
  await page.waitForTimeout(400)
  await shot(page, 'v2-desktop-transition.png')

  await reveal(page, '#shop')
  await shot(page, 'v2-desktop-shop.png')
  await page.locator('#product-eggs').getByRole('button', { name: 'View details' }).click()
  await page.locator('.product-dialog img').evaluate(async (image) => {
    if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))
    await image.decode()
  })
  await shot(page, 'v2-desktop-product-detail.png')
  await page.getByRole('button', { name: 'Close product details' }).click()
  await page.locator('#product-eggs').getByRole('button', { name: 'Add to basket' }).click()
  await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /Basket/ }).click()
  await shot(page, 'v2-desktop-basket.png')
  await page.getByRole('button', { name: 'Preview collection options' }).click()
  await shot(page, 'v2-desktop-collection.png')
  await page.getByRole('button', { name: 'Close basket' }).click()

  await reveal(page, '#farm-life')
  await shot(page, 'v2-desktop-farm-life.png')
  await reveal(page, '#visit')
  await shot(page, 'v2-desktop-visit.png')
  await reveal(page, '#website')
  await shot(page, 'v2-desktop-service.png')
  await reveal(page, '#contact')
  await shot(page, 'v2-desktop-contact.png')
  await context.close()
}

{
  const { context, page } = await openPage({ width: 390, height: 844 })
  await shot(page, 'v2-portrait-hero.png')
  await reveal(page, '#shop')
  await shot(page, 'v2-portrait-shop.png')
  await page.locator('#product-carrots').getByRole('button', { name: 'Add to basket' }).click()
  await page.locator('#product-potatoes').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /Basket/ }).click()
  await shot(page, 'v2-portrait-basket.png')
  await page.getByRole('button', { name: 'Close basket' }).click()
  await reveal(page, '#farm-life')
  await shot(page, 'v2-portrait-farm-life.png')
  await context.close()
}

{
  const { context, page } = await openPage({ width: 1280, height: 800 }, 'reduce')
  await shot(page, 'v2-reduced-motion-flow.png', page.locator('.hero-stage'))
  await context.close()
}

{
  const { context, page } = await openPage({ width: 960, height: 720 }, 'no-preference', true)
  await page.locator('#shop').scrollIntoViewIfNeeded()
  await page.locator('#product-eggs').getByRole('button', { name: 'Add to basket' }).click()
  await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /Basket/ }).click()
  await page.getByRole('button', { name: 'Preview collection options' }).click()
  await page.getByRole('button', { name: 'Review this example' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Close basket' }).click()
  await page.locator('#farm-life').scrollIntoViewIfNeeded()
  await page.getByRole('tab', { name: 'Cattle' }).click()
  await page.waitForTimeout(500)
  await page.locator('#visit').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.locator('#website').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const video = page.video()
  await context.close()
  if (video) {
    const original = await video.path()
    await fs.rename(original, path.join(evidenceDir, 'v2-end-to-end.webm'))
    report.captures.push('v2-end-to-end.webm')
  }
}

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime-v2.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
