import { expect, test, type Page } from '@playwright/test'
import { BIRD_ENTRANCE_HOP_COUNT, evaluateBirdEntrance } from '../../src/scene/birdPerformance'

const projectPath = '/farm-stand/'

async function openShop(page: Page, showAll = true) {
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
  if (showAll) await page.getByRole('button', { name: /^All 48/ }).click()
}

async function addProduct(page: Page, productId: string, name = 'Add to basket') {
  const count = page.locator('.floating-basket strong')
  const before = Number(await count.textContent())
  await page.locator(`#product-${productId}`).getByRole('button', { name }).click()
  await expect(count).toHaveText(String(before + 1))
}

async function openFullBasket(page: Page, itemCount?: number) {
  const label = itemCount === undefined ? /Open basket preview/ : new RegExp(`Open basket preview, ${itemCount} items`)
  await page.getByRole('button', { name: label }).click()
  await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
  return page.getByRole('dialog', { name: /Your basket/ })
}

async function dispatchWheel(page: Page, deltaY: number) {
  await page.evaluate((value) => window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: value })), deltaY)
}

test('project-path build loads the opening and keeps entrance links usable', async ({ page }) => {
  const failedResponses: string[] = []
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Farm stand website demonstration, home' })).toBeVisible()
  await expect(page.locator('.wordmark .logo-mark')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open the stand' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Skip opening' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Pause opening|Resume opening/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play background music' })).toBeVisible()
  await expect(page.locator('.sound-controls button')).toHaveCount(1)
  await expect(page.locator('.floating-basket')).toBeHidden()
  await expect(page.getByRole('navigation', { name: /straight to/i }).getByRole('link')).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'Shop' }).last()).toHaveAttribute('href', '#shop')
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname))
  expect(resources.every((path) => path.startsWith('/farm-stand/'))).toBe(true)
  await expect(page.getByText('Websites for growers and local businesses.')).toHaveCount(0)
  await expect(page.getByText('A fictional farm-shop experience demonstrating a real website service. No produce is sold here.')).toHaveCount(0)
  expect(failedResponses).toEqual([])
})

test('market is one normal-flow spiral notebook and the speaker rests as an aligned glyph', async ({ page }) => {
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  await expect(page.getByText('Demonstration market', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Browse 48 photographed examples across the market. Prices and availability are illustrative; nothing can be ordered here.', { exact: true })).toHaveCount(0)
  await expect(page.locator('.market-doodles img')).toHaveCount(3)
  expect(await page.locator('.market-doodles').getAttribute('aria-hidden')).toBe('true')
  await expect(page.locator('.market-doodles img').nth(0)).toHaveAttribute('src', /pencil-cow-front\.png$/)
  await expect(page.locator('.market-doodles img').nth(1)).toHaveAttribute('src', /pencil-cow-profile\.png$/)
  await expect(page.locator('.market-doodles img').nth(2)).toHaveAttribute('src', /pencil-livestock-head-study\.png$/)
  await expect(page.locator('.market-notebook')).toHaveCount(1)
  await expect(page.locator('.market-notebook__binding')).toHaveCount(1)
  await expect(page.locator('.market-notebook__wood-tab')).toHaveCount(2)
  await expect(page.locator('.market-clipboard, .market-clipboard__clip')).toHaveCount(0)
  const notebook = await page.locator('.market-notebook').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const paper = element.querySelector('.market-notebook__paper') as HTMLElement
    const tabs = [...element.querySelectorAll('.market-notebook__wood-tab')].map((tab) => tab.getBoundingClientRect())
    return {
      overflow: getComputedStyle(element).overflowY,
      ruled: getComputedStyle(paper).backgroundImage.includes('repeating-linear-gradient'),
      tabs: tabs.map((tab) => ({ left: tab.left, right: tab.right, top: tab.top, bottom: tab.bottom })),
      bottom: rect.bottom,
    }
  })
  expect(notebook.overflow).not.toBe('scroll')
  expect(notebook.ruled).toBe(true)
  expect(notebook.tabs[0].right).toBeLessThan(notebook.tabs[1].left)
  expect(notebook.tabs.every((tab) => tab.top < notebook.bottom && tab.bottom > notebook.bottom - 12)).toBe(true)
  const outer = await page.locator('.market-notebook').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: innerWidth - rect.right, width: rect.width, viewport: innerWidth }
  })
  const maximumGutter = outer.viewport <= 760 ? 10 : 24
  expect(outer.left).toBeLessThanOrEqual(maximumGutter)
  expect(outer.right).toBeLessThanOrEqual(maximumGutter)
  expect(outer.width).toBeGreaterThanOrEqual(outer.viewport - maximumGutter * 2)

  await page.evaluate(() => scrollTo(0, 0))
  const header = await page.locator('.header-brand').evaluate((element) => {
    const logo = element.querySelector('.wordmark')!.getBoundingClientRect()
    const control = element.querySelector('.sound-controls') as HTMLElement
    const button = control.querySelector('button') as HTMLElement
    const buttonRect = button.getBoundingClientRect()
    const controlStyle = getComputedStyle(control)
    const buttonStyle = getComputedStyle(button)
    return {
      centerDelta: Math.abs((logo.top + logo.height / 2) - (buttonRect.top + buttonRect.height / 2)),
      width: buttonRect.width,
      height: buttonRect.height,
      controlBackground: controlStyle.backgroundColor,
      controlBorder: controlStyle.borderTopWidth,
      buttonBackground: buttonStyle.backgroundColor,
      buttonBorder: buttonStyle.borderTopWidth,
      buttonShadow: buttonStyle.boxShadow,
    }
  })
  expect(header.centerDelta).toBeLessThanOrEqual(1)
  expect(header.width).toBeGreaterThanOrEqual(42)
  expect(header.height).toBeGreaterThanOrEqual(42)
  expect(header.controlBackground).toBe('rgba(0, 0, 0, 0)')
  expect(header.controlBorder).toBe('0px')
  expect(header.buttonBackground).toBe('rgba(0, 0, 0, 0)')
  expect(header.buttonBorder).toBe('0px')
  expect(header.buttonShadow).toBe('none')
  await page.locator('.music-toggle').focus()
  expect(await page.locator('.music-toggle').evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe('none')
})

test('opening starts on meaningful downward intent, fades during the hold, escapes, and stays complete', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await expect(stage).toHaveAttribute('data-scroll-hold-policy', 'presented-complete')
  await expect(stage).toHaveAttribute('data-scroll-hold-watchdog-ms', '9000')
  await expect(stage).toHaveAttribute('data-opening-state', 'waiting')
  await dispatchWheel(page, 4)
  await expect(stage).toHaveAttribute('data-opening-state', 'waiting')
  const fade = await page.evaluate(async () => {
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 20 }))
    const stage = document.querySelector('.hero-stage')
    const copy = document.querySelector('.hero-copy')
    while (stage?.getAttribute('data-opening-state') !== 'playing') await new Promise(requestAnimationFrame)
    const animation = copy?.getAnimations().find((candidate) => candidate.animationName === 'hero-copy-depart' || candidate.animationName === 'hero-copy-depart-phone')
    if (!copy || !animation || !(animation.effect instanceof KeyframeEffect)) return null
    animation.pause()
    const duration = Number(animation.effect.getTiming().duration)
    const opacityAt = (time: number) => {
      animation.currentTime = time
      return Number(getComputedStyle(copy).opacity)
    }
    const result = {
      hold: stage.getAttribute('data-scroll-hold'),
      duration,
      start: opacityAt(0),
      middle: opacityAt(duration / 2),
      end: opacityAt(duration),
    }
    animation.play()
    return result
  })
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  expect(fade).not.toBeNull()
  expect(fade?.hold).toBe('active')
  expect(fade?.duration).toBe(850)
  expect(fade?.start).toBeGreaterThan(.99)
  expect(fade?.middle).toBeGreaterThan(.05)
  expect(fade?.middle).toBeLessThan(.95)
  expect(fade?.end).toBeLessThan(.01)
  await expect(page.getByRole('button', { name: /Pause opening|Resume opening/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(stage).toHaveAttribute('data-requested-progress', '1.0000')
  await page.reload()
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('initial scroll hold lasts through presented completion and never reacquires', async ({ page }) => {
  test.slow()
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await expect(stage).toHaveAttribute('data-scroll-hold-policy', 'presented-complete')
  await expect(stage).toHaveAttribute('data-scroll-hold-watchdog-ms', '9000')
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
    const followup = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 800 })
    ;(window as typeof window & { __holdBlockedFollowup?: boolean }).__holdBlockedFollowup = !window.dispatchEvent(followup) && followup.defaultPrevented
  })
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  expect(await page.evaluate(() => (window as typeof window & { __holdBlockedFollowup?: boolean }).__holdBlockedFollowup)).toBe(true)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.waitForTimeout(1100)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'active')
  await expect(stage).toHaveAttribute('data-opening-state', 'open', { timeout: 8000 })
  await expect(stage).toHaveAttribute('data-presented-progress', '1.0000')
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
  await page.mouse.wheel(0, 800)
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-handoff-state', 'covering')
  await page.keyboard.press('Escape')
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-handoff-state', 'bypassed')
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.evaluate(() => scrollTo(0, 0))
  await page.mouse.wheel(0, 800)
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
})

test('non-root position bypasses the opening gate', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await page.evaluate(() => scrollTo(0, 300))
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('watchdog fail-opens when requested frames stop presenting', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'portrait-chromium', 'The shared timer invariant is exercised once in release validation.')
  test.slow()
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 1
    window.cancelAnimationFrame = () => undefined
  })
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'active')
  await expect(stage).toHaveAttribute('data-opening-state', 'open', { timeout: 10_500 })
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('keyboard intent ignores controls and header navigation settles the opening', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await page.getByRole('link', { name: 'Farm stand website demonstration, home' }).focus()
  await page.keyboard.press('ArrowDown')
  const stateAfterFocusedKey = await stage.getAttribute('data-opening-state')
  expect(['waiting', 'open']).toContain(stateAfterFocusedKey)
  if (stateAfterFocusedKey === 'waiting') {
    await page.evaluate(() => { scrollTo(0, 0); (document.activeElement as HTMLElement | null)?.blur() })
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => stage.getAttribute('data-opening-state')).toMatch(/playing|open/)
  }
  await page.getByRole('link', { name: 'Shop' }).first().click()
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-handoff-state', /complete|bypassed/, { timeout: 9000 })
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
})

test('focused hero actions remain focused instead of becoming inert mid-opening', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  const shopPhoto = page.getByRole('navigation', { name: /straight to/i }).getByRole('link', { name: 'Shop' })
  await shopPhoto.focus()
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(shopPhoto).toBeFocused()
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('touch interruption releases the bounded opening hold', async ({ page }) => {
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  const touchStates = await page.locator('.hero-stage').evaluate(async (stage) => {
    const start = new Touch({ identifier: 1, target: stage, clientX: 100, clientY: 500 })
    const move = new Touch({ identifier: 1, target: stage, clientX: 100, clientY: 470 })
    stage.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }))
    stage.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [move] }))
    while (stage.getAttribute('data-opening-state') !== 'playing') await new Promise(requestAnimationFrame)
    const active = stage.getAttribute('data-scroll-hold')
    window.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }))
    while (stage.getAttribute('data-scroll-hold') !== 'released') await new Promise(requestAnimationFrame)
    return { active, released: stage.getAttribute('data-scroll-hold') }
  })
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  expect(touchStates.active).toBe('active')
  expect(touchStates.released).toBe('released')
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('hidden-tab lifecycle settles and releases the hold', async ({ page }) => {
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'active')
  await page.waitForTimeout(350)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
})

test('shutter is monotonic, the apple clears the complete assembly, and the frame stays permanent', async ({ page }) => {
  test.slow()
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  const scene = page.getByTestId('scene-host')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  const initialTravel = Number(await scene.getAttribute('data-apple-travel'))
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  const counterY = await scene.getAttribute('data-counter-y')
  await expect(scene).toHaveAttribute('data-frame', 'permanent')
  await expect(scene).not.toHaveAttribute('data-table-exit', /.+/)
  const shutterSamples: number[] = []
  for (let index = 0; index < 40 && Number(await scene.getAttribute('data-apple-roll')) < .1; index += 1) {
    shutterSamples.push(Number(await scene.getAttribute('data-shutter-lift')))
    await page.waitForTimeout(120)
  }
  expect(Number(await scene.getAttribute('data-apple-roll'))).toBeGreaterThanOrEqual(.1)
  expect(shutterSamples.every((value, index) => index === 0 || value >= shutterSamples[index - 1] - .001)).toBe(true)
  await expect.poll(async () => Number(await scene.getAttribute('data-apple-roll')), { timeout: 3500 }).toBeGreaterThan(.9)
  const roll = await scene.evaluate((element) => ({
    travel: Number(element.getAttribute('data-apple-travel')),
    rotation: Number(element.getAttribute('data-apple-rotation')),
    radius: Number(element.getAttribute('data-apple-effective-radius')),
  }))
  expect(initialTravel).toBe(0)
  expect(roll.travel).toBeGreaterThan(initialTravel)
  expect(roll.rotation * roll.radius).toBeCloseTo(roll.travel, 3)
  expect(Number(await scene.getAttribute('data-apple-clearance'))).toBeGreaterThan(0)
  expect(Number(await scene.getAttribute('data-shutter-clearance'))).toBeGreaterThan(0)
  expect(Number(await scene.getAttribute('data-fascia-clearance'))).toBeGreaterThan(0)
  expect(Math.abs(Number(await scene.getAttribute('data-counter-penetration')))).toBeLessThan(.001)
  expect(Number(await scene.getAttribute('data-assembly-min-clearance'))).toBeGreaterThan(0)
  await expect(scene).toHaveAttribute('data-clearance-sweep-samples', '101')
  expect(Number(await scene.getAttribute('data-clearance-sweep-min'))).toBeGreaterThan(0)
  expect(Math.abs(Number(await scene.getAttribute('data-clearance-sweep-max-counter-penetration')))).toBeLessThan(.001)
  await expect(scene).toHaveAttribute('data-apple-collision-free', 'true')
  await expect(scene).toHaveAttribute('data-visible-shutter-rails', 'false')
  await expect(scene).toHaveAttribute('data-joint-occlusion', 'geometry-linked')
  await expect(scene).toHaveAttribute('data-timber-material', 'storybook-painted-rough-wood-derivative')
  await expect(scene).toHaveAttribute('data-context-antialias', 'true')
  expect(Number(await scene.getAttribute('data-context-samples'))).toBeGreaterThan(0)
  expect(Number(await scene.getAttribute('data-pixel-ratio-cap'))).toBe(1.5)
  expect(await scene.getAttribute('data-drawing-buffer')).toMatch(/^\d+x\d+$/)
  expect(Number(await scene.getAttribute('data-shutter-lift'))).toBeGreaterThan(.99)
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await expect(stage).toHaveAttribute('data-opening-content', 'complete')
  await expect(scene).toHaveAttribute('data-counter-y', counterY ?? '')
  await expect(scene).toHaveAttribute('data-frame', 'permanent')
})

test('direct destination bypasses the opening and reveals non-featured products', async ({ page }) => {
  await page.goto(`${projectPath}#product-eggs`, { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  await expect(page.locator('#product-eggs')).toBeVisible()
  await expect(page.locator('#product-eggs')).toBeFocused()
})

test('market exposes exact counts, curated default, subgroup browse, search, and reset', async ({ page }) => {
  await openShop(page, false)
  await expect(page.locator('.product-card')).toHaveCount(12)
  await expect(page.getByRole('button', { name: /^Fruit & veg 28/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Butcher 6/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Eggs & dairy 4/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pantry 4/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Boxes 2/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Farm goods 4/ })).toBeVisible()
  await page.getByRole('button', { name: /^Fruit & veg 28/ }).click()
  await expect(page.locator('.product-card')).toHaveCount(28)
  await page.getByRole('button', { name: 'Fruit 16' }).click()
  await expect(page.locator('.product-card')).toHaveCount(16)
  await page.getByLabel('Search the market').fill('currants')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Red currants' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear and show market picks' }).click()
  await expect(page.locator('.product-card')).toHaveCount(12)
})

test('product images recover from a transient failure and offer a decoded manual retry after a persistent failure', async ({ page }) => {
  let requests = 0
  await page.route('**/media/catalogue-expanded/apple.avif*', async (route) => {
    requests += 1
    if (requests === 1) await route.abort()
    else await route.continue()
  })
  await openShop(page, false)
  const appleImage = page.locator('#product-apple img[data-image-source]')
  await expect(appleImage).toHaveAttribute('data-image-state', 'decoded')
  await expect(appleImage).toHaveAttribute('data-image-attempt', '1')
  expect(requests).toBe(2)

  await page.unroute('**/media/catalogue-expanded/apple.avif*')
  await page.route('**/media/catalogue-expanded/apple.avif*', (route) => route.abort())
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#product-apple').getByRole('button', { name: 'Retry image' })).toBeVisible()
  await page.unroute('**/media/catalogue-expanded/apple.avif*')
  await page.locator('#product-apple').getByRole('button', { name: 'Retry image' }).click()
  await expect(appleImage).toHaveAttribute('data-image-state', 'decoded')
  await expect(appleImage).toHaveAttribute('data-image-attempt', '2')
})

test('all 48 catalogue photographs reach a decoded image state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await openShop(page)
  const cards = page.locator('.product-card')
  await expect(cards).toHaveCount(48)
  for (let index = 0; index < 48; index += 1) {
    const image = cards.nth(index).locator('img[data-image-source]')
    await image.scrollIntoViewIfNeeded()
    await expect(image, `product image ${index + 1}`).toHaveAttribute('data-image-state', 'decoded')
    expect(await image.evaluate((node) => ({ width: (node as HTMLImageElement).naturalWidth, height: (node as HTMLImageElement).naturalHeight }))).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }))
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalHeight)).toBeGreaterThan(0)
  }
})

test('basket supports variants, quantity, undo, collection, checkout, completion, edit, and clear', async ({ page }) => {
  const writes: string[] = []
  page.on('request', (request) => { if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`) })
  await openShop(page)
  await addProduct(page, 'apple')
  const shirt = page.locator('#product-farm-tee')
  await shirt.getByLabel('Size').selectOption('s')
  await addProduct(page, 'farm-tee')
  await shirt.getByLabel('Size').selectOption('m')
  await addProduct(page, 'farm-tee')
  await expect(page.locator('#product-squash').getByRole('button', { name: 'Unavailable example' })).toBeDisabled()
  await page.getByRole('button', { name: /Open basket preview, 3 items/ }).click()
  const preview = page.getByRole('dialog', { name: 'At a glance' })
  await expect(preview).toContainText('Orchard apples')
  await expect(preview).toContainText('Illustrative subtotal')
  await page.keyboard.press('Escape')
  await expect(preview).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Open basket preview, 3 items/ })).toBeFocused()
  await page.getByRole('button', { name: /Open basket preview, 3 items/ }).click()
  await preview.getByRole('button', { name: 'View full basket' }).click()
  const drawer = page.locator('.basket-dialog')
  await expect(drawer).not.toContainText('Demo only. No order, payment, stock, or collection slot is submitted.')
  await expect(drawer).not.toContainText('Prices are read from the current catalogue')
  await expect(drawer.getByText('Size: Small')).toBeVisible()
  await expect(drawer.getByText('Size: Medium')).toBeVisible()
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await expect(drawer.getByLabel('Quantity for Orchard apples')).toContainText('2')
  await drawer.locator('.basket-lines li').filter({ hasText: 'Size: Small' }).getByRole('button', { name: 'Remove' }).click()
  await drawer.getByRole('button', { name: 'Undo' }).click()
  await expect(drawer.getByText('Size: Small')).toBeVisible()
  await drawer.getByRole('button', { name: 'Choose collection' }).click()
  await expect(drawer.getByRole('heading', { name: 'Choose an illustrative collection period.' })).toBeFocused()
  await expect(drawer).toContainText('never removes, substitutes, or reprices')
  await drawer.getByLabel(/Saturday pickup/).check()
  await drawer.getByRole('button', { name: 'Continue to checkout' }).click()
  await expect(drawer.getByRole('heading', { name: 'Review the local preview.' })).toBeFocused()
  await expect(drawer).toContainText('Saturday pickup')
  await drawer.getByRole('button', { name: 'Use sample details' }).click()
  await drawer.getByLabel('Email').fill('not-an-email')
  await drawer.getByRole('button', { name: 'Complete preview' }).click()
  await expect(drawer.getByText(/Enter an email/)).toBeVisible()
  await drawer.getByLabel('Email').fill('alex@example.com')
  await drawer.getByRole('button', { name: 'Back to collection' }).click()
  await expect(drawer.getByLabel(/Saturday pickup/)).toBeChecked()
  await drawer.getByRole('button', { name: 'Continue to checkout' }).click()
  await drawer.getByRole('button', { name: 'Edit basket' }).click()
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await drawer.getByRole('button', { name: 'Choose collection' }).click()
  await expect(drawer.getByLabel(/Saturday pickup/)).toBeChecked()
  await drawer.getByRole('button', { name: 'Continue to checkout' }).click()
  await expect(drawer.getByLabel('Email')).toHaveValue('alex@example.com')
  await expect(drawer.locator('.basket-drawer__footer')).toContainText('$75.50')
  await expect(drawer.locator('form')).toHaveCount(0)
  await expect(drawer.getByLabel(/card|bank|cvv|payment/i)).toHaveCount(0)
  await drawer.getByRole('button', { name: 'Complete preview' }).evaluate((button) => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
  await expect(drawer.getByRole('heading', { name: 'Preview complete', exact: true })).toBeVisible()
  await expect(drawer.getByRole('heading', { name: 'Preview complete', exact: true })).toHaveCount(1)
  await expect(drawer).toContainText('Nothing was sent, reserved or charged')
  await expect(drawer).toContainText('your basket is unchanged')
  expect(await page.evaluate(() => Object.values(sessionStorage).join('\n'))).not.toContain('alex@example.com')
  expect(page.url()).not.toContain('alex')
  expect(writes).toEqual([])
  await drawer.getByRole('button', { name: 'Back to checkout' }).click()
  await drawer.getByRole('button', { name: 'Edit basket' }).click()
  await expect(drawer).toHaveAttribute('data-checkout-step', 'basket')
  await drawer.getByRole('button', { name: 'Clear demonstration basket' }).click()
  await drawer.getByRole('button', { name: 'Yes, clear it' }).click()
  await expect(drawer).toContainText('Your demonstration basket is empty.')
})

test('legacy basket migrates deliberately and ignores stored prices', async ({ page }) => {
  await openShop(page)
  await page.evaluate(() => {
    sessionStorage.removeItem('farm-stand-demo-basket-v2')
    sessionStorage.setItem('farm-stand-demo-basket-v1', JSON.stringify({ apple: 2, eggs: 1, unknown: 4, squash: 1, price: 1 }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  const drawer = await openFullBasket(page, 3)
  await expect(drawer.locator('.basket-total')).toContainText('$20.00')
  const storage = await page.evaluate(() => ({ next: sessionStorage.getItem('farm-stand-demo-basket-v2'), legacy: sessionStorage.getItem('farm-stand-demo-basket-v1') }))
  expect(storage.next).toContain('"version":2')
  expect(storage.legacy).toBeNull()
})

test('living farm album uses matching films, normal flow, and one playback owner', async ({ page }) => {
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  await expect(page.locator('#hens video')).toHaveAttribute('poster', /hens-poster\.avif/)
  await expect(page.locator('#cattle video')).toHaveAttribute('poster', /cattle-poster\.avif/)
  await expect(page.locator('#sheep video')).toHaveAttribute('poster', /sheep-poster\.avif/)
  await expect(page.locator('#hens')).toHaveAttribute('data-paper-state', 'settled')
  await expect(page.getByRole('heading', { name: 'Around the farm.' })).toBeVisible()
  await expect(page.getByText('Meet the neighbours.')).toBeVisible()
  await expect(page.locator('.farm-profile, .farm-life__chapter-nav, .farm-album [style*="--profile-progress"]')).toHaveCount(0)
  const geometry = await page.locator('.farm-album').evaluate((album) => {
    const entry = (id: string) => document.getElementById(id)!.getBoundingClientRect()
    const film = (id: string) => document.querySelector(`#${id} .farm-album__film`)!.getBoundingClientRect()
    return {
      albumPosition: getComputedStyle(album).position,
      entries: ['hens', 'cattle', 'sheep'].map((id) => ({ id, height: entry(id).height, filmRatio: film(id).width / film(id).height })),
      sticky: album.querySelectorAll('[style*="sticky"], .farm-profile__sticky').length,
    }
  })
  expect(geometry.albumPosition).toBe('relative')
  expect(geometry.sticky).toBe(0)
  expect(geometry.entries.every(({ height }) => height < 1200)).toBe(true)
  expect(geometry.entries.every(({ filmRatio }) => Math.abs(filmRatio - 16 / 9) < .03)).toBe(true)
  expect(await page.locator('.farm-album video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length)).toBeLessThanOrEqual(1)
  await page.locator('#cattle').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  expect(await page.locator('.farm-album video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length)).toBeLessThanOrEqual(1)
  await page.locator('#visit').scrollIntoViewIfNeeded()
  await expect.poll(async () => page.locator('.farm-album video').evaluateAll((videos) => videos.every((video) => (video as HTMLVideoElement).paused))).toBe(true)
  await page.locator('#hens').getByRole('link', { name: 'View eggs' }).click()
  await expect(page).toHaveURL(/#product-eggs$/)
  await expect(page.locator('#product-eggs')).toBeFocused()
})

test('farm album keeps explicit pause intent, replay controls, and lazy source attachment', async ({ page }) => {
  await page.goto(`${projectPath}#top`, { waitUntil: 'networkidle' })
  await expect(page.locator('.farm-album__entry[data-source-attached="true"]')).toHaveCount(0)
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  const hens = page.locator('#hens')
  await hens.scrollIntoViewIfNeeded()
  await expect(hens).toHaveAttribute('data-paper-state', 'settled')
  await expect(hens).toHaveAttribute('data-media-state', /playing|ready/)
  const pauseFilm = hens.getByRole('button', { name: 'Hens: Pause film' })
  await expect.poll(async () => hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await expect(pauseFilm).toBeVisible()
  await pauseFilm.click()
  await expect(hens).toHaveAttribute('data-user-paused', 'true')
  await page.locator('#cattle').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await hens.scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  expect(await hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
  await expect(hens.getByRole('button', { name: 'Hens: Play film' })).toBeVisible()
  await hens.getByRole('button', { name: 'Hens: Play film' }).click()
  await expect(hens).toHaveAttribute('data-user-paused', 'false')
  expect(await page.locator('.farm-album video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length)).toBeLessThanOrEqual(1)
})

test('farm album links preserve history and hens-to-eggs preserves basket state', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: { apple: 2, 'farm-tee:m': 1 } })))
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  const originalBasket = await page.evaluate(() => sessionStorage.getItem('farm-stand-demo-basket-v2'))
  await page.getByRole('navigation', { name: 'Farm-life scenes', exact: true }).getByRole('link', { name: 'Cattle' }).click()
  await expect(page).toHaveURL(/#cattle$/)
  await page.goBack()
  await expect(page).toHaveURL(/#hens$/)
  await page.locator('#hens').getByRole('link', { name: 'View eggs' }).click()
  await expect(page).toHaveURL(/#product-eggs$/)
  expect(await page.evaluate(() => sessionStorage.getItem('farm-stand-demo-basket-v2'))).toBe(originalBasket)
  await expect(page.locator('#product-eggs')).toBeFocused()
})

test('farm album pauses for overlays and hidden tabs without losing user intent', async ({ page }) => {
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  const hens = page.locator('#hens')
  await expect(hens).toHaveAttribute('data-media-state', /playing|ready/)
  await page.getByRole('button', { name: /Open basket preview/ }).click()
  await expect(page.getByRole('dialog', { name: 'At a glance' })).toBeVisible()
  await expect.poll(async () => hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
  await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: /Close/ }).click()
  await expect.poll(async () => hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => hens.locator('video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
})

test('ended animal film holds its frame and replays only on explicit request', async ({ page }) => {
  await page.goto(`${projectPath}#sheep`, { waitUntil: 'networkidle' })
  const sheep = page.locator('#sheep')
  const video = sheep.locator('video')
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement
    media.currentTime = Math.max(0, media.duration - .08)
    void media.play()
  })
  await expect(sheep).toHaveAttribute('data-media-state', 'ended', { timeout: 2500 })
  await expect(video).toHaveAttribute('data-frame-presented', 'true')
  await sheep.getByRole('button', { name: 'Sheep: Replay film' }).click()
  await expect(sheep).toHaveAttribute('data-media-state', 'playing')
  expect(await video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeLessThan(2)
})

test('animal film and poster failures keep complete content and allow only one retry', async ({ page }) => {
  let filmRequests = 0
  await page.route('**/media/farm-life-motion/hens.mp4', (route) => { filmRequests += 1; void route.abort() })
  await page.route('**/media/farm-life-motion/hens-poster.avif', (route) => route.abort())
  await page.goto(`${projectPath}#hens`)
  const hens = page.locator('#hens')
  await expect(hens).toHaveAttribute('data-media-state', 'error')
  await expect(hens.getByRole('img', { name: /Hens film poster unavailable/ })).toBeVisible()
  await expect(hens.getByText('A hen and her chicks, busy at ground level.')).toBeVisible()
  await expect(hens.getByRole('link', { name: 'View eggs' })).toBeVisible()
  await hens.getByRole('button', { name: 'Retry film' }).click()
  await expect(hens.getByText('Film unavailable. Poster retained.')).toBeVisible()
  expect(filmRequests).toBe(2)
  await expect(hens.getByRole('button', { name: 'Retry film' })).toHaveCount(0)
})

test('explicit album sound action emits one existing calibrated cue', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __albumSounds?: Array<{ name: string; gain: number }> }).__albumSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string; gain: number }>) => {
      ;(window as typeof window & { __albumSounds?: Array<{ name: string; gain: number }> }).__albumSounds?.push(event.detail)
    }) as EventListener)
  })
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await page.evaluate(() => { (window as typeof window & { __albumSounds?: unknown[] }).__albumSounds = [] })
  const hear = page.locator('#hens').getByRole('button', { name: 'Hear a cluck' })
  await hear.click()
  await hear.click()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __albumSounds?: Array<{ name: string }> }).__albumSounds?.filter(({ name }) => name === 'hens').length)).toBe(1)
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __albumSounds?: Array<{ name: string; gain: number }> }).__albumSounds?.find(({ name }) => name === 'hens')?.gain)).toBeCloseTo(.15, 3)
})

test('exact shop video owns one continuous hold and commits only in its decoded cover', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  const root = page.locator('body > #root > div')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'armed')
  await expect(page.locator('.floating-basket')).toBeHidden()
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-handoff-state', 'covering')
  await expect(root).toHaveAttribute('data-handoff-kind', 'shop')
  await expect(root).toHaveAttribute('data-transition-asset', /leaves-shop-01-alpha\.webm$/)
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'handoff')
  await expect(root).toHaveAttribute('data-scroll-hold', 'active')
  const heldAt = await page.evaluate(() => Number.parseFloat(document.body.style.top || '0'))
  await dispatchWheel(page, 500)
  expect(await page.evaluate(() => Number.parseFloat(document.body.style.top || '0'))).toBe(heldAt)
  await expect(page.locator('.video-handoff')).toBeVisible()
  await expect(page.locator('.video-handoff')).toHaveAttribute('data-initial-frame', 'presented')
  await page.waitForTimeout(1500)
  await expect(page).not.toHaveURL(/#shop$/)
  await expect(root).toHaveAttribute('data-handoff-state', 'covered', { timeout: 2500 })
  const coverTime = Number(await page.locator('.video-handoff').getAttribute('data-cover-time'))
  expect(coverTime).toBeGreaterThanOrEqual(3.03)
  expect(coverTime).toBeLessThanOrEqual(3.8)
  await expect(page.locator('.video-handoff')).toHaveAttribute('data-cover-hold', 'visible')
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'handoff')
  await expect(page.locator('.floating-basket')).toBeHidden()
  await expect(page).toHaveURL(/#shop$/)
  await expect(root).toHaveAttribute('data-handoff-state', 'revealing', { timeout: 1000 })
  await expect(root).toHaveAttribute('data-handoff-state', 'complete', { timeout: 5000 })
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'none')
  await expect(page.locator('.floating-basket')).toBeVisible()
  await expect(page.locator('.video-handoff')).toHaveCount(0)
  await dispatchWheel(page, -300)
  await dispatchWheel(page, 300)
  await expect(root).toHaveAttribute('data-handoff-state', 'complete')
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('one leaf run stays monotonic through scroll storms and harmless parent rerenders', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.addInitScript(() => {
    const state = { loads: 0, plays: 0, seeks: [] as number[], trace: [] as Array<Record<string, unknown>> }
    ;(window as typeof window & { __handoffMediaOps?: typeof state }).__handoffMediaOps = state
    window.addEventListener('farmstandhandofftrace', ((event: CustomEvent<Record<string, unknown>>) => state.trace.push(event.detail)) as EventListener)
    const mediaPrototype = HTMLMediaElement.prototype
    const originalLoad = mediaPrototype.load
    const originalPlay = mediaPrototype.play
    const currentTime = Object.getOwnPropertyDescriptor(mediaPrototype, 'currentTime')
    mediaPrototype.load = function (...args) {
      if (this.matches('.video-handoff video')) state.loads += 1
      return originalLoad.apply(this, args)
    }
    mediaPrototype.play = function (...args) {
      if (this.matches('.video-handoff video')) state.plays += 1
      return originalPlay.apply(this, args)
    }
    if (currentTime?.get && currentTime.set) {
      Object.defineProperty(mediaPrototype, 'currentTime', {
        configurable: currentTime.configurable,
        enumerable: currentTime.enumerable,
        get: currentTime.get,
        set(value: number) {
          if (this.matches('.video-handoff video')) state.seeks.push(value)
          currentTime.set!.call(this, value)
        },
      })
    }
  })
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'armed')
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-handoff-state', 'covering')
  const samples: number[] = []
  for (const deltaY of [80, -70, 120, -90, 140]) {
    await dispatchWheel(page, deltaY)
    await page.evaluate(() => (document.querySelector('.music-toggle') as HTMLButtonElement | null)?.click())
    await page.waitForTimeout(150)
    samples.push(Number(await page.locator('.video-handoff').getAttribute('data-media-time')))
  }
  await page.keyboard.press('PageDown')
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.evaluate(() => {
    const start = new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 500 })
    const move = new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 350 })
    dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start] }))
    dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move] }))
  })
  const mediaTimeAfterStorm = Number(await page.locator('.video-handoff').getAttribute('data-media-time'))
  expect(mediaTimeAfterStorm).toBeGreaterThan(.45)
  expect(samples.every((value, index) => index === 0 || value >= samples[index - 1] - .03)).toBe(true)
  await expect(root).toHaveAttribute('data-handoff-state', 'covered', { timeout: 5000 })
  await dispatchWheel(page, -300)
  await page.keyboard.press('ArrowDown')
  await expect(root).toHaveAttribute('data-handoff-state', 'revealing', { timeout: 2000 })
  await dispatchWheel(page, 300)
  await page.keyboard.press('End')
  await expect(root).toHaveAttribute('data-handoff-state', 'complete', { timeout: 7000 })
  const operations = await page.evaluate(() => (window as typeof window & { __handoffMediaOps?: { loads: number; plays: number; seeks: number[]; trace: Array<{ event: string; runId: number; videoId?: string; committed?: boolean; unlocked?: boolean }> } }).__handoffMediaOps)
  expect({ loads: operations?.loads, plays: operations?.plays, seeks: operations?.seeks }).toEqual({ loads: 1, plays: 1, seeks: [0] })
  const trace = operations?.trace ?? []
  expect(new Set(trace.map((event) => event.runId)).size).toBe(1)
  expect(new Set(trace.map((event) => event.videoId).filter(Boolean)).size).toBe(1)
  expect(trace.filter((event) => event.event === 'commit')).toHaveLength(1)
  expect(trace.filter((event) => event.event === 'initial-frame-presented')).toHaveLength(1)
  expect(trace.findIndex((event) => event.event === 'initial-frame-presented')).toBeLessThan(trace.findIndex((event) => event.event === 'play'))
  expect(trace.filter((event) => event.event === 'terminated')).toHaveLength(1)
  expect(trace.find((event) => event.event === 'commit')).toMatchObject({ committed: true, unlocked: false })
  expect(trace.find((event) => event.event === 'terminated')).toMatchObject({ committed: true, unlocked: true })
  await dispatchWheel(page, -600)
  await dispatchWheel(page, 600)
  await page.waitForTimeout(250)
  expect((await page.evaluate(() => (window as typeof window & { __handoffMediaOps?: { loads: number; plays: number } }).__handoffMediaOps))).toMatchObject({ loads: 1, plays: 1 })
})

test('Escape fail-opens an interrupted video handoff and unlocks the existing basket', async ({ page }) => {
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'armed')
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-handoff-state', 'covering')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'bypassed')
  await expect(page.locator('.video-handoff')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-handoff-state', 'bypassed')
})

test('visibility loss cancels an active handoff and releases its input gate', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'armed')
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-handoff-state', 'covering')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(root).toHaveAttribute('data-handoff-state', 'bypassed')
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'none')
  await expect(root).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('.video-handoff')).toHaveCount(0)
})

test('decoded leaf sound follows video time and stops on interruption', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.addInitScript(() => {
    ;(window as typeof window & { __leafSounds?: string[] }).__leafSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      if (event.detail.name.startsWith('leaf')) {
        ;(window as typeof window & { __leafSounds?: string[] }).__leafSounds?.push(event.detail.name)
      }
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  await page.keyboard.press('Escape')
  await dispatchWheel(page, 120)
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-handoff-state', 'covering')
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __leafSounds?: string[] }).__leafSounds?.filter((name) => name === 'leaf-accent').length ?? 0)).toBeGreaterThanOrEqual(1)
  const mediaTime = Number(await page.locator('.video-handoff').getAttribute('data-media-time'))
  expect(mediaTime).toBeGreaterThanOrEqual(0.58)
  await page.keyboard.press('Escape')
  const soundsAtInterruption = await page.evaluate(() => (window as typeof window & { __leafSounds?: string[] }).__leafSounds?.length ?? 0)
  await page.waitForTimeout(1700)
  expect(await page.evaluate(() => (window as typeof window & { __leafSounds?: string[] }).__leafSounds?.length ?? 0)).toBe(soundsAtInterruption)
})

test('apple roll follows presented travel, stops on interruption, and never plays on direct shop entry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.addInitScript(() => {
    ;(window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }>; __appleStops?: string[] }).__appleStarts = []
    ;(window as typeof window & { __appleStops?: string[] }).__appleStops = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      if (event.detail.name === 'apple-roll') {
        const progress = Number(document.querySelector<HTMLElement>('.scene-host')?.dataset.appleRoll)
        ;(window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }> }).__appleStarts?.push({ name: event.detail.name, progress })
      }
    }) as EventListener)
    window.addEventListener('farmstandsoundstop', ((event: CustomEvent<{ name: string; reason: string }>) => {
      if (event.detail.name === 'apple-roll') (window as typeof window & { __appleStops?: string[] }).__appleStops?.push(event.detail.reason)
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await dispatchWheel(page, 24)
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }> }).__appleStarts?.length ?? 0), { timeout: 7000 }).toBe(1)
  const progressAtStart = await page.evaluate(() => (window as typeof window & { __appleStarts?: Array<{ progress: number }> }).__appleStarts?.[0]?.progress ?? Number.NaN)
  expect(progressAtStart).toBeGreaterThan(0)
  expect(progressAtStart).toBeLessThan(1)
  await page.keyboard.press('Escape')
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __appleStops?: string[] }).__appleStops ?? [])).toContain('controlled')
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => (window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }> }).__appleStarts?.length)).toBe(1)
  await page.evaluate(() => {
    ;(window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }>; __appleStops?: string[] }).__appleStarts = []
    ;(window as typeof window & { __appleStops?: string[] }).__appleStops = []
  })
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => (window as typeof window & { __appleStarts?: Array<{ name: string; progress: number }> }).__appleStarts?.length)).toBe(0)
})

test('failed transition video commits the shop directly without an empty cover or retained lock', async ({ page }) => {
  await page.route('**/media/transitions/leaves-shop-01-alpha.webm', (route) => route.abort())
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-handoff-state', 'armed')
  await page.getByRole('link', { name: 'Explore the demo' }).click()
  await expect(page).toHaveURL(/#shop$/)
  await expect(root).toHaveAttribute('data-handoff-state', 'bypassed')
  await expect(root).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('.video-handoff')).toHaveCount(0)
})

test('animal Polaroids use exact transition 02 without replaying on ordinary farm navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(`${projectPath}#top`, { waitUntil: 'networkidle' })
  const root = page.locator('body > #root > div')
  await page.locator('.entrance-links [data-animal-sound="hens"]').click()
  await expect(root).toHaveAttribute('data-handoff-kind', 'animals')
  await expect(root).toHaveAttribute('data-transition-asset', /leaves-animals-02-alpha\.webm$/)
  await page.waitForTimeout(900)
  await expect(page).toHaveURL(/#top$/)
  await expect(root).toHaveAttribute('data-handoff-state', 'covered', { timeout: 1800 })
  await expect(page.locator('.video-handoff')).toHaveAttribute('data-cover-hold', 'visible')
  const coverTime = Number(await page.locator('.video-handoff').getAttribute('data-cover-time'))
  expect(coverTime).toBeGreaterThanOrEqual(1.9)
  expect(coverTime).toBeLessThanOrEqual(2)
  await expect(root).toHaveAttribute('data-handoff-state', 'idle', { timeout: 2500 })
  await expect(page).toHaveURL(/#hens$/)
  await expect(page.locator('#hens')).toBeFocused()
  await expect(page.locator('#hens')).toHaveAttribute('data-paper-state', 'settled')
  await expect(page.locator('#hens .farm-album__film img')).toBeVisible()
  await page.getByRole('navigation', { name: 'Farm-life scenes', exact: true }).getByRole('link', { name: 'Cattle' }).click()
  await expect(page).toHaveURL(/#cattle$/)
  await expect(page.locator('.video-handoff')).toHaveCount(0)
})

test('rapid explicit navigation aborts the active animal overlay without trapping input', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(`${projectPath}#top`, { waitUntil: 'networkidle' })
  const root = page.locator('body > #root > div')
  await page.locator('.entrance-links [data-animal-sound="hens"]').click()
  await expect(root).toHaveAttribute('data-handoff-state', 'covering')
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Around the farm' }).click()
  await expect(page).toHaveURL(/#farm-life$/)
  await expect(page.locator('.video-handoff')).toHaveCount(0)
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'none')
  await expect(root).toHaveAttribute('data-scroll-hold', 'released')
})

test('scroll hint waits for eligible inactivity, emphasizes once, and stays absent while locked', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(page.locator('[data-scroll-hint]')).toHaveCount(0)
  await page.waitForTimeout(3200)
  await expect(page.locator('[data-scroll-hint="closed"]')).toBeVisible()
  await dispatchWheel(page, 24)
  await expect(page.locator('[data-scroll-hint]')).toHaveCount(0)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'active')
  await page.waitForTimeout(3200)
  await expect(page.locator('[data-scroll-hint]')).toHaveCount(0)
})

test('music requests honestly on arrival, persists mute, and keeps the shutter independent', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __heardSounds?: string[] }).__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      ;(window as typeof window & { __heardSounds?: string[] }).__heardSounds?.push(event.detail.name)
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  const music = page.locator('.music-toggle')
  await expect(music).toHaveAttribute('data-music-state', /playing|blocked/, { timeout: 8000 })

  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => /\/audio\//.test(entry.name)))).toBe(true)
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.includes('shutter'))).toBe(true)
  await page.keyboard.press('Escape')

  if (await music.getAttribute('data-music-state') === 'playing') await music.click()
  await expect(music).toHaveAttribute('data-music-state', 'muted')
  expect(await page.evaluate(() => sessionStorage.getItem('farm-stand-music-muted-v1'))).toBe('true')
  await page.reload()
  await expect(page.locator('.music-toggle')).toHaveAttribute('data-music-state', 'muted')
})

test('blocked autoplay is disclosed and the first eligible interaction retries it', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0
    const original = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      calls += 1
      if (calls === 1) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'))
      return original.call(this)
    }
  })
  await page.goto(projectPath)
  const music = page.locator('.music-toggle')
  await expect(music).toHaveAttribute('data-music-state', 'blocked', { timeout: 8000 })
  await expect(music).toHaveAccessibleName(/browser permission is needed/)
  await page.mouse.click(8, 320)
  await expect(music).toHaveAttribute('data-music-state', 'playing', { timeout: 8000 })
})

test('mute cancels an unresolved music start and wins the late play race', async ({ page }) => {
  await page.addInitScript(() => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    ;(window as typeof window & { __releaseMusic?: () => void }).__releaseMusic = release
    HTMLMediaElement.prototype.play = () => pending
  })
  await page.goto(projectPath)
  const music = page.locator('.music-toggle')
  await expect(music).toHaveAttribute('data-music-state', 'starting')
  await expect(music).toHaveAccessibleName('Cancel background music request')
  await music.click()
  await expect(music).toHaveAttribute('data-music-state', 'muted')
  await page.evaluate(() => (window as typeof window & { __releaseMusic?: () => void }).__releaseMusic?.())
  await page.waitForTimeout(100)
  await expect(music).toHaveAttribute('data-music-state', 'muted')
})

test('audio file failure degrades to partial sound without blocking navigation', async ({ page }) => {
  await page.route('**/audio/sheep-bleat.mp3', (route) => route.abort())
  await page.goto(projectPath)
  await page.getByRole('button', { name: 'Play background music' }).click()
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', 'partial', { timeout: 8000 })
  await page.getByRole('link', { name: 'Shop' }).first().click()
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
})

test('interface actions have distinct pen and paper cues without a duplicate generic click', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string; gain: number }>) => {
      ;(window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds?.push(event.detail)
    }) as EventListener)
  })
  await openShop(page)
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await page.evaluate(() => { (window as typeof window & { __heardSounds?: unknown[] }).__heardSounds = [] })

  await page.getByRole('button', { name: /^Fruit & veg 28/ }).click()
  const apple = page.locator('#product-apple')
  await apple.getByRole('button', { name: 'View details' }).click()
  await page.getByRole('dialog', { name: /Orchard apples/ }).getByRole('button', { name: 'Close product details' }).click()
  await apple.getByRole('button', { name: 'Add to basket' }).click()
  const drawer = await openFullBasket(page, 1)
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await drawer.getByRole('button', { name: 'Remove' }).click()

  const names = await page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string }> }).__heardSounds ?? []).map(({ name }) => name))
  expect(names.filter((name) => name === 'filter')).toHaveLength(1)
  expect(names.filter((name) => name === 'details-open')).toHaveLength(1)
  expect(names.filter((name) => name === 'details-close')).toHaveLength(1)
  expect(names.filter((name) => name === 'add')).toHaveLength(1)
  expect(names.filter((name) => name === 'quantity')).toHaveLength(1)
  expect(names.filter((name) => name === 'remove')).toHaveLength(1)
  expect(names).not.toContain('ui')
})

test('decoded sound pools vary without adjacent repeats and exclude a failed variant', async ({ page }) => {
  await page.route('**/audio/quantity-2.mp3', (route) => route.abort())
  await page.addInitScript(() => {
    ;(window as typeof window & { __farmStandSoundRandom?: () => number }).__farmStandSoundRandom = () => 0.37
    ;(window as typeof window & { __soundVariants?: string[] }).__soundVariants = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string; variant?: string }>) => {
      if (event.detail.name === 'quantity' && event.detail.variant) {
        ;(window as typeof window & { __soundVariants?: string[] }).__soundVariants?.push(event.detail.variant)
      }
    }) as EventListener)
  })
  await openShop(page)
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', 'partial', { timeout: 8000 })
  await addProduct(page, 'apple')
  const drawer = await openFullBasket(page, 1)
  const increase = drawer.getByRole('button', { name: 'Increase Orchard apples quantity' })
  for (let index = 0; index < 5; index += 1) {
    await increase.click()
    await page.waitForTimeout(85)
  }
  const variants = await page.evaluate(() => (window as typeof window & { __soundVariants?: string[] }).__soundVariants ?? [])
  expect(variants).toHaveLength(5)
  expect(variants).not.toContain('quantity-2.mp3')
  expect(variants.every((variant, index) => index === 0 || variant !== variants[index - 1])).toBe(true)
  expect(new Set(variants)).toEqual(new Set(['quantity.mp3', 'quantity-3.mp3', 'quantity-4.mp3']))
})

test('bird enters clear of the structure, idles on timber, and completes its reaction sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  // The authored sequence deliberately observes idle motion before five
  // reactions. Software WebGL on the release runner can take over 30 seconds
  // without changing application-time behavior.
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    ;(window as typeof window & { __birdSounds?: string[]; __appleSounds?: string[] }).__birdSounds = []
    ;(window as typeof window & { __appleSounds?: string[] }).__appleSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      if (event.detail.name === 'bird') (window as typeof window & { __birdSounds?: string[] }).__birdSounds?.push(event.detail.name)
      if (event.detail.name === 'apple-roll') (window as typeof window & { __appleSounds?: string[] }).__appleSounds?.push(event.detail.name)
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  const scene = page.locator('.scene-host')
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await expect(scene).toHaveAttribute('data-bird-state', 'ready')
  await expect(scene).toHaveAttribute('data-bird-take', 'Take 001')
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  const entrance = await page.evaluate(async () => {
    const host = document.querySelector<HTMLElement>('.scene-host')!
    const stage = document.querySelector<HTMLElement>('.hero-stage')!
    const samples: Array<Record<string, string>> = []
    while (stage.dataset.openingState !== 'open' && samples.length < 180) {
      samples.push({ ...host.dataset })
      await new Promise((resolve) => setTimeout(resolve, 45))
    }
    samples.push({ ...host.dataset })
    return samples
  })
  await expect(scene).toHaveAttribute('data-bird-phase', 'perched')
  await expect(scene).toHaveAttribute('data-bird-affects-apple', 'false')
  expect(entrance.some((sample) => sample.birdPhase?.startsWith('airborne-'))).toBe(true)
  // A heavily throttled software renderer may skip complete visual phases.
  // Prove all six authored cycles from the deterministic normalized evaluator;
  // rendered evidence separately verifies normal-speed visibility and contact.
  expect(BIRD_ENTRANCE_HOP_COUNT).toBe(6)
  for (const portrait of [false, true]) {
    for (let hop = 0; hop < BIRD_ENTRANCE_HOP_COUNT; hop += 1) {
      const airborneProgress = .38 + ((hop + .44) / BIRD_ENTRANCE_HOP_COUNT) * .56
      const recoveryProgress = .38 + ((hop + .86) / BIRD_ENTRANCE_HOP_COUNT) * .56
      const airborne = evaluateBirdEntrance(airborneProgress, portrait, 1)
      const recovery = evaluateBirdEntrance(recoveryProgress, portrait, 1)
      expect(airborne).toMatchObject({ hopIndex: hop, phase: 'airborne', planted: false })
      expect(airborne.lift).toBeGreaterThan(0)
      expect(recovery).toMatchObject({ hopIndex: hop, phase: 'recovery', planted: true, lift: 0 })
    }
  }
  expect(await scene.getAttribute('data-bird-visible-hops')).toMatch(/\d/)
  expect(await scene.getAttribute('data-bird-entry-planted-phases')).toMatch(/(?:anticipation|recovery)-/)
  await expect(scene).toHaveAttribute('data-bird-pose-composition', 'restored-imported-base+bounded-procedural-delta')
  await expect(scene).toHaveAttribute('data-bird-take-time', '1.35')
  expect(Number(await scene.getAttribute('data-bird-clearance-sweep-min'))).toBeGreaterThan(.015)
  expect(entrance.every((sample) => sample.birdEnvelopeCollisionFree !== 'false')).toBe(true)
  expect(Number(await scene.getAttribute('data-bird-foot-contact-error'))).toBeLessThanOrEqual(0.001)
  expect(Number(await scene.getAttribute('data-bird-foot-support-margin'))).toBeGreaterThan(.1)
  expect(Number(await scene.getAttribute('data-bird-planted-support-sweep-min'))).toBeGreaterThan(.05)
  expect(Number(await scene.getAttribute('data-bird-apple-sweep-min'))).toBeGreaterThan(.2)
  await expect(bird).toBeVisible()
  const appleX = await scene.getAttribute('data-apple-x')
  const restPoseSignature = await scene.getAttribute('data-bird-pose-signature')
  expect(await page.evaluate(() => (window as typeof window & { __appleSounds?: string[] }).__appleSounds?.length)).toBe(1)
  const idleKinds = new Set<string>()
  for (let index = 0; index < 30; index += 1) {
    idleKinds.add(await scene.getAttribute('data-bird-idle-action') ?? '')
    await page.waitForTimeout(200)
  }
  expect([...idleKinds].some((kind) => kind !== '' && kind !== 'rest')).toBe(true)
  for (let reaction = 1; reaction <= 3; reaction += 1) {
    await bird.click()
    await expect(scene).toHaveAttribute('data-bird-reaction-count', String(reaction))
    while ((await scene.getAttribute('data-bird-reaction')) !== 'none') {
      await page.waitForTimeout(30)
    }
  }
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __birdSounds?: string[] }).__birdSounds?.length)).toBe(3)
  expect(Number(await scene.getAttribute('data-bird-turn-sweep-max'))).toBeGreaterThanOrEqual(359)
  await expect(scene).toHaveAttribute('data-bird-last-turn-degrees', '360.00')
  await expect(scene).toHaveAttribute('data-bird-root-x', '0.0000')
  await expect(scene).toHaveAttribute('data-bird-root-z', '0.0000')
  await expect(scene).toHaveAttribute('data-bird-yaw-degrees', '0.00')
  await expect(scene).toHaveAttribute('data-bird-planted', 'true')
  expect(await scene.getAttribute('data-bird-pose-signature')).toBe(restPoseSignature)
  expect(await scene.getAttribute('data-apple-x')).toBe(appleX)
  await bird.focus()
  await page.keyboard.press('Enter')
  await expect(scene).toHaveAttribute('data-bird-reaction-count', '4')
  const reactionsBeforeBurst = Number(await scene.getAttribute('data-bird-reaction-count'))
  await bird.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
    ;(element as HTMLButtonElement).click()
    ;(element as HTMLButtonElement).click()
  })
  await expect(scene).toHaveAttribute('data-bird-reaction-queued', 'true')
  await expect.poll(async () => Number(await scene.getAttribute('data-bird-reaction-count'))).toBeGreaterThan(reactionsBeforeBurst)
  await expect(scene).toHaveAttribute('data-bird-reaction', 'none', { timeout: 10_000 })
  const reactionsAfterBurst = Number(await scene.getAttribute('data-bird-reaction-count'))
  // If the preceding keyboard reaction is still active, the burst adds one
  // queued reaction. If a throttled runner completes it between the assertion
  // and the burst, the first click starts one and the second queues one. It
  // must never start or queue all three clicks independently.
  expect(reactionsAfterBurst).toBeLessThanOrEqual(reactionsBeforeBurst + 2)
  await page.waitForTimeout(200)
  await expect(scene).toHaveAttribute('data-bird-reaction-count', String(reactionsAfterBurst))
})

test('reduced motion keeps a stable keyboard-operable bird perch', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await expect(bird).toBeVisible()
  await expect(bird.locator('img')).toBeVisible()
  await bird.focus()
  await expect(bird).toBeFocused()
  await context.close()
})

test('a cold delayed chirp is queued once and starts from the accepted reaction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.route('**/audio/bird-chirp*.mp3', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 520))
    await route.continue()
  })
  await page.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    ;(window as typeof window & { __soundTrace?: Array<Record<string, unknown>>; __actualBirdStarts?: number }).__soundTrace = []
    ;(window as typeof window & { __actualBirdStarts?: number }).__actualBirdStarts = 0
    addEventListener('farmstandsoundtrace', ((event: CustomEvent<Record<string, unknown>>) => {
      if (event.detail.name === 'bird') (window as typeof window & { __soundTrace?: Array<Record<string, unknown>> }).__soundTrace?.push(event.detail)
    }) as EventListener)
    addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      if (event.detail.name === 'bird') (window as typeof window & { __actualBirdStarts?: number }).__actualBirdStarts = ((window as typeof window & { __actualBirdStarts?: number }).__actualBirdStarts ?? 0) + 1
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' })
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await expect(bird).toBeVisible({ timeout: 8000 })
  await bird.click()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __actualBirdStarts?: number }).__actualBirdStarts ?? 0), { timeout: 2000 }).toBe(1)
  const trace = await page.evaluate(() => (window as typeof window & { __soundTrace?: Array<{ stage: string; reason?: string }> }).__soundTrace ?? [])
  expect(trace.some(({ stage }) => stage === 'requested')).toBe(true)
  expect(trace.some(({ stage }) => stage === 'accepted')).toBe(true)
  expect(trace.some(({ stage }) => stage === 'queued')).toBe(true)
  expect(trace.some(({ stage }) => stage === 'started')).toBe(true)
  expect(trace.filter(({ stage }) => stage === 'started')).toHaveLength(1)
})

test('failed chirp variants stay isolated and a hidden pending cue never replays stale', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  let releaseValidChirps!: () => void
  const validChirpsBlocked = new Promise<void>((resolve) => { releaseValidChirps = resolve })
  await page.route('**/audio/bird-chirp-2.mp3', (route) => route.abort())
  await page.route('**/audio/bird-chirp.mp3', async (route) => {
    await validChirpsBlocked
    await route.continue()
  })
  await page.route('**/audio/bird-chirp-3.mp3', async (route) => {
    await validChirpsBlocked
    await route.continue()
  })
  await page.addInitScript(() => {
    sessionStorage.setItem('farm-stand-market-opening-v2', 'complete')
    ;(window as typeof window & { __testHidden?: boolean }).__testHidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => Boolean((window as typeof window & { __testHidden?: boolean }).__testHidden) })
    ;(window as typeof window & { __soundTrace?: Array<Record<string, unknown>>; __birdVariants?: string[] }).__soundTrace = []
    ;(window as typeof window & { __birdVariants?: string[] }).__birdVariants = []
    addEventListener('farmstandsoundtrace', ((event: CustomEvent<Record<string, unknown>>) => {
      if (event.detail.name === 'bird') (window as typeof window & { __soundTrace?: Array<Record<string, unknown>> }).__soundTrace?.push(event.detail)
    }) as EventListener)
    addEventListener('farmstandsound', ((event: CustomEvent<{ name: string; variant?: string }>) => {
      if (event.detail.name === 'bird' && event.detail.variant) (window as typeof window & { __birdVariants?: string[] }).__birdVariants?.push(event.detail.variant)
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' })
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await expect(bird).toBeVisible({ timeout: 8000 })
  await bird.click()
  await page.evaluate(() => {
    ;(window as typeof window & { __testHidden?: boolean }).__testHidden = true
    document.dispatchEvent(new Event('visibilitychange'))
  })
  releaseValidChirps()
  await page.waitForTimeout(850)
  expect(await page.evaluate(() => (window as typeof window & { __birdVariants?: string[] }).__birdVariants)).toEqual([])
  await page.evaluate(() => {
    ;(window as typeof window & { __testHidden?: boolean }).__testHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await bird.click()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __birdVariants?: string[] }).__birdVariants?.length ?? 0), { timeout: 2000 }).toBe(1)
  const result = await page.evaluate(() => ({
    variants: (window as typeof window & { __birdVariants?: string[] }).__birdVariants ?? [],
    trace: (window as typeof window & { __soundTrace?: Array<{ stage: string; reason?: string; asset?: string }> }).__soundTrace ?? [],
  }))
  expect(result.variants).not.toContain('bird-chirp-2.mp3')
  expect(result.trace.some(({ stage, reason }) => stage === 'suppressed' && reason === 'hidden')).toBe(true)
  expect(result.trace.some(({ stage, reason, asset }) => stage === 'asset-failed' && reason === 'asset-failed' && asset === 'bird-chirp-2.mp3')).toBe(true)
  expect(result.trace.filter(({ stage }) => stage === 'started')).toHaveLength(1)
})

test('portrait bird entrance clears the post and plants only on supported timber', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'portrait-chromium')
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  const scene = page.locator('.scene-host')
  await expect(scene).toHaveAttribute('data-bird-state', 'ready')
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open', { timeout: 12_000 })
  await expect(scene).toHaveAttribute('data-bird-phase', 'perched')
  expect(Number(await scene.getAttribute('data-bird-clearance-sweep-min'))).toBeGreaterThan(.015)
  expect(Number(await scene.getAttribute('data-bird-planted-support-sweep-min'))).toBeGreaterThan(.05)
  expect(Number(await scene.getAttribute('data-bird-apple-sweep-min'))).toBeGreaterThan(.2)
  await expect(scene).toHaveAttribute('data-bird-envelope-collision-free', 'true')
  expect(Number(await scene.getAttribute('data-bird-foot-contact-error'))).toBeLessThanOrEqual(.001)
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await bird.tap()
  await expect(scene).toHaveAttribute('data-bird-reaction-count', '1')
})

test('bird model failure keeps the static perch and accessible chirp control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.route('**/models/bird-orange/bird-orange.glb', (route) => route.abort())
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  const scene = page.locator('.scene-host')
  const bird = page.getByRole('button', { name: 'Hear the bird chirp' })
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(scene).toHaveAttribute('data-bird-state', 'static')
  await expect(bird).toBeVisible()
  await expect(bird.locator('img')).toBeVisible()
  await bird.focus()
  await expect(bird).toBeFocused()
})

test('failed actions stay silent while confirmed clear and copy use their own cues', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __heardSounds?: string[] }).__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      ;(window as typeof window & { __heardSounds?: string[] }).__heardSounds?.push(event.detail.name)
    }) as EventListener)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } })
  })
  await page.goto(`${projectPath}#shop`)
  await page.evaluate(() => sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: { apple: 12 } })))
  await page.reload({ waitUntil: 'networkidle' })
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await page.evaluate(() => { (window as typeof window & { __heardSounds?: string[] }).__heardSounds = [] })

  await page.locator('#product-apple').getByRole('button', { name: 'Add to basket' }).click()
  await page.getByRole('button', { name: /^Market picks 12/ }).click()
  expect(await page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds)).toEqual([])

  const drawer = await openFullBasket(page, 12)
  await drawer.getByRole('button', { name: 'Clear demonstration basket' }).click()
  expect(await page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.filter((name) => name === 'clear'))).toEqual([])
  await drawer.getByRole('button', { name: 'Yes, clear it' }).click()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.filter((name) => name === 'clear'))).toEqual(['clear'])
  await drawer.getByRole('button', { name: 'Continue browsing' }).click()

  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.getByLabel('What should your website help with?').fill('Keep sample opening information easy to find.')
  await page.getByRole('button', { name: 'Copy website note' }).click()
  await expect(page.getByText('Note copied', { exact: true })).toBeVisible()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.filter((name) => name === 'confirm'))).toEqual(['confirm'])
})

test('basket transitions emit one semantic open or close cue without a mini-to-full close', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __heardSounds?: string[] }).__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => {
      if (event.detail.name.startsWith('basket-')) (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.push(event.detail.name)
    }) as EventListener)
  })
  await openShop(page)
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await page.evaluate(() => { (window as typeof window & { __heardSounds?: string[] }).__heardSounds = [] })
  await page.getByRole('button', { name: /Open basket preview/ }).click()
  await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
  await page.getByRole('dialog', { name: /Your basket/ }).getByRole('button', { name: 'Close basket' }).click()
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds)).toEqual(['basket-open', 'basket-open', 'basket-close'])
})

test('source-calibrated animal cues stay restrained and do not stack on duplicate activation', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string; gain: number }>) => {
      ;(window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds?.push(event.detail)
    }) as EventListener)
  })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await page.mouse.click(8, 320)
  await expect(page.locator('.sound-controls')).toHaveAttribute('data-sound-status', /ready|partial/, { timeout: 8000 })
  await page.locator('.entrance-links [data-animal-sound="cattle"]').click()
  await expect.poll(async () => page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds ?? []).find(({ name }) => name === 'cattle')?.gain)).toBeCloseTo(.039, 3)
  await page.locator('.entrance-links [data-animal-sound="cattle"]').evaluate((link) => (link as HTMLAnchorElement).click())
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string }> }).__heardSounds ?? []).filter(({ name }) => name === 'cattle').length)).toBe(1)
})

test('fixed header compacts after real scrolling and restores only at the true top', async ({ page }) => {
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  const header = page.locator('.site-header')
  await expect(header).toHaveAttribute('data-compact', 'true')
  const anchorGeometry = await page.evaluate(() => ({ headerBottom: document.querySelector('.site-header')!.getBoundingClientRect().bottom, headingTop: document.querySelector('#shop h2')!.getBoundingClientRect().top }))
  expect(anchorGeometry.headingTop).toBeGreaterThanOrEqual(anchorGeometry.headerBottom)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect(header).toHaveAttribute('data-compact', 'false')
  await page.evaluate(() => scrollTo({ top: 180, behavior: 'instant' }))
  await expect(header).toHaveAttribute('data-compact', 'true')
  const geometry = await header.evaluate((element) => ({ top: element.getBoundingClientRect().top, position: getComputedStyle(element).position }))
  expect(geometry).toEqual({ top: 0, position: 'fixed' })
  await page.evaluate(() => scrollTo({ top: 20, behavior: 'instant' }))
  await expect(header).toHaveAttribute('data-compact', 'false')
})

test('contact editing preserves exact long input through insertion and undo without multiplying or overflowing', async ({ page }) => {
  await page.goto(`${projectPath}#contact`, { waitUntil: 'networkidle' })
  const field = page.getByLabel('What should your website help with?')
  const original = `${'Long farm detail '.repeat(310)}END-MARKER`
  await field.fill(original)
  await field.evaluate((node) => {
    const textarea = node as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(13, 13)
  })
  await page.keyboard.insertText('PASTE-MARKER ')
  const inserted = `${original.slice(0, 13)}PASTE-MARKER ${original.slice(13)}`
  await expect(field).toHaveValue(inserted)
  await page.keyboard.press('Control+z')
  await expect(field).toHaveValue(original)
  const result = await page.locator('#contact').evaluate((section, expected) => {
    const summary = section.querySelector('.brief-summary')!
    return {
      summaries: section.querySelectorAll('.brief-summary').length,
      markerCount: (summary.textContent?.match(/END-MARKER/g) ?? []).length,
      exactValue: (section.querySelector('textarea') as HTMLTextAreaElement).value === expected,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sectionOverflow: section.scrollWidth - section.clientWidth,
    }
  }, original)
  expect(result).toEqual({ summaries: 1, markerCount: 1, exactValue: true, pageOverflow: 0, sectionOverflow: 0 })
})

test('farm album stays readable without horizontal overflow across required narrow and short views', async ({ page }) => {
  for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 960, height: 540 }, { width: 1920, height: 900 }]) {
    await page.setViewportSize(size)
    await page.goto(`${projectPath}#hens`, { waitUntil: 'domcontentloaded' })
    const layout = await page.locator('.farm-album').evaluate((album) => {
      const film = album.querySelector('#hens .farm-album__film')!.getBoundingClientRect()
      const controls = album.querySelector('#hens .farm-album__controls')!.getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        filmLeft: film.left,
        filmRight: innerWidth - film.right,
        controlsRight: innerWidth - controls.right,
      }
    })
    expect(layout.overflow, `${size.width}x${size.height}`).toBeLessThanOrEqual(1)
    expect(layout.filmLeft, `${size.width}x${size.height}`).toBeGreaterThanOrEqual(8)
    expect(layout.filmRight, `${size.width}x${size.height}`).toBeGreaterThanOrEqual(8)
    expect(layout.controlsRight, `${size.width}x${size.height}`).toBeGreaterThanOrEqual(8)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${projectPath}#hens`)
  await page.addStyleTag({ content: '.farm-album { font-size: 200% !important; }' })
  await page.locator('#hens').scrollIntoViewIfNeeded()
  expect(await page.locator('.farm-album').evaluate((album) => album.scrollWidth - album.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.locator('#hens').getByRole('button', { name: /Hens: (Play|Pause) film/ })).toBeVisible()
})

test('reduced motion presents complete still states and keeps manual video control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  await expect(page.getByTestId('scene-host')).toBeHidden()
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-handoff-state', 'bypassed')
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await page.goto(`${projectPath}#sheep`)
  await expect(page.locator('#sheep').getByRole('button', { name: 'Sheep: Play film' })).toBeVisible()
  await expect(page.locator('#sheep')).toHaveAttribute('data-paper-state', 'settled')
  expect(await page.locator('#sheep video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
})

test('model, opening-image, product-image, and video failures retain complete fallbacks', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.route('**/media/real-farm/*.avif', (route) => route.abort())
  await page.route('**/media/catalogue-expanded/apple.avif*', (route) => route.abort())
  await page.route('**/media/farm-life-motion/hens.mp4', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'fallback')
  await openShop(page, false)
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Orchard apples image unavailable/ })).toBeVisible()
  await page.goto(`${projectPath}#hens`)
  await expect(page.locator('#hens')).toHaveAttribute('data-media-state', 'error')
  await expect(page.locator('#hens img')).toBeVisible()
  await expect(page.locator('#hens').getByRole('button', { name: 'Retry film' })).toBeVisible()
})

test('layouts avoid horizontal overflow and portrait basket stays within the viewport', async ({ page }) => {
  for (const size of [{ width: 320, height: 740 }, { width: 900, height: 700 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size)
    await openShop(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${size.width}x${size.height}`).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await addProduct(page, 'apple')
  await page.getByRole('button', { name: /Open basket preview/ }).click()
  await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
  await page.waitForTimeout(450)
  const drawer = page.getByRole('dialog', { name: /Your basket/ })
  const rect = await drawer.evaluate((node) => node.getBoundingClientRect())
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.right).toBeLessThanOrEqual(390)
  expect(rect.bottom).toBeLessThanOrEqual(844)
  const controlRects = await drawer.locator('.basket-quantity button').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect()
    return { width: box.width, height: box.height, radius: getComputedStyle(button).borderRadius }
  }))
  expect(controlRects.length).toBeGreaterThan(0)
  expect(controlRects.every(({ width, height, radius }) => width === 44 && height === 44 && radius === '50%')).toBe(true)
})

test('dense basket keeps product copy adjacent at 390px and 320px', async ({ page }) => {
  const lines = { apple: 1, 'farm-tee:s': 1, 'farm-tee:m': 12, 'fruit-box': 2, 'pickled-cucumbers': 3, watermelon: 1, eggs: 4 }
  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(size)
    await page.goto(`${projectPath}#shop`)
    await page.evaluate((value) => sessionStorage.setItem('farm-stand-demo-basket-v2', JSON.stringify({ version: 2, lines: value })), lines)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Open basket preview, 24 items/ }).click()
    await page.getByRole('dialog', { name: 'At a glance' }).getByRole('button', { name: 'View full basket' }).click()
    const drawer = page.getByRole('dialog', { name: /Your basket/ })
    const geometry = await drawer.locator('.basket-lines li').first().evaluate((row) => {
      const image = row.querySelector('.basket-line-image')!.getBoundingClientRect()
      const copy = row.querySelector('.basket-line-copy')!.getBoundingClientRect()
      return { imageRight: image.right, imageTop: image.top, copyLeft: copy.left, copyTop: copy.top }
    })
    expect(geometry.copyLeft).toBeGreaterThan(geometry.imageRight)
    expect(Math.abs(geometry.copyTop - geometry.imageTop)).toBeLessThan(8)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await drawer.getByRole('button', { name: 'Close basket' }).click()
  }
})

test('visit, service, and contact remain fictional and send nothing', async ({ page }) => {
  const writes: string[] = []
  page.on('request', (request) => { if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`) })
  await page.goto(`${projectPath}#visit`)
  await expect(page.getByText('These are sample times, not live opening hours.')).toBeVisible()
  await expect(page.getByText('This is a demonstration farm, so there is no visitor address.')).toBeVisible()
  await page.locator('#website').scrollIntoViewIfNeeded()
  await page.getByText('Try changing the hours', { exact: true }).click()
  await page.getByLabel('Opens').fill('10:30')
  await expect(page.locator('.try-update')).toContainText('10:30 am–1:00 pm')
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: /send|submit/i })).toHaveCount(0)
  expect(writes).toEqual([])
})

test('sample hours validate same-day ranges, reset exactly, and never change basket collection data', async ({ page }) => {
  await page.goto(`${projectPath}#website`, { waitUntil: 'networkidle' })
  const initialBasket = await page.evaluate(() => sessionStorage.getItem('farm-stand-demo-basket-v2'))
  await page.getByText('Try changing the hours', { exact: true }).click()
  const opens = page.getByLabel('Opens')
  const closes = page.getByLabel('Closes')

  await opens.fill('10:30')
  await closes.fill('12:15')
  await expect(page.locator('.hours-value')).toHaveText('10:30 am–12:15 pm')
  await expect(opens).toHaveAttribute('aria-invalid', 'false')

  await closes.fill('08:00')
  await expect(page.locator('.hours-value')).toHaveText('Hours need checking')
  await expect(page.getByText('Closing must be later than opening for this same-day example.')).toBeVisible()
  await expect(closes).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('button', { name: 'Reset sample' }).click()
  await expect(opens).toHaveValue('09:00')
  await expect(closes).toHaveValue('13:00')
  await expect(page.locator('.hours-value')).toHaveText('9:00 am–1:00 pm')
  expect(await page.evaluate(() => sessionStorage.getItem('farm-stand-demo-basket-v2'))).toBe(initialBasket)
})

test('project postcard formats Unicode and repetition once, rejects blank notes, and suppresses stale copy success', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      __copiedNotes?: string[]
      __copyResolvers?: Array<() => void>
      __heardSounds?: string[]
    }
    state.__copiedNotes = []
    state.__copyResolvers = []
    state.__heardSounds = []
    window.addEventListener('farmstandsound', ((event: CustomEvent<{ name: string }>) => state.__heardSounds?.push(event.detail.name)) as EventListener)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          state.__copiedNotes?.push(value)
          return new Promise<void>((resolve) => state.__copyResolvers?.push(resolve))
        },
      },
    })
  })
  await page.goto(`${projectPath}#contact`, { waitUntil: 'networkidle' })
  const brief = page.getByLabel('What should your website help with?')
  const copy = page.locator('.postcard__actions .button')

  await copy.click()
  await expect(brief).toBeFocused()
  await expect(page.getByText('Add a short note about what the website should help with.')).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { __copiedNotes?: string[] }).__copiedNotes)).toEqual([])

  await page.getByLabel('Business name (optional)').fill("Café d'Árvore 🌱")
  await brief.fill('Keep pears.\nKeep pears.\n第二行 — unchanged.')
  await copy.click()
  await expect(copy).toHaveText('Copying…')
  await brief.fill('A newer note while copying.')
  await page.evaluate(() => (window as typeof window & { __copyResolvers?: Array<() => void> }).__copyResolvers?.shift()?.())
  await expect(page.getByText('Note copied', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.filter((name) => name === 'confirm'))).toEqual([])
  expect(await page.evaluate(() => (window as typeof window & { __copiedNotes?: string[] }).__copiedNotes?.[0])).toBe(
    "Farm Stand website note\n\nBusiness name: Café d'Árvore 🌱\n\nWhat should the website help with?\nKeep pears.\nKeep pears.\n第二行 — unchanged.",
  )

  await copy.click()
  await page.evaluate(() => (window as typeof window & { __copyResolvers?: Array<() => void> }).__copyResolvers?.shift()?.())
  await expect(page.getByText('Note copied', { exact: true })).toBeVisible()
  await expect(page.getByText('Copied', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { __heardSounds?: string[] }).__heardSounds?.filter((name) => name === 'confirm'))).toEqual(['confirm'])
})

test('clipboard rejection expands selectable preview and the download matches the same formatter', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('blocked') } } })
  })
  await page.goto(`${projectPath}#contact`, { waitUntil: 'networkidle' })
  await page.getByLabel('What should your website help with?').fill('Keep the workshop hours clear.\nPreserve this second line.')
  await page.getByRole('button', { name: 'Copy website note' }).click()
  await expect(page.getByText('Clipboard unavailable. The note is selected below; download is also available.')).toBeVisible()
  await expect(page.locator('.postcard__preview')).toHaveAttribute('open', '')
  await expect.poll(async () => page.evaluate(() => window.getSelection()?.toString() ?? '')).toContain('Keep the workshop hours clear.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download note (.txt)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('farm-stand-website-note.txt')
  const stream = await download.createReadStream()
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) chunks.push(chunk)
  const contents = Buffer.concat(chunks).toString('utf8')
  expect(contents).toBe('Farm Stand website note\n\nWhat should the website help with?\nKeep the workshop hours clear.\nPreserve this second line.')
})

test('after-album hashes, credits, narrow layouts, and 200 percent text remain usable', async ({ page }) => {
  for (const id of ['visit', 'website', 'contact']) {
    await page.goto('about:blank')
    await page.goto(`${projectPath}#${id}`, { waitUntil: 'domcontentloaded' })
    const geometry = await page.evaluate((targetId) => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect()
      const target = document.getElementById(targetId)!.getBoundingClientRect()
      return { headerBottom: header.bottom, targetTop: target.top }
    }, id)
    expect(geometry.targetTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1)
    expect(geometry.targetTop).toBeLessThan(geometry.headerBottom + 140)
  }

  await page.goto(`${projectPath}#website`)
  await page.getByRole('link', { name: 'Write a website note' }).click()
  await expect(page).toHaveURL(/#contact$/)
  await page.goBack()
  await expect(page).toHaveURL(/#website$/)

  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.getByText('Sources & credits', { exact: true }).click()
  await expect(page.getByText(/Bird Orange: user-supplied asset/)).toBeVisible()
  await expect(page.getByText(/Notebook pencil studies: user-supplied/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Icons8', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Morning/ })).toBeVisible()

  for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 960, height: 540 }, { width: 1920, height: 900 }]) {
    await page.setViewportSize(size)
    await page.goto(`${projectPath}#contact`, { waitUntil: 'domcontentloaded' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${size.width}x${size.height}`).toBeLessThanOrEqual(1)
    await expect(page.getByRole('button', { name: 'Copy website note' })).toBeVisible()
  }

  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto(`${projectPath}#contact`)
  const copyButton = page.getByRole('button', { name: 'Copy website note' })
  await copyButton.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => {
    const action = document.querySelector('.postcard__actions .button')!.getBoundingClientRect()
    const basket = document.querySelector('.floating-basket')!.getBoundingClientRect()
    return !(action.right <= basket.left || action.left >= basket.right || action.bottom <= basket.top || action.top >= basket.bottom)
  })).toBe(false)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.getByText('Sources & credits', { exact: true }).click()
  await page.locator('.site-footer__credits p:last-child').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => {
    const credit = document.querySelector('.site-footer__credits p:last-child')!.getBoundingClientRect()
    const basket = document.querySelector('.floating-basket')!.getBoundingClientRect()
    return !(credit.right <= basket.left || credit.left >= basket.right || credit.bottom <= basket.top || credit.top >= basket.bottom)
  })).toBe(false)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${projectPath}#contact`)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Download note (.txt)' })).toBeVisible()
})

test('two-hundred-percent text sizing keeps the market operable without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openShop(page, false)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: /^Boxes 2/ })).toBeVisible()
})
