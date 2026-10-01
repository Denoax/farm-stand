import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const reviewDir = path.resolve('evidence/animal-album/review')
const rawVideoDir = path.join(reviewDir, 'raw-video')
await fs.mkdir(rawVideoDir, { recursive: true })

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, captures: [], consoleErrors: [], pageErrors: [], requestFailures: [] }

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText ?? ''
    if (!error.includes('ERR_ABORTED')) report.requestFailures.push({ label, url: request.url(), error })
  })
}

async function shot(page, name, options = {}) {
  await page.screenshot({ path: path.join(reviewDir, name), ...options })
  report.captures.push(name)
}

async function captureBoard(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, label)
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.farm-album')
  await page.waitForTimeout(800)
  await page.locator('.farm-album').screenshot({ path: path.join(reviewDir, `${label}-album-board.png`) })
  report.captures.push(`${label}-album-board.png`)
  for (const id of ['hens', 'cattle', 'sheep']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(450)
    await shot(page, `${label}-${id}.png`)
  }
  await context.close()
}

async function recordDesktopJourney() {
  const viewport = { width: 1440, height: 900 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: rawVideoDir, size: viewport } })
  await context.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: { apple: 2, 'farm-tee:m': 1 } }))
  })
  const page = await context.newPage()
  observe(page, 'desktop-journey')
  await page.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
  await page.locator('.entrance-links [data-animal-sound="hens"]').click()
  await page.waitForSelector('body > #root > div[data-handoff-kind="animals"]')
  await page.waitForURL(/#hens$/, { timeout: 12_000 })
  await page.locator('.video-handoff').waitFor({ state: 'detached', timeout: 12_000 })
  await page.waitForTimeout(900)
  const hens = page.locator('#hens')
  const pause = hens.getByRole('button', { name: 'Hens: Pause film' })
  if (await pause.isVisible()) {
    await pause.click()
    await page.waitForTimeout(700)
    await hens.getByRole('button', { name: 'Hens: Play film' }).click()
  }
  await page.waitForTimeout(1100)
  const albumNav = page.getByRole('navigation', { name: 'Farm-life scenes', exact: true })
  await albumNav.getByRole('link', { name: 'Cattle' }).click()
  await page.waitForTimeout(1900)
  await page.locator('#cattle').getByRole('button', { name: 'Hear the cattle' }).click()
  await page.waitForTimeout(900)
  await albumNav.getByRole('link', { name: 'Sheep' }).click()
  await page.waitForTimeout(900)
  await page.locator('#sheep').waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('#sheep')?.getAttribute('data-media-state') === 'ended', undefined, { timeout: 13_000 })
  await page.locator('#sheep').getByRole('button', { name: 'Sheep: Replay film' }).click()
  await page.waitForTimeout(1300)
  await albumNav.getByRole('link', { name: 'Hens' }).click()
  await page.waitForTimeout(900)
  await page.locator('#hens').getByRole('link', { name: 'View eggs' }).click()
  await page.waitForTimeout(1300)
  const basketCount = await page.locator('.floating-basket strong').textContent()
  const finalHash = await page.evaluate(() => location.hash)
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Desktop journey video was not created.')
  const destination = path.join(reviewDir, 'desktop-1440x900-normal-speed-journey.webm')
  await fs.rm(destination, { force: true })
  await fs.rename(await video.path(), destination)
  report.captures.push('desktop-1440x900-normal-speed-journey.webm')
  report.desktopJourney = { basketCount, finalHash }
}

async function recordPhoneJourney() {
  const viewport = { width: 390, height: 844 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: rawVideoDir, size: viewport } })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, 'phone-journey')
  await page.goto(`${baseURL}#farm-life`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const albumNav = page.getByRole('navigation', { name: 'Farm-life scenes', exact: true })
  for (const id of ['Hens', 'Cattle', 'Sheep']) {
    await albumNav.getByRole('link', { name: id }).click()
    await page.waitForTimeout(1800)
  }
  const sheep = page.locator('#sheep')
  const pause = sheep.getByRole('button', { name: 'Sheep: Pause film' })
  if (await pause.isVisible()) {
    await pause.click()
    await page.waitForTimeout(650)
    await sheep.getByRole('button', { name: 'Sheep: Play film' }).click()
  }
  await page.waitForTimeout(1200)
  const video = page.video()
  await context.close()
  if (!video) throw new Error('Phone journey video was not created.')
  const destination = path.join(reviewDir, 'portrait-390x844-normal-speed-journey.webm')
  await fs.rm(destination, { force: true })
  await fs.rename(await video.path(), destination)
  report.captures.push('portrait-390x844-normal-speed-journey.webm')
}

async function captureSpecialViews() {
  for (const [label, viewport] of [
    ['wide-1920x900', { width: 1920, height: 900 }],
    ['wide-2560x1080', { width: 2560, height: 1080 }],
    ['short-960x540', { width: 960, height: 540 }],
    ['narrow-320x740', { width: 320, height: 740 }],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    observe(page, label)
    await page.goto(`${baseURL}#cattle`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await shot(page, `${label}-cattle.png`)
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  observe(page, 'text-200')
  await page.goto(`${baseURL}#hens`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '.farm-album { font-size: 200% !important; }' })
  await page.locator('#hens').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await shot(page, 'portrait-390x844-album-text-200.png')
  report.text200AlbumOverflow = await page.locator('.farm-album').evaluate((album) => album.scrollWidth - album.clientWidth)
  await context.close()
}

await captureBoard('desktop-1440x900', { width: 1440, height: 900 })
await captureBoard('portrait-390x844', { width: 390, height: 844 })
await captureSpecialViews()
await recordDesktopJourney()
await recordPhoneJourney()
await browser.close()
await fs.rm(rawVideoDir, { recursive: true, force: true })
await fs.writeFile(path.join(reviewDir, 'visual-capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length || report.text200AlbumOverflow > 1) process.exitCode = 1
