import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('evidence/bird-hop/review')
await fs.mkdir(path.join(root, 'bird'), { recursive: true })
await fs.mkdir(path.join(root, 'notebook'), { recursive: true })
const browser = await chromium.launch({ headless: true })

async function openingFrames(name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' })
  const landingProgress = Array.from({ length: 6 }, (_, hop) => .38 + ((hop + .84) / 6) * .56)
  for (const [hop, progress] of landingProgress.entries()) {
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:5173/farm-stand/?debugProgress=${progress}`, { waitUntil: 'networkidle' })
    await page.locator('.scene-host[data-bird-state="ready"]').waitFor({ timeout: 10000 })
    await page.waitForTimeout(350)
    await page.screenshot({ path: path.join(root, 'bird', `${name}-landing-${hop + 1}.png`) })
    await page.close()
  }
  await context.close()
}

await openingFrames('desktop', { width: 1440, height: 960 })
await openingFrames('portrait', { width: 390, height: 844 })

for (const [name, viewport] of [['desktop', { width: 1440, height: 960 }], ['portrait', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/farm-stand/#shop', { waitUntil: 'networkidle' })
  await page.locator('.market-notebook').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(root, 'notebook', `${name}-top.png`) })
  await page.locator('.market-notebook').evaluate((element) => scrollTo(0, element.getBoundingClientRect().bottom + scrollY - innerHeight + 12))
  await page.waitForTimeout(120)
  await page.screenshot({ path: path.join(root, 'notebook', `${name}-bottom.png`) })
  await context.close()
}

await browser.close()
