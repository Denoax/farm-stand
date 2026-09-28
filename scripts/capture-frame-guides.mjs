import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const outputDir = path.resolve('evidence/permanent-frame/guides')
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

async function capture(name, viewport, portrait = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => sessionStorage.setItem('farm-stand-market-opening-v2', 'complete'))
  const page = await context.newPage()
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-stage--ready')
  await page.screenshot({ path: path.join(outputDir, `${name}-integrated-current-plate.png`) })

  await page.addStyleTag({ content: `
    .site-header, .hero-copy, .entrance-links, .market-opening__progress, .scroll-cue, .scene-status, .floating-basket { display: none !important; }
    .market-opening__plate img { opacity: .24 !important; filter: grayscale(.65) contrast(.72) brightness(.78); }
    .market-opening__plate::after, .scene-vignette { display: none !important; }
  ` })
  await page.evaluate(({ portraitLayout }) => {
    const guide = document.createElement('div')
    guide.className = 'production-frame-guide'
    guide.setAttribute('aria-hidden', 'true')
    guide.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none;font:700 12px/1.2 sans-serif;text-transform:uppercase;letter-spacing:.08em;color:white'
    const region = (label, style, color) => {
      const element = document.createElement('div')
      element.textContent = label
      element.style.cssText = `position:absolute;box-sizing:border-box;padding:8px;border:3px solid ${color};background:${color}26;${style}`
      guide.append(element)
    }
    region('HTML copy safe', portraitLayout ? 'left:4%;top:14%;width:92%;height:39%' : 'left:5%;top:17%;width:43%;height:52%', '#f0ce56')
    region('pinned photo links', portraitLayout ? 'left:33%;top:56%;width:62%;height:35%' : 'left:58%;top:25%;width:31%;height:50%', '#65d3cb')
    region('live frame owns these edges', portraitLayout ? 'left:7%;top:8%;width:86%;height:84%' : 'left:5%;top:8%;width:90%;height:84%', '#f26752')
    const horizon = document.createElement('div')
    horizon.textContent = 'live counter contact plane'
    horizon.style.cssText = `position:absolute;left:0;right:0;top:${portraitLayout ? '76%' : '75%'};height:3px;padding:0 12px;color:#f0ce56;background:#f0ce56`
    guide.append(horizon)
    document.body.append(guide)
  }, { portraitLayout: portrait })
  await page.screenshot({ path: path.join(outputDir, `${name}-render-guide.png`) })
  await context.close()
}

await capture('desktop-1536x1024', { width: 1536, height: 1024 })
await capture('portrait-640x960', { width: 640, height: 960 }, true)
await browser.close()
