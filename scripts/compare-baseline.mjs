import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baselineURL = process.env.BASELINE_URL ?? 'http://127.0.0.1:4174/farm-stand/'
const candidateURL = process.env.CANDIDATE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const browser = await chromium.launch()

async function run(label, baseURL, index) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.clearBrowserCache')
  const started = performance.now()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready, .hero-stage--fallback')
  const rootReadyMs = performance.now() - started
  const root = await page.evaluate(() => {
    const entries = [performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource')].filter(Boolean)
    return {
      requests: entries.length,
      transferBytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0),
      encodedBodyBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      imageBytes: entries.filter((entry) => /\.(?:avif|webp|jpe?g)(?:\?|$)/i.test(entry.name)).reduce((sum, entry) => sum + entry.encodedBodySize, 0),
    }
  })

  const taskStarted = performance.now()
  await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Shop the stand.' }).waitFor()
  await page.locator('#product-apple').getByRole('button', { name: 'View details' }).click()
  await page.getByRole('dialog', { name: 'Orchard apples' }).waitFor()
  const appleDetailTaskMs = performance.now() - taskStarted
  const initialProductCards = await page.locator('.product-card').count()
  await context.close()
  return { label, run: index, rootReadyMs, root, appleDetailTaskMs, initialProductCards }
}

const runs = []
for (let index = 1; index <= 3; index += 1) {
  runs.push(await run('baseline-82ad14c', baselineURL, index))
  runs.push(await run('candidate-working-tree', candidateURL, index))
}
await browser.close()

const result = {
  measuredAt: new Date().toISOString(),
  conditions: {
    browser: 'project Playwright Chromium',
    viewport: '1440x900 CSS px',
    devicePixelRatio: 1,
    cache: 'cleared before each root navigation',
    environment: 'same local machine and localhost servers; runs alternated baseline then candidate',
  },
  scope: 'Controlled root-readiness and direct-shop apple-detail task only. The baseline scroll-scrub opening and candidate timed opening are not interaction-equivalent, so this comparison makes no animation-performance claim.',
  runs,
  limitations: [
    'Localhost timing does not predict rural-network latency.',
    'Headless Chromium does not establish physical-device or cross-browser performance.',
    'Candidate intentionally renders 12 curated cards and four immediate entrance photographs versus seven baseline cards, so transfer and task results include that product change.',
  ],
}

await fs.mkdir(path.resolve('evidence/market-expansion/review'), { recursive: true })
await fs.writeFile(path.resolve('evidence/market-expansion/review/baseline-comparison.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
