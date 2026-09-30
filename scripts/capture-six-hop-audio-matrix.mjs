import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const output = path.resolve('evidence/six-hop/review/audio/audio-readiness-matrix.json')
await fs.mkdir(path.dirname(output), { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { capturedAt: new Date().toISOString(), baseURL, cases: [], errors: [] }

async function installTrace(page, hiddenControl = false) {
  await page.addInitScript(({ controlHidden }) => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    sessionStorage.setItem('farm-stand-music-muted-v1', 'true')
    window.__audioReview = { trace: [], starts: [], reactions: [] }
    if (controlHidden) {
      window.__testHidden = false
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => Boolean(window.__testHidden) })
    }
    addEventListener('farmstandsoundtrace', (event) => {
      if (event.detail.name === 'bird') window.__audioReview.trace.push({ ...event.detail, observedAtMs: Math.round(performance.now()) })
    })
    addEventListener('farmstandsound', (event) => {
      if (event.detail.name === 'bird') window.__audioReview.starts.push({ ...event.detail, observedAtMs: Math.round(performance.now()) })
    })
  }, { controlHidden: hiddenControl })
}

async function openBird(page) {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await bird.waitFor({ state: 'visible', timeout: 8000 })
  await page.evaluate(() => {
    const scene = document.querySelector('.scene-host')
    if (!scene) return
    new MutationObserver(() => {
      const count = Number(scene.getAttribute('data-bird-reaction-count') ?? 0)
      const action = scene.getAttribute('data-bird-reaction')
      const previous = window.__audioReview.reactions.at(-1)
      if (previous?.count === count && previous?.action === action) return
      window.__audioReview.reactions.push({
        count,
        action,
        atMs: Math.round(performance.now()),
      })
    }).observe(scene, { attributes: true, attributeFilter: ['data-bird-reaction-count', 'data-bird-reaction'] })
  })
  return bird
}

async function finishCase(name, page, extra = {}) {
  const result = await page.evaluate(() => ({
    ...window.__audioReview,
    musicState: document.querySelector('.music-toggle')?.getAttribute('data-music-state'),
    soundStatus: document.querySelector('.sound-controls')?.getAttribute('data-sound-status'),
    failedEffects: document.querySelector('.sound-controls')?.getAttribute('data-failed-effects'),
  }))
  report.cases.push({ name, ...extra, ...result })
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await installTrace(page)
  await page.route('**/audio/bird-chirp*.mp3', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 520))
    await route.continue()
  })
  const bird = await openBird(page)
  await bird.click()
  await page.waitForFunction(() => window.__audioReview.starts.length === 1, null, { timeout: 2200 })
  await finishCase('cold-delayed-first-activation', page, { expected: 'one queued request becomes one actual start' })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await installTrace(page)
  const bird = await openBird(page)
  await page.mouse.click(8, 320)
  await page.waitForFunction(() => /ready|partial/.test(document.querySelector('.sound-controls')?.getAttribute('data-sound-status') ?? ''), null, { timeout: 8000 })
  await bird.click()
  await page.waitForTimeout(110)
  await bird.evaluate((element) => {
    element.click()
    element.click()
    element.click()
  })
  await page.waitForFunction(() => Number(document.querySelector('.scene-host')?.getAttribute('data-bird-reaction-count') ?? 0) >= 2, null, { timeout: 10_000 })
  await page.waitForTimeout(700)
  await finishCase('warm-rapid-queue', page, { expected: 'one active and one queued reaction produce two separated starts' })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await installTrace(page, true)
  await page.route('**/audio/bird-chirp-2.mp3', (route) => route.abort())
  for (const suffix of ['', '-3']) {
    await page.route(`**/audio/bird-chirp${suffix}.mp3`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 650))
      await route.continue()
    })
  }
  const bird = await openBird(page)
  await bird.click()
  await page.evaluate(() => {
    window.__testHidden = true
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(850)
  const startsWhileHidden = await page.evaluate(() => window.__audioReview.starts.length)
  await page.evaluate(() => {
    window.__testHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await bird.click()
  await page.waitForFunction(() => window.__audioReview.starts.length === 1, null, { timeout: 2200 })
  await finishCase('failed-variant-hidden-return', page, {
    expected: 'hidden pending cue is dropped; a fresh visible activation uses a valid variant',
    startsWhileHidden,
  })
  await context.close()
}

await browser.close()
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(output)
