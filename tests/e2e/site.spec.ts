import { expect, test } from '@playwright/test'

const projectPath = '/farm-stand/'

async function openShop(page: import('@playwright/test').Page) {
  await page.goto(`${projectPath}#shop`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
}

async function addProduct(page: import('@playwright/test').Page, productId: string) {
  const count = page.locator('.basket-button span')
  const before = Number(await count.textContent())
  await page.locator(`#product-${productId}`).getByRole('button', { name: 'Add to basket' }).click()
  await expect(count).toHaveText(String(before + 1))
}

test('project-path build loads the market opening and keeps resource URLs scoped', async ({ page }) => {
  const failedResponses: string[] = []
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })
  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await expect(page.getByTestId('scene-host')).toHaveAttribute('data-scene', 'light')
  expect(await page.locator('.stand-shop-bridge, .stand-transition').count()).toBe(0)
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname))
  expect(resources.every((path) => path.startsWith('/farm-stand/'))).toBe(true)
  expect(failedResponses).toEqual([])
})

test('one presented state follows the six market-opening segments without changing shop state', async ({ page }) => {
  await page.goto(projectPath)
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  const stage = page.locator('.hero-stage')
  await expect(stage).toHaveClass(/hero-stage--ready/)
  const travel = await stage.evaluate((node) => node.offsetHeight - innerHeight)
  const expected = [[.06, 'light'], [.2, 'lift'], [.36, 'threshold'], [.55, 'passage'], [.74, 'open'], [.92, 'rest']] as const
  for (const [progress, shot] of expected) {
    await page.evaluate((top) => scrollTo(0, top), travel * progress)
    await expect(page.getByTestId('scene-host')).toHaveAttribute('data-scene', shot)
    await expect.poll(async () => stage.evaluate((node) => Math.abs(Number((node as HTMLElement).dataset.requestedProgress) - Number((node as HTMLElement).dataset.presentedProgress)))).toBeLessThan(.002)
  }
  await expect(page.getByRole('button', { name: /Open demonstration basket, 0 items/ })).toBeVisible()
})

test('the threshold remains coherent while scrolling forward, reversing, and crossing rapidly', async ({ page }) => {
  await page.goto(projectPath)
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  const stage = page.locator('.hero-stage')
  const travel = await stage.evaluate((node) => node.offsetHeight - innerHeight)
  const visit = async (progress: number) => {
    await page.evaluate((top) => scrollTo(0, top), travel * progress)
    await page.waitForTimeout(50)
  }

  for (const progress of [.48, .56, .66, .56, .48, .7, .52]) await visit(progress)
  await expect(page.getByTestId('scene-host')).toHaveAttribute('data-scene', 'passage')
  const state = await stage.evaluate((node) => ({ requested: (node as HTMLElement).dataset.requestedProgress, presented: (node as HTMLElement).dataset.presentedProgress }))
  expect(state.presented).toBe(state.requested)
  await visit(.86)
  await expect(page.getByTestId('scene-host')).toHaveAttribute('data-scene', 'rest')
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await expect(page.getByRole('button', { name: /Open demonstration basket, 0 items/ })).toBeVisible()
})

test('catalogue filters and the multi-item drawer support immediate quantity, undo, preview and clear', async ({ page }) => {
  await openShop(page)
  await page.getByRole('button', { name: 'Farm goods' }).click()
  await addProduct(page, 'eggs')
  await page.getByRole('button', { name: 'Produce', exact: true }).click()
  await addProduct(page, 'apple')
  await addProduct(page, 'potatoes')
  await expect(page.locator('#product-squash').getByRole('button', { name: 'Unavailable example' })).toBeDisabled()
  await page.getByRole('button', { name: /Open demonstration basket, 3 items/ }).click()
  const drawer = page.getByRole('dialog', { name: /Your basket/ })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await expect(drawer.getByLabel('Quantity for Orchard apples')).toContainText('2')
  await drawer.locator('.basket-lines li').filter({ hasText: 'Field potatoes' }).getByRole('button', { name: 'Remove' }).click()
  await expect(drawer.locator('.basket-lines li').filter({ hasText: 'Field potatoes' })).toHaveCount(0)
  await drawer.getByRole('button', { name: 'Undo' }).click()
  await expect(drawer).toContainText('Field potatoes')
  await drawer.getByRole('button', { name: 'Preview collection' }).click()
  await drawer.getByRole('button', { name: 'Save this preview' }).click()
  await expect(drawer).toContainText('Nothing was sent, and no stock or collection time was reserved.')
  await drawer.getByRole('button', { name: 'Clear demonstration basket' }).click()
  await drawer.getByRole('button', { name: 'Yes, clear it' }).click()
  await expect(drawer).toContainText('Your demonstration basket is empty.')
})

test('drawer retains basket progress across close, navigation, and resizing', async ({ page }) => {
  await openShop(page)
  await addProduct(page, 'apple')
  await page.getByRole('button', { name: /Open demonstration basket/ }).click()
  await page.getByRole('button', { name: 'Increase Orchard apples quantity' }).click()
  await page.getByRole('button', { name: 'Close basket' }).click()
  await page.locator('#cattle').scrollIntoViewIfNeeded()
  await page.setViewportSize({ width: 900, height: 700 })
  await page.getByRole('button', { name: /Open demonstration basket, 2 items/ }).click()
  await expect(page.getByRole('dialog', { name: /Your basket/ }).getByLabel('Quantity for Orchard apples')).toContainText('2')
})

test('product detail image transition is interruptible and returns keyboard focus', async ({ page }) => {
  await openShop(page)
  const trigger = page.locator('#product-carrots').getByRole('button', { name: 'View details' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Carrot bunches' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Carrot bunches' })).toBeHidden()
  await expect(page.locator('.product-transition-clone')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('opening motion can pause without hijacking navigation', async ({ page }) => {
  await page.goto(projectPath)
  await page.getByRole('button', { name: 'Pause opening' }).click()
  await expect(page.locator('[data-motion-paused="true"]')).toHaveCount(1)
  await page.getByRole('link', { name: 'Explore the demo' }).click()
  await expect(page).toHaveURL(/#shop$/)
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
})

test('farm-life is three addressable scroll scenes and the hen link reveals eggs', async ({ page }) => {
  await page.goto(`${projectPath}#hens`)
  await expect(page.locator('#hens').getByRole('heading', { name: 'Hens' })).toBeVisible()
  await expect(page.locator('#cattle').getByAltText(/cattle spread across a wide pasture/i)).toBeAttached()
  await expect(page.locator('#sheep').getByAltText(/sheep facing the camera/i)).toBeAttached()
  await page.locator('#hens').getByRole('link', { name: 'View eggs' }).click()
  await expect(page).toHaveURL(/#product-eggs$/)
  await expect(page.locator('#product-eggs')).toBeFocused()
})

test('direct shop entry and refresh bypass the story and remain usable', async ({ page }) => {
  await openShop(page)
  await addProduct(page, 'apple')
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
  await expect(page.locator('#product-apple').getByRole('button', { name: 'Add to basket' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Open demonstration basket, 1 items/ })).toBeVisible()
})

test('invalid stored basket data is discarded at the session boundary', async ({ page }) => {
  await openShop(page)
  await page.evaluate(() => sessionStorage.setItem('farm-stand-demo-basket-v1', '{"apple":999,"unknown":2}'))
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: /Open demonstration basket, 0 items/ })).toBeVisible()
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
  await expect(page.getByText(/contact destination.*remain intentionally unconfigured/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /send|submit/i })).toHaveCount(0)
  expect(writes).toEqual([])
})

test('reduced motion produces static, fully usable story scenes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath)
  await expect(page.locator('.hero-sticky')).toHaveCSS('position', 'relative')
  await expect(page.getByTestId('scene-host')).toBeHidden()
  await expect(page.locator('.market-opening__plate')).toBeVisible()
  await page.goto(`${projectPath}#sheep`)
  await expect(page.locator('#sheep').getByRole('heading', { name: 'Sheep' })).toBeVisible()
})

test('runtime reduced-motion changes stop and restore the cinematic layouts', async ({ page }) => {
  await page.goto(projectPath)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.hero-sticky')).toHaveCSS('position', 'relative')
  await expect(page.getByTestId('scene-host')).toHaveCSS('display', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.hero-sticky')).toHaveCSS('position', 'sticky')
  await expect(page.getByTestId('scene-host')).not.toHaveCSS('display', 'none')
})

test('offscreen hero pauses rendering and resumes', async ({ page }) => {
  await page.goto(projectPath)
  const scene = page.getByTestId('scene-host')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-rendering', 'paused')
  const count = Number(await scene.getAttribute('data-render-count'))
  await page.evaluate(() => dispatchEvent(new Event('farmstageprogress')))
  await page.waitForTimeout(150)
  expect(Number(await scene.getAttribute('data-render-count'))).toBe(count)
})

test('failed models keep the HTML journey and commerce demonstration usable', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await openShop(page)
  await addProduct(page, 'apple')
  await expect(page.getByRole('button', { name: /Open demonstration basket, 1 items/ })).toBeVisible()
})

test('broken product and animal images have useful text fallbacks', async ({ page }) => {
  await page.route('**/media/catalogue/**', (route) => route.abort())
  await page.route('**/media/farm-life/**', (route) => route.abort())
  await openShop(page)
  await page.locator('#product-apple .product-picture').scrollIntoViewIfNeeded()
  await expect(page.getByRole('img', { name: /Orchard apples image unavailable/ })).toBeVisible()
  await page.locator('#hens').scrollIntoViewIfNeeded()
  await expect(page.getByRole('img', { name: /Hens photograph unavailable/ })).toBeVisible()
})

test('layouts avoid horizontal overflow and portrait drawer stays within the viewport', async ({ page }) => {
  for (const size of [{ width: 320, height: 740 }, { width: 900, height: 700 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size)
    await openShop(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${size.width}x${size.height}`).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await addProduct(page, 'apple')
  await page.getByRole('button', { name: /Open demonstration basket/ }).click()
  await page.waitForTimeout(450)
  const rect = await page.getByRole('dialog', { name: /Your basket/ }).evaluate((node) => node.getBoundingClientRect())
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.width).toBe(390)
  expect(rect.right).toBe(390)
  expect(rect.bottom).toBeLessThanOrEqual(844)
})

test('two-hundred-percent text sizing reflows the shop without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openShop(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('heading', { name: 'Shop the stand.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Boxes' })).toBeVisible()
})

test('opening image failure keeps a complete static stage and farm-life access', async ({ page }) => {
  await page.route('**/media/market-opening-open-*.avif', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await expect(page.locator('.market-opening__plate')).toHaveCSS('background-image', /farm-setting-1920/)
  await page.goto(`${projectPath}#farm-life`)
  await expect(page).toHaveURL(/#farm-life$/)
})
