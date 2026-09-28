import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve('evidence/brighter-stage/review')
const sourceDir = path.resolve('evidence/brighter-stage/poster-source')
await fs.mkdir(evidenceDir, { recursive: true })
await fs.mkdir(sourceDir, { recursive: true })

const report = { capturedAt: new Date().toISOString(), baseURL, captures: [], consoleErrors: [], pageErrors: [], requestFailures: [] }
const browser = await chromium.launch()

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() }) })
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: error.message }))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown'
    if (/\.mp4(?:$|\?)/.test(request.url()) && failure === 'net::ERR_ABORTED') return
    report.requestFailures.push({ label, url: request.url(), failure })
  })
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name) })
  report.captures.push(name)
}

async function recordFlow(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: evidenceDir, size: viewport } })
  const page = await context.newPage()
  observe(page, label)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await shot(page, `${label}-01-closed.png`)
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await page.waitForSelector('.hero-stage[data-opening-state="open"]', { timeout: 10_000 })
  await page.waitForTimeout(350)
  await shot(page, `${label}-02-open.png`)
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 500 })))
  await page.waitForSelector('[data-leaf-state="entering"]')
  await page.waitForTimeout(260)
  await shot(page, `${label}-03-leaves-entering.png`)
  await page.waitForSelector('[data-leaf-state="covered"]')
  await shot(page, `${label}-04-leaves-covered-start.png`)
  await page.waitForTimeout(700)
  await shot(page, `${label}-05-leaves-covered-hold.png`)
  await page.waitForSelector('[data-leaf-state="clearing"]')
  await page.waitForTimeout(280)
  await shot(page, `${label}-06-leaves-clearing.png`)
  await page.waitForSelector('[data-leaf-state="complete"]')
  await page.waitForTimeout(250)
  await shot(page, `${label}-07-shop-arrival.png`)
  await page.getByRole('button', { name: /Open basket preview/ }).click()
  await page.waitForTimeout(220)
  await shot(page, `${label}-08-mini-basket.png`)
  const video = page.video()
  await context.close()
  if (video) {
    const destination = path.join(evidenceDir, `${label}-opening-normal-speed.webm`)
    await fs.rename(await video.path(), destination)
    report.captures.push(path.basename(destination))
  }
}

async function captureOpen(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  observe(page, label)
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.waitForTimeout(300)
  await shot(page, `${label}.png`)
  await context.close()
}

async function capturePoster(name, viewport, settled) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  if (settled) await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.addStyleTag({ content: '.site-header,.hero-copy,.entrance-links,.market-opening__progress,.scroll-cue,.scene-status,.floating-basket,.scene-vignette{display:none!important}' })
  await page.waitForTimeout(300)
  const output = path.join(sourceDir, `${name}.png`)
  await page.screenshot({ path: output })
  await context.close()
  return output
}

await recordFlow('desktop-1440x900', { width: 1440, height: 900 })
await recordFlow('portrait-390x844', { width: 390, height: 844 })
await captureOpen('widescreen-1920x1080-final', { width: 1920, height: 1080 })
await captureOpen('widescreen-2560x1440-final', { width: 2560, height: 1440 })

const posterDesktop = await capturePoster('market-opening-poster-desktop', { width: 1536, height: 1024 }, false)
const posterPortrait = await capturePoster('market-opening-poster-portrait', { width: 640, height: 960 }, false)
const settledDesktop = await capturePoster('market-opening-settled-desktop', { width: 1536, height: 1024 }, true)
const settledPortrait = await capturePoster('market-opening-settled-portrait', { width: 640, height: 960 }, true)
const social = await capturePoster('farm-stand-social', { width: 1200, height: 630 }, true)

await browser.close()

for (const [source, target] of [
  [posterDesktop, 'public/media/market-opening-poster-desktop.avif'],
  [posterPortrait, 'public/media/market-opening-poster-portrait.avif'],
  [settledDesktop, 'public/media/market-opening-settled-desktop.avif'],
  [settledPortrait, 'public/media/market-opening-settled-portrait.avif'],
]) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-c:v', 'libaom-av1', '-crf', '30', '-cpu-used', '6', '-still-picture', '1', target])
}
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', social, '-q:v', '3', 'public/media/farm-stand-social.jpg'])
await fs.writeFile(path.join(evidenceDir, 'capture-runtime.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) process.exitCode = 1
