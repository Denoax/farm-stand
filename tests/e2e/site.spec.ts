import { expect, test } from '@playwright/test'

const projectPath = '/farm-stand/'

async function openShop(page: import('@playwright/test').Page) {
  await page.goto(`${projectPath}#shop`)
  await page.locator('#shop').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'A small shop with the details already worked out.' })).toBeVisible()
}

async function addProduct(page: import('@playwright/test').Page, productId: string) {
  await page.locator(`#product-${productId}`).getByRole('button', { name: 'Add to basket' }).click()
}

test('project-path build loads the preserved hero and defers new photography', async ({ page }) => {
  const failures: string[] = []
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4173') && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })

  await page.goto(projectPath, { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  const initialResources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname))
  expect(initialResources.length).toBeGreaterThan(10)
  expect(initialResources.every((path) => path.startsWith('/farm-stand/'))).toBe(true)
  expect(initialResources.filter((path) => path.includes('/catalogue/') || path.includes('/farm-life/'))).toEqual([])
  expect(failures).toEqual([])

  await page.locator('#shop').scrollIntoViewIfNeeded()
  await expect.poll(async () => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/catalogue/')))).toBe(true)
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
  })
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
})

test('hero transition keeps hidden controls inert and preserves selection', async ({ page }) => {
  await page.goto(projectPath)
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
  const transition = page.locator('.stand-transition')
  await expect(transition).toHaveAttribute('inert', '')
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.hero-stage')
    window.scrollTo(0, Math.max(0, (stage?.offsetHeight ?? innerHeight) - innerHeight))
  })
  await expect(transition).not.toHaveAttribute('inert', '')
  const onion = page.getByLabel('Yellow onions')
  await transition.getByText('Yellow onions', { exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.hero-stage')
    window.scrollTo(0, Math.max(0, (stage?.offsetHeight ?? innerHeight) - innerHeight))
  })
  await expect(onion).toBeChecked()
})

test('catalogue filters, unavailable state, multi-item basket, quantities, totals, collection, remove and reset work', async ({ page }) => {
  await openShop(page)
  await page.getByRole('button', { name: 'Eggs & farm goods' }).click()
  await addProduct(page, 'eggs')
  await page.getByRole('button', { name: 'Produce', exact: true }).click()
  await addProduct(page, 'apple')
  await addProduct(page, 'potatoes')
  await expect(page.locator('#product-squash').getByRole('button', { name: 'Unavailable example' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Basket/ }).first()).toContainText('3')

  await page.getByRole('button', { name: /Basket/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Review the example collection.' })).toBeVisible()
  await expect(page.getByText('Demonstration basket — no order or payment will be submitted')).toBeVisible()
  await page.locator('#basket-eggs').fill('0')
  await page.locator('#basket-eggs').blur()
  await expect(page.getByRole('alert')).toContainText('Use a whole number')
  await expect(page.locator('#basket-eggs')).toHaveValue('1')
  await page.locator('#basket-apple').fill('3')
  await page.locator('#basket-apple').press('Enter')
  await expect(page.locator('.basket-total')).toContainText('$33.50')
  await page.locator('.basket-lines li').filter({ hasText: 'Field potatoes' }).getByRole('button', { name: 'Remove' }).click()
  await expect(page.locator('.basket-lines')).not.toContainText('Field potatoes')

  await page.getByRole('button', { name: 'Preview collection options' }).click()
  await page.getByRole('button', { name: 'Review this example' }).click()
  await expect(page.getByTestId('collection-preview')).toContainText('Nothing was sent, and no stock or collection time was reserved')
  await page.getByRole('button', { name: 'Clear demonstration basket' }).click()
  await page.getByRole('button', { name: 'Yes, clear it' }).click()
  await expect(page.getByText('Your demonstration basket is empty.')).toBeVisible()
})

test('product details support keyboard opening, Escape, and focus return', async ({ page }) => {
  await openShop(page)
  const trigger = page.locator('#product-carrots').getByRole('button', { name: 'View details' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Carrot bunches' })).toBeVisible()
  await expect(page.getByText('illustrative sample price')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Carrot bunches' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('basket survives navigation, resizing, hero selection and farm-life switching', async ({ page }) => {
  await openShop(page)
  await page.getByRole('button', { name: 'Eggs & farm goods' }).click()
  await addProduct(page, 'eggs')
  await page.locator('#farm-life').scrollIntoViewIfNeeded()
  await page.getByRole('tab', { name: 'Cattle' }).click()
  await expect(page.getByAltText(/cattle standing beneath a leafy tree/i)).toBeVisible()
  await page.setViewportSize({ width: 900, height: 700 })
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.hero-stage')
    window.scrollTo(0, Math.max(0, (stage?.offsetHeight ?? innerHeight) - innerHeight))
  })
  await page.locator('.stand-transition').getByText('Yellow onions', { exact: true }).click()
  await page.locator('#shop').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /Basket/ }).first().click()
  await expect(page.getByRole('dialog', { name: 'Review the example collection.' })).toContainText('Egg basket')
})

test('farm-life selectors change image and related content without rotation', async ({ page }) => {
  await page.goto(`${projectPath}#farm-life`)
  await expect(page.getByRole('tab', { name: 'Hens' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByAltText(/brown hens gathered behind a farm gate/i)).toBeVisible()
  await page.getByRole('tab', { name: 'Cattle' }).click()
  await expect(page.getByAltText(/cattle standing beneath a leafy tree/i)).toBeVisible()
  await page.getByRole('tab', { name: 'Sheep' }).click()
  await expect(page.getByAltText(/sheep facing the camera/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /See what this layout demonstrates/ })).toHaveAttribute('href', '#website')
})

test('visit, service, and contact remain fictional and send nothing', async ({ page }) => {
  const nonGetRequests: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') nonGetRequests.push(`${request.method()} ${request.url()}`)
  })
  await page.goto(`${projectPath}#visit`)
  await expect(page.getByText('Illustrative periods, not a live schedule.')).toBeVisible()
  await expect(page.getByText('No address or geographic directions are configured.')).toBeVisible()
  await page.locator('#website').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'A website built around how your business works.' })).toBeVisible()
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(page.getByText(/service contact destination.*remain intentionally unconfigured/i)).toBeVisible()
  await page.getByLabel('What should your website make easier?').fill('Show produce and collection details clearly.')
  await expect(page.getByRole('button', { name: 'Copy website brief' })).toBeVisible()
  await expect(page.getByRole('button', { name: /send|submit/i })).toHaveCount(0)
  expect(nonGetRequests).toEqual([])
})

test('reduced motion works at load and responds to a live preference change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath)
  await expect(page.locator('.hero-sticky')).toHaveCSS('position', 'relative')
  await expect(page.locator('.stand-transition')).not.toHaveAttribute('inert', '')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.hero-sticky')).toHaveCSS('position', 'sticky')
  await expect(page.locator('.stand-transition')).toHaveAttribute('inert', '')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.stand-transition')).not.toHaveAttribute('inert', '')
})

test('offscreen hero pauses rendering and resumes with current state', async ({ page }) => {
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  const scene = page.getByTestId('scene-host')
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-rendering', 'paused')
  const pausedCount = Number(await scene.getAttribute('data-render-count'))
  await page.evaluate(() => window.dispatchEvent(new Event('farmstageprogress')))
  await page.waitForTimeout(250)
  expect(Number(await scene.getAttribute('data-render-count'))).toBe(pausedCount)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(scene).toHaveAttribute('data-rendering', 'active')
  await expect.poll(async () => Number(await scene.getAttribute('data-render-count'))).toBeGreaterThan(pausedCount)
})

test('failed models retain the full HTML journey', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await openShop(page)
  await addProduct(page, 'apple')
  await expect(page.getByRole('button', { name: /Basket/ }).first()).toContainText('1')
})

test('delayed models keep the opening visible and WebGL loss falls back', async ({ page }) => {
  await page.route('**/models/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 180))
    await route.continue()
  })
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await page.locator('canvas').dispatchEvent('webglcontextlost')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
})

test('broken product and animal images show useful fallbacks', async ({ page }) => {
  await page.route('**/media/catalogue/**', (route) => route.abort())
  await page.route('**/media/farm-life/**', (route) => route.abort())
  await openShop(page)
  await expect(page.getByRole('img', { name: /Carrot bunches image unavailable/ })).toBeVisible()
  await addProduct(page, 'carrots')
  await page.locator('#farm-life').scrollIntoViewIfNeeded()
  await expect(page.getByRole('img', { name: /Hens photograph unavailable/ })).toBeVisible()
})

test('failed fonts retain readable content', async ({ page }) => {
  await page.route('**/fonts/**', (route) => route.abort())
  await page.goto(projectPath)
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  expect(await page.evaluate(() => document.fonts.check('600 24px Fraunces'))).toBe(false)
})

test('narrow, intermediate, short-landscape, and 200-percent text layouts do not overflow', async ({ page }) => {
  for (const size of [{ width: 320, height: 740 }, { width: 900, height: 700 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size)
    await page.goto(`${projectPath}#shop`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${size.width}x${size.height}`).toBeLessThanOrEqual(1)
  }
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  const trigger = page.locator('#product-carrots').getByRole('button', { name: 'View details' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Carrot bunches' })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((node) => node.getBoundingClientRect().height)).toBeLessThanOrEqual(540)
})
