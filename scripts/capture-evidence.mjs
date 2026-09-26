import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = { consoleErrors: [], pageErrors: [], captures: [] }

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
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  return { context, page }
}

async function shot(page, filename, fullPage = false) {
  const target = path.join(evidenceDir, filename)
  await page.screenshot({ path: target, fullPage })
  report.captures.push(filename)
}

{
  const { context, page } = await openPage({ width: 1440, height: 960 })
  await shot(page, 'desktop-hero.png')
  await page.locator('.scene-visual').screenshot({ path: path.join(evidenceDir, 'poster-desktop-source.png') })
  const stageHeight = await page.locator('.hero-stage').evaluate((node) => node.offsetHeight)
  await page.evaluate((y) => window.scrollTo(0, y), (stageHeight - 960) * 0.56)
  await page.waitForTimeout(350)
  await shot(page, 'desktop-transition.png')
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.waitForTimeout(350)
  await page.getByText('Yellow onions', { exact: true }).click()
  await page.getByLabel('Example quantity').fill('3')
  await page.getByRole('button', { name: 'Pickup request preview' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'desktop-pickup.png')
  await page.locator('#service').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await shot(page, 'desktop-service.png')
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await page.getByLabel('What should your website make easier?').fill('Keep our opening information current and make seasonal produce easy to browse.')
  await shot(page, 'desktop-contact.png')
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.route('**/models/**', (route) => route.abort())
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--fallback')
  await shot(page, 'desktop-fallback.png')
  await context.close()
}

{
  const { context, page } = await openPage({ width: 390, height: 844 })
  await shot(page, 'portrait-hero.png')
  await page.locator('.scene-visual').screenshot({ path: path.join(evidenceDir, 'poster-portrait-source.png') })
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.waitForTimeout(350)
  await shot(page, 'portrait-demo.png')
  await context.close()
}

{
  const { context, page } = await openPage({ width: 320, height: 740 })
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.waitForTimeout(250)
  await shot(page, 'narrow-demo.png')
  await context.close()
}

{
  const { context, page } = await openPage({ width: 1440, height: 960 }, 'reduce')
  await shot(page, 'reduced-motion.png', true)
  await context.close()
}

{
  const { context, page } = await openPage({ width: 960, height: 720 }, 'no-preference', true)
  const scrollEnd = await page.locator('#demo').evaluate((node) => node.getBoundingClientRect().top + window.scrollY)
  for (let step = 0; step <= 50; step += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollEnd * (step / 50))
    await page.waitForTimeout(20)
  }
  await page.getByText('Yellow onions', { exact: true }).click()
  await page.waitForTimeout(350)
  for (let step = 50; step >= 0; step -= 1) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollEnd * (step / 50))
    await page.waitForTimeout(20)
  }
  const video = page.video()
  await context.close()
  if (video) {
    const original = await video.path()
    await fs.rename(original, path.join(evidenceDir, 'stand-to-shop-forward-reverse.webm'))
  }
}

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length) process.exitCode = 1
