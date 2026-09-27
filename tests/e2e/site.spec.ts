import { expect, test, type Page } from '@playwright/test'

const projectPath = '/farm-stand/'

async function openShop(page: Page, showAll = true) {
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
  if (showAll) await page.getByRole('button', { name: /^All 48/ }).click()
}

async function addProduct(page: Page, productId: string, name = 'Add to basket') {
  const count = page.locator('.basket-button span')
  const before = Number(await count.textContent())
  await page.locator(`#product-${productId}`).getByRole('button', { name }).click()
  await expect(count).toHaveText(String(before + 1))
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
  await expect(page.getByRole('navigation', { name: /straight to/i }).getByRole('link')).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'Shop' }).last()).toHaveAttribute('href', '#shop')
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname))
  expect(resources.every((path) => path.startsWith('/farm-stand/'))).toBe(true)
  expect(failedResponses).toEqual([])
})

test('opening starts on meaningful downward intent, fades during the hold, escapes, and stays complete', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await expect(stage).toHaveAttribute('data-scroll-hold-deadline-ms', '900')
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

test('initial scroll hold is bounded, preserves position, and never repeats', async ({ page }, testInfo) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await expect(stage).toHaveAttribute('data-scroll-hold-deadline-ms', '900')
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }))
    const followup = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 800 })
    ;(window as typeof window & { __holdBlockedFollowup?: boolean }).__holdBlockedFollowup = !window.dispatchEvent(followup) && followup.defaultPrevented
  })
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
  expect(await page.evaluate(() => (window as typeof window & { __holdBlockedFollowup?: boolean }).__holdBlockedFollowup)).toBe(true)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released', { timeout: 5000 })
  if (testInfo.project.name === 'portrait-chromium') await page.evaluate(() => scrollBy(0, 800))
  else await page.mouse.wheel(0, 800)
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-opening-state', 'open')
  await page.evaluate(() => scrollTo(0, 0))
  await dispatchWheel(page, 40)
  await expect(stage).toHaveAttribute('data-scroll-hold', 'released')
})

test('keyboard intent ignores controls and header navigation settles the opening', async ({ page }) => {
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  await page.getByRole('link', { name: 'Farm stand website demonstration, home' }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(stage).toHaveAttribute('data-opening-state', 'waiting')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('ArrowDown')
  await expect(stage).toHaveAttribute('data-opening-state', 'playing')
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
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'playing')
  expect(touchStates.active).toBe('active')
  expect(touchStates.released).toBe('released')
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'released')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('hidden-tab lifecycle releases the hold and excludes hidden time from the clock', async ({ page }) => {
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await dispatchWheel(page, 24)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'active')
  await page.waitForTimeout(350)
  const before = Number(await page.locator('.hero-stage').getAttribute('data-requested-progress'))
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-scroll-hold', 'released')
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(80)
  const after = Number(await page.locator('.hero-stage').getAttribute('data-requested-progress'))
  expect(after - before).toBeLessThan(.12)
})

test('shutter is monotonic, the apple roll is distance-coupled, and the frame stays permanent', async ({ page }) => {
  test.slow()
  await page.goto(projectPath)
  const stage = page.locator('.hero-stage')
  const scene = page.getByTestId('scene-host')
  await expect(stage).toHaveClass(/hero-stage--ready/)
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
  const firstTravel = Number(await scene.getAttribute('data-apple-travel'))
  await expect.poll(async () => Number(await scene.getAttribute('data-apple-roll')), { timeout: 3500 }).toBeGreaterThan(.9)
  const roll = await scene.evaluate((element) => ({
    travel: Number(element.getAttribute('data-apple-travel')),
    rotation: Number(element.getAttribute('data-apple-rotation')),
    radius: Number(element.getAttribute('data-apple-effective-radius')),
  }))
  expect(firstTravel).toBeGreaterThan(0)
  expect(roll.travel).toBeGreaterThan(firstTravel)
  expect(roll.rotation * roll.radius).toBeCloseTo(roll.travel, 3)
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
  await page.getByRole('button', { name: /Open demonstration basket, 3 items/ }).click()
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
  await page.getByRole('button', { name: /Open demonstration basket, 3 items/ }).click()
  const drawer = page.getByRole('dialog', { name: /Your basket/ })
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

test('reduced motion presents complete still states and keeps manual video control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'open')
  await expect(page.getByTestId('scene-host')).toBeHidden()
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await page.goto(`${projectPath}#sheep`)
  await expect(page.locator('#sheep').getByRole('button', { name: 'Play scene' })).toBeVisible()
  expect(await page.locator('#sheep video').evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
})

test('model, opening-image, product-image, and video failures retain complete fallbacks', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.route('**/media/market-opening-open-*.avif', (route) => route.abort())
  await page.route('**/media/catalogue-expanded/apple.avif', (route) => route.abort())
  await page.route('**/media/farm-life-motion/hens.mp4', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-opening-state', 'fallback')
  await openShop(page, false)
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
  await page.getByRole('button', { name: /Open demonstration basket/ }).click()
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
    await page.getByRole('button', { name: /Open demonstration basket, 24 items/ }).first().click()
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
