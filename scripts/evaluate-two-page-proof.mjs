import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/farm-stand/'
const outputDir = path.resolve(process.env.EVIDENCE_ROOT ?? 'evidence/bird-hop/review', 'optional-book-proof')
await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${baseURL}#shop`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^All 48/ }).click()
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.product-card')].slice(0, 4).map((card) => {
    const clone = card.cloneNode(true)
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
    clone.querySelectorAll('button,a').forEach((element) => element.setAttribute('tabindex', '-1'))
    return clone
  })
  const proof = document.createElement('section')
  proof.className = 'book-proof'
  proof.innerHTML = '<div class="book-proof__spread"><div class="book-proof__page book-proof__page--left"><div class="book-proof__cards"></div><small>12</small></div><div class="book-proof__page book-proof__page--right"><div class="book-proof__cards"></div><small>13</small></div></div><div class="book-proof__controls"><button type="button">Previous</button><button type="button">Next</button></div>'
  proof.querySelector('.book-proof__page--left .book-proof__cards').append(...cards.slice(0, 2))
  proof.querySelector('.book-proof__page--right .book-proof__cards').append(...cards.slice(2))
  proof.querySelector('button:last-child').addEventListener('click', () => {
    proof.classList.toggle('book-proof--turned')
    ;[...document.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Market picks'))?.click()
  })
  proof.querySelector('button:first-child').addEventListener('click', () => {
    proof.classList.remove('book-proof--turned')
    ;[...document.querySelectorAll('button')].find((button) => button.textContent?.startsWith('All 48'))?.click()
  })
  document.querySelector('.market-notebook__paper').prepend(proof)
})
const baseCSS = `
  .book-proof{position:relative;z-index:20;margin:0 auto 2rem;max-width:72rem;padding:1.2rem;background:#7b6243}
  .book-proof__spread{display:grid;grid-template-columns:1fr 1fr;perspective:1400px;background:#ddd0ad}
  .book-proof__page{position:relative;min-height:39rem;padding:1rem 1.2rem 2.2rem;background:repeating-linear-gradient(#fffaf0 0 31px,#dce7e4 32px);box-shadow:inset 0 0 2rem #59452d22;transform-origin:left center;transition:transform .7s}
  .book-proof__page--left{border-right:2px solid #8c765d;transform-origin:right center}.book-proof--turned .book-proof__page--right{transform:rotateY(-165deg)}
  .book-proof__cards{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.book-proof .product-card{font-size:.7rem}.book-proof .product-card__image{height:9rem}.book-proof__page small{position:absolute;bottom:.7rem;left:50%}
  .book-proof__controls{display:flex;justify-content:center;gap:1rem;padding:1rem 0 0}.book-proof__controls button{padding:.7rem 1.3rem}
`
await page.addStyleTag({ content: baseCSS })
await page.locator('.book-proof').scrollIntoViewIfNeeded()
await page.screenshot({ path: path.join(outputDir, 'proof-initial.png') })
await page.getByRole('button', { name: 'Next' }).click()
await page.waitForTimeout(760)
await page.screenshot({ path: path.join(outputDir, 'proof-turn-initial.png') })
await page.addStyleTag({ content: '.book-proof__page{backface-visibility:hidden}.book-proof__spread{overflow:hidden}.book-proof--turned .book-proof__page--right{transform:rotateY(-150deg);filter:drop-shadow(-1rem .6rem .7rem #2b211866)}' })
await page.getByRole('button', { name: 'Previous' }).click()
await page.getByRole('button', { name: 'Next' }).click()
await page.waitForTimeout(760)
await page.screenshot({ path: path.join(outputDir, 'proof-turn-corrected.png') })
await fs.writeFile(path.join(outputDir, 'verdict.json'), `${JSON.stringify({
  verdict: 'REJECT',
  reason: 'The physical turn reads, but fixed two-card pages reduce the accepted browsing density and make 48 products substantially slower to scan. Keep the continuous notebook.',
  correction: 'Added backface hiding, clipped the spread, and strengthened the hinge shadow; the navigation-cost defect remained.',
  productionChanged: false,
}, null, 2)}\n`)
await browser.close()
