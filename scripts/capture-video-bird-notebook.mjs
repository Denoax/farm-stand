import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const evidenceDir = path.resolve(process.env.EVIDENCE_ROOT ?? 'evidence/video-bird/review')
const rawVideoDir = path.join(evidenceDir, 'motion/raw')
await fs.mkdir(rawVideoDir, { recursive: true })
await fs.mkdir(path.join(evidenceDir, 'layout'), { recursive: true })
await fs.mkdir(path.join(evidenceDir, 'transitions'), { recursive: true })
await fs.mkdir(path.join(evidenceDir, 'timber'), { recursive: true })

const browser = await chromium.launch()
const report = { capturedAt: new Date().toISOString(), baseURL, captures: [], geometry: [], transitions: [], errors: [] }

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push({ label, type: 'console', message: message.text() }) })
  page.on('pageerror', (error) => report.errors.push({ label, type: 'page', message: error.message }))
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText ?? ''
    if (!error.includes('ERR_ABORTED')) report.errors.push({ label, type: 'request', message: `${request.url()} :: ${error}` })
  })
}

async function armShop(page) {
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
  await page.waitForSelector('[data-opening-state="playing"]')
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-handoff-state="armed"]')
}

async function waitMediaTime(page, seconds) {
  await page.waitForFunction((target) => Number(document.querySelector('.video-handoff')?.getAttribute('data-media-time') ?? 0) >= target, seconds, { timeout: 7000 })
}

async function captureTransition({ kind, viewport, label, targets }) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: rawVideoDir, size: viewport } })
  const page = await context.newPage()
  observe(page, label)
  if (kind === 'shop') {
    await armShop(page)
    await page.getByRole('link', { name: 'Explore the demo' }).click()
  } else {
    await page.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
    await page.locator('.entrance-links [data-animal-sound="hens"]').click()
  }
  const originHash = await page.evaluate(() => location.hash)
  for (const seconds of targets) {
    await waitMediaTime(page, seconds)
    const time = Number(await page.locator('.video-handoff').getAttribute('data-media-time'))
    const coverTime = Number(await page.locator('.video-handoff').getAttribute('data-cover-time')) || null
    const state = await page.locator('body > #root > div').getAttribute('data-handoff-state')
    const hash = await page.evaluate(() => location.hash)
    const output = path.join(evidenceDir, 'transitions', `${label}-${seconds.toFixed(2)}s.png`)
    await page.screenshot({ path: output })
    report.captures.push(path.relative(evidenceDir, output))
    report.transitions.push({ label, requestedTime: seconds, capturedTime: time, coverTime, state, hash })
  }
  await page.waitForSelector('.video-handoff', { state: 'detached', timeout: 8000 })
  const final = await page.evaluate(() => ({ hash: location.hash, scrollY, focusedId: document.activeElement?.id }))
  const video = page.video()
  await context.close()
  if (!video) throw new Error(`No motion recording for ${label}`)
  const source = await video.path()
  const output = path.join(evidenceDir, 'motion', `${label}-normal-speed.webm`)
  await fs.copyFile(source, output)
  report.captures.push(path.relative(evidenceDir, output))
  report.transitions.push({ label, originHash, final })
}

for (const [width, height] of [[1440, 900], [1920, 1080], [2560, 1440], [390, 844], [320, 700]]) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  observe(page, `notebook-${width}`)
  await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  const notebook = page.locator('.market-notebook')
  const geometry = await notebook.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const tabs = [...element.querySelectorAll('.market-notebook__wood-tab')].map((tab) => {
      const bounds = tab.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
    })
    return { viewport: innerWidth, left: rect.left, right: innerWidth - rect.right, width: rect.width, bottom: rect.bottom, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, tabs }
  })
  report.geometry.push(geometry)
  const topPath = path.join(evidenceDir, 'layout', `notebook-${width}-top.png`)
  await page.screenshot({ path: topPath })
  report.captures.push(path.relative(evidenceDir, topPath))
  await notebook.evaluate((element) => scrollTo(0, element.getBoundingClientRect().bottom + scrollY - innerHeight + 12))
  const bottomPath = path.join(evidenceDir, 'layout', `notebook-${width}-bottom.png`)
  await page.screenshot({ path: bottomPath })
  report.captures.push(path.relative(evidenceDir, bottomPath))
  await context.close()
}

await captureTransition({ kind: 'shop', viewport: { width: 1440, height: 900 }, label: 'desktop-shop', targets: [.7, 1.7, 3.4, 3.65] })
await captureTransition({ kind: 'shop', viewport: { width: 390, height: 844 }, label: 'portrait-shop', targets: [.7, 1.7, 3.4, 3.65] })
await captureTransition({ kind: 'animals', viewport: { width: 1440, height: 900 }, label: 'desktop-animals', targets: [.45, 1.35, 1.9, 1.95] })

const timberContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const timberPage = await timberContext.newPage()
observe(timberPage, 'timber')
await timberPage.goto(`${baseURL}#top`, { waitUntil: 'networkidle' })
await timberPage.waitForSelector('.hero-stage--ready')
await timberPage.evaluate(() => dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })))
await timberPage.waitForSelector('[data-opening-state="playing"]')
await timberPage.keyboard.press('Escape')
await timberPage.waitForSelector('[data-opening-state="open"]')
await timberPage.addStyleTag({ content: '.site-header,.hero-copy,.entrance-links,.market-opening__progress,.scroll-cue,.scene-status{display:none!important}' })
const timberData = await timberPage.locator('.scene-host').evaluate((element) => ({ ...element.dataset }))
const timberFrame = path.join(evidenceDir, 'timber', 'settled-dpr2.png')
await timberPage.screenshot({ path: timberFrame })
report.captures.push(path.relative(evidenceDir, timberFrame))
report.timber = timberData
await timberContext.close()

await browser.close()
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)

const sourceOne = '/home/mani/Downloads/No Copyright I Autumn Red Leaves Transition 01 I free stock videos.mp4'
const sourceTwo = '/home/mani/Downloads/No Copyright I Autumn Red Leaves Transition 02  I free stock videos.mp4'
for (const [label, source, seconds] of [['shop', sourceOne, 3.4], ['animals', sourceTwo, 1.9]]) {
  const sourceFrame = path.join(evidenceDir, 'transitions', `source-${label}-covered.png`)
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-i', source, '-frames:v', '1', sourceFrame])
  report.captures.push(path.relative(evidenceDir, sourceFrame))
}
await fs.writeFile(path.join(evidenceDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.errors.length) process.exitCode = 1
