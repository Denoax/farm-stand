import { expect, test, type Page } from '@playwright/test'

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

test('single scroll hold lasts through presented completion, preserves position, and never repeats', async ({ page }, testInfo) => {
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
  if (testInfo.project.name === 'portrait-chromium') await page.evaluate(() => scrollBy(0, 800))
  else await page.mouse.wheel(0, 800)
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.evaluate(() => scrollTo(0, 0))
  await dispatchWheel(page, 40)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
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
  expect(Number(await scene.getAttribute('data-track-clearance'))).toBeGreaterThan(0)
  expect(Number(await scene.getAttribute('data-fascia-clearance'))).toBeGreaterThan(0)
  expect(Math.abs(Number(await scene.getAttribute('data-counter-penetration')))).toBeLessThan(.001)
  expect(Number(await scene.getAttribute('data-assembly-min-clearance'))).toBeGreaterThan(0)
  await expect(scene).toHaveAttribute('data-clearance-sweep-samples', '101')
  expect(Number(await scene.getAttribute('data-clearance-sweep-min'))).toBeGreaterThan(0)
  expect(Math.abs(Number(await scene.getAttribute('data-clearance-sweep-max-counter-penetration')))).toBeLessThan(.001)
  await expect(scene).toHaveAttribute('data-apple-collision-free', 'true')
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

test('basket supports variants, quantity, undo, preview, and clear', async ({ page }) => {
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
  const drawer = page.getByRole('dialog', { name: /Your basket/ })
  await expect(drawer).not.toContainText('Demo only. No order, payment, stock, or collection slot is submitted.')
  await expect(drawer).not.toContainText('Prices are read from the current catalogue')
  await expect(drawer.getByText('Size: Small')).toBeVisible()
  await expect(drawer.getByText('Size: Medium')).toBeVisible()
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await expect(drawer.getByLabel('Quantity for Orchard apples')).toContainText('2')
  await drawer.locator('.basket-lines li').filter({ hasText: 'Size: Small' }).getByRole('button', { name: 'Remove' }).click()
  await drawer.getByRole('button', { name: 'Undo' }).click()
  await expect(drawer.getByText('Size: Small')).toBeVisible()
  await drawer.getByRole('button', { name: 'Preview collection' }).click()
  await expect(drawer).toContainText('never removes, substitutes, or reprices')
  await drawer.getByRole('button', { name: 'Save this preview' }).click()
  await expect(drawer).toContainText('Nothing was sent')
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

test('farm-life scenes use matching posters and never play more than one large video', async ({ page }) => {
  await page.goto(`${projectPath}#hens`, { waitUntil: 'networkidle' })
  await expect(page.locator('#hens video')).toHaveAttribute('poster', /hens-poster\.avif/)
  await expect(page.locator('#cattle video')).toHaveAttribute('poster', /cattle-poster\.avif/)
  await expect(page.locator('#sheep video')).toHaveAttribute('poster', /sheep-poster\.avif/)
  expect(await page.locator('.farm-profile video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length)).toBeLessThanOrEqual(1)
  await page.locator('#cattle').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  expect(await page.locator('.farm-profile video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length)).toBeLessThanOrEqual(1)
  await page.locator('#hens').getByRole('link', { name: 'View eggs' }).click()
  await expect(page).toHaveURL(/#product-eggs$/)
  await expect(page.locator('#product-eggs')).toBeFocused()
})

test('leaf handoff owns one continuous hold through cover, commit, and reveal', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  const root = page.locator('body > #root > div')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-leaf-state', 'armed')
  await expect(page.locator('.floating-basket')).toBeHidden()
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-leaf-state', 'entering')
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'leaf')
  await expect(root).toHaveAttribute('data-scroll-hold', 'active')
  const heldAt = await page.evaluate(() => Number.parseFloat(document.body.style.top || '0'))
  await dispatchWheel(page, 500)
  expect(await page.evaluate(() => Number.parseFloat(document.body.style.top || '0'))).toBe(heldAt)
  await expect(page.locator('.leaf-handoff')).toBeVisible()
  await expect(root).toHaveAttribute('data-leaf-state', 'covered', { timeout: 1000 })
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'leaf')
  await expect(page.locator('.floating-basket')).toBeHidden()
  await expect(page).toHaveURL(/#shop$/)
  await expect(page.locator('.leaf-handoff__panel')).toHaveCount(4)
  await expect(root).toHaveAttribute('data-leaf-state', 'complete', { timeout: 3000 })
  await expect(root).toHaveAttribute('data-scroll-gate-owner', 'none')
  await expect(page.locator('.floating-basket')).toBeVisible()
  await expect(page.locator('.leaf-handoff')).toHaveCount(0)
  await dispatchWheel(page, -300)
  await dispatchWheel(page, 300)
  await expect(root).toHaveAttribute('data-leaf-state', 'complete')
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('Escape fail-opens an interrupted leaf handoff and unlocks the existing basket', async ({ page }) => {
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-leaf-state', 'armed')
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-leaf-state', 'entering')
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-leaf-state', 'bypassed')
  await expect(page.locator('.leaf-handoff')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await dispatchWheel(page, 120)
  await expect(root).toHaveAttribute('data-leaf-state', 'bypassed')
})

test('failed leaf art commits the shop directly without an empty cover or retained lock', async ({ page }) => {
  await page.route('**/media/leaves/leaf-canopy.webp', (route) => route.abort())
  await page.goto(projectPath)
  const root = page.locator('body > #root > div')
  await expect(root).toHaveAttribute('data-leaf-asset', 'failed')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-leaf-state', 'armed')
  await page.getByRole('link', { name: 'Explore the demo' }).click()
  await expect(page).toHaveURL(/#shop$/)
  await expect(root).toHaveAttribute('data-leaf-state', 'bypassed')
  await expect(root).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('.leaf-handoff')).toHaveCount(0)
})

test('scroll hint waits for eligible inactivity, emphasizes once, and stays absent while locked', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(page.locator('[data-scroll-hint]')).toHaveCount(0)
  await page.waitForTimeout(5200)
  await expect(page.locator('[data-scroll-hint="closed"]')).toBeVisible()
  await dispatchWheel(page, 24)
  await expect(page.locator('[data-scroll-hint]')).toHaveCount(0)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'active')
  await page.waitForTimeout(5200)
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

test('commerce actions have distinct cues without a duplicate generic click', async ({ page }) => {
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

  const apple = page.locator('#product-apple')
  await apple.getByRole('button', { name: 'View details' }).click()
  await page.getByRole('dialog', { name: /Orchard apples/ }).getByRole('button', { name: 'Close product details' }).click()
  await apple.getByRole('button', { name: 'Add to basket' }).click()
  const drawer = await openFullBasket(page, 1)
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await drawer.getByRole('button', { name: 'Remove' }).click()

  const names = await page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string }> }).__heardSounds ?? []).map(({ name }) => name))
  expect(names.filter((name) => name === 'details')).toHaveLength(1)
  expect(names.filter((name) => name === 'add')).toHaveLength(1)
  expect(names.filter((name) => name === 'quantity')).toHaveLength(1)
  expect(names.filter((name) => name === 'remove')).toHaveLength(1)
  expect(names).not.toContain('ui')
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

test('cattle cue uses the lowered gain', async ({ page }) => {
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
  await expect.poll(async () => page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string; gain: number }> }).__heardSounds ?? []).find(({ name }) => name === 'cattle')?.gain)).toBeCloseTo(.167, 3)
  await page.locator('.entrance-links [data-animal-sound="cattle"]').evaluate((link) => (link as HTMLAnchorElement).click())
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => ((window as typeof window & { __heardSounds?: Array<{ name: string }> }).__heardSounds ?? []).filter(({ name }) => name === 'cattle').length)).toBe(1)
})

test('reduced motion presents complete still states and keeps manual video control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  await expect(page.getByTestId('scene-host')).toBeHidden()
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await expect(page.locator('body > #root > div')).toHaveAttribute('data-leaf-state', 'bypassed')
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await page.goto(`${projectPath}#sheep`)
  await expect(page.locator('#sheep').getByRole('button', { name: 'Play scene' })).toBeVisible()
  expect(await page.locator('#sheep video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
})

test('model, opening-image, product-image, and video failures retain complete fallbacks', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.route('**/media/real-farm/*.avif', (route) => route.abort())
  await page.route('**/media/catalogue-expanded/apple.avif', (route) => route.abort())
  await page.route('**/media/farm-life-motion/hens.mp4', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'fallback')
  await openShop(page, false)
  await expect(page.getByRole('button', { name: /Open basket preview/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Orchard apples image unavailable/ })).toBeVisible()
  await page.goto(`${projectPath}#hens`)
  await expect(page.getByRole('img', { name: /Hens video unavailable/ })).toBeVisible()
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
  await expect(page.getByText('Illustrative periods, not a live schedule.')).toBeVisible()
  await expect(page.getByText('No address or geographic directions are configured.')).toBeVisible()
  await page.locator('#website').scrollIntoViewIfNeeded()
  await page.getByLabel('Opens').fill('10:30')
  await expect(page.locator('.try-update__preview')).toContainText('10:30 am–1:00 pm')
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: /send|submit/i })).toHaveCount(0)
  expect(writes).toEqual([])
})

test('two-hundred-percent text sizing keeps the market operable without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openShop(page, false)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: /^Boxes 2/ })).toBeVisible()
})
