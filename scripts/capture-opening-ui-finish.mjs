import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/opening-ui-finish/review')
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'Project Playwright Chromium',
  pacing: 'The opening recordings use the complete normal-speed 6.5 second application clock and one initial downward intent.',
  consoleErrors: [],
  expectedConsoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  expectedRequestFailures: [],
  expectedMediaCancellations: [],
  captures: [],
}

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const error = { label, message: message.text() }
    if (label === 'model-failure' && /ERR_FAILED/.test(error.message)) report.expectedConsoleErrors.push(error)
    else report.consoleErrors.push(error)
  })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const failure = { label, url: request.url(), error: request.failure()?.errorText ?? 'unknown' }
    if (/\.mp4(?:$|\?)/.test(failure.url) && failure.error === 'net::ERR_ABORTED') report.expectedMediaCancellations.push(failure)
    else if (label === 'model-failure' && /\/models\//.test(failure.url)) report.expectedRequestFailures.push(failure)
    else report.requestFailures.push(failure)
  })
}

async function screenshot(page, name, options = {}) {
  await page.screenshot({ path: path.join(evidenceDir, name), ...options })
  report.captures.push(name)
}

async function waitForProgress(page, target) {
  await page.waitForFunction((value) => Number(document.querySelector('.hero-stage')?.getAttribute('data-requested-progress')) >= value, target, { timeout: 9000, polling: 'raf' })
}

async function retainVideo(context, page, name) {
  const video = page.video()
  await context.close()
  if (!video) return
  const destination = path.join(evidenceDir, name)
  await fs.rename(await video.path(), destination)
  report.captures.push(name)
}

async function recordOpening(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: evidenceDir, size: viewport } })
  const page = await context.newPage()
  observe(page, `${label}-opening`)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await screenshot(page, `${label}-01-initial.png`)
  await screenshot(page, `${label}-02-shadow-close-up.png`, {
    clip: viewport.width < 600
      ? { x: 60, y: viewport.height - 250, width: viewport.width - 120, height: 220 }
      : { x: 110, y: viewport.height - 280, width: 470, height: 250 },
  })
  await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await waitForProgress(page, .49)
  await screenshot(page, `${label}-03-shutter-open.png`)
  await waitForProgress(page, .625)
  await screenshot(page, `${label}-04-apple-left-exit.png`)
  await waitForProgress(page, .7)
  await screenshot(page, `${label}-05-table-bottom-exit.png`)
  await waitForProgress(page, .8)
  await screenshot(page, `${label}-06-open-rest.png`)
  await waitForProgress(page, .95)
  await screenshot(page, `${label}-07-copy-photos-return.png`)
  await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 9000 })
  await page.waitForTimeout(5000)
  await screenshot(page, `${label}-08-five-second-stable.png`)
  await retainVideo(context, page, `${label}-opening-normal-speed.webm`)
}

async function captureReturnAndRefresh(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  observe(page, `${label}-return-refresh`)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 9000 })
  await page.locator('#shop').scrollIntoViewIfNeeded()
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(250)
  await screenshot(page, `${label}-09-leave-return-remains-open.png`)
  await page.reload({ waitUntil: 'networkidle' })
  await screenshot(page, `${label}-10-refresh-remains-open.png`)
  await context.close()
}

async function recordBasket(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: evidenceDir, size: viewport } })
  const page = await context.newPage()
  observe(page, `${label}-basket`)
  await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /^All 48/ }).click()
  const shirt = page.locator('#product-farm-tee')
  await shirt.getByLabel('Size').selectOption('s')
  await shirt.getByRole('button', { name: 'Add to basket' }).click()
  await shirt.getByLabel('Size').selectOption('m')
  await shirt.getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /Open demonstration basket, 3 items/ }).click()
  await page.waitForTimeout(450)
  await screenshot(page, `${label}-basket-produce-two-sizes.png`)
  const dialog = page.getByRole('dialog', { name: /Your basket/ })
  await dialog.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await dialog.locator('.basket-lines li').filter({ hasText: 'Size: Small' }).getByRole('button', { name: 'Remove' }).click()
  await dialog.getByRole('button', { name: 'Undo' }).click()
  await dialog.getByRole('button', { name: 'Preview collection' }).click()
  await dialog.getByRole('button', { name: 'Save this preview' }).click()
  await screenshot(page, `${label}-basket-preview-result.png`)
  await dialog.getByRole('button', { name: 'Close basket' }).click()

  const lines = { apple: 1, 'farm-tee:s': 1, 'farm-tee:m': 12, 'fruit-box': 2, 'pickled-cucumbers': 3, watermelon: 1, eggs: 4 }
  await page.evaluate((value) => sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: value })), lines)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Open demonstration basket, 24 items/ }).first().click()
  await page.waitForTimeout(450)
  await screenshot(page, `${label}-basket-dense-max.png`)
  await retainVideo(context, page, `${label}-basket-normal-speed.webm`)
}

await recordOpening('desktop-1440x900', { width: 1440, height: 900 })
await recordOpening('portrait-390x844', { width: 390, height: 844 })
await captureReturnAndRefresh('desktop-1440x900', { width: 1440, height: 900 })
await captureReturnAndRefresh('portrait-390x844', { width: 390, height: 844 })
await recordBasket('desktop-1440x900', { width: 1440, height: 900 })
await recordBasket('portrait-390x844', { width: 390, height: 844 })

for (const deviceScaleFactor of [1, 2]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor })
  const page = await context.newPage()
  observe(page, `header-dpr-${deviceScaleFactor}`)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await screenshot(page, `header-native-dpr-${deviceScaleFactor}.png`, { clip: { x: 0, y: 0, width: 1440, height: 100 } })
  if (deviceScaleFactor === 1) {
    const specimen = await page.evaluateHandle(() => {
      const panel = document.createElement('div')
      panel.style.cssText = 'position:fixed;inset:110px auto auto 24px;z-index:1000;display:grid;grid-template-columns:repeat(2,220px);background:#fffdf7;color:#65752a;font:600 16px sans-serif'
      for (const [surface, colour] of [['light', '#65752a'], ['dark', '#fffdf7']]) {
        const group = document.createElement('div')
        group.style.cssText = `display:flex;align-items:end;gap:24px;padding:24px;color:${colour};background:${surface === 'dark' ? '#173c32' : '#fffdf7'}`
        for (const size of [16, 32, 44]) {
          const mark = document.querySelector('.logo-mark').cloneNode(true)
          mark.style.width = `${size}px`
          mark.style.height = `${size}px`
          group.append(mark)
        }
        panel.append(group)
      }
      document.body.append(panel)
      return panel
    })
    await specimen.asElement().screenshot({ path: path.join(evidenceDir, 'logo-16-32-44-light-dark.png') })
    report.captures.push('logo-16-32-44-light-dark.png')
  }
  await context.close()
}

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const reducedPage = await reducedContext.newPage()
observe(reducedPage, 'reduced-motion')
await reducedPage.goto(baseURL, { waitUntil: 'networkidle' })
await screenshot(reducedPage, 'reduced-motion-portrait.png')
await reducedContext.close()

const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const failurePage = await failureContext.newPage()
observe(failurePage, 'model-failure')
await failurePage.route('**/models/**', (route) => route.abort())
await failurePage.goto(baseURL, { waitUntil: 'networkidle' })
await screenshot(failurePage, 'model-failure-desktop.png')
await failureContext.close()

const delayedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const delayedPage = await delayedContext.newPage()
observe(delayedPage, 'delayed-model')
await delayedPage.route('**/models/**/*.gltf', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1800))
  await route.continue()
})
await delayedPage.goto(baseURL, { waitUntil: 'domcontentloaded' })
await delayedPage.waitForTimeout(350)
await screenshot(delayedPage, 'delayed-model-first-paint-desktop.png')
await delayedPage.waitForSelector('.hero-stage--ready', { timeout: 6000 })
await screenshot(delayedPage, 'delayed-model-ready-desktop.png')
await delayedContext.close()

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
