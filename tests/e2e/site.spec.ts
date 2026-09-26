import { expect, test } from '@playwright/test'

test('production resources resolve within the GitHub Pages project path', async ({ page }) => {
  const failedAssets: string[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${url.pathname}`)
    }
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  const localResources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname))
  expect(localResources.length).toBeGreaterThan(10)
  expect(localResources.every((resource) => resource.startsWith('/farm-stand/'))).toBe(true)
  expect(failedAssets).toEqual([])

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
})

test('service offer and demo are honest and usable', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') requests.push(`${request.method()} ${request.url()}`)
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  await expect(page.getByText('Websites for growers and local businesses.')).toBeVisible()
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.getByText('Yellow onions', { exact: true }).click()
  await page.getByLabel('Example quantity').fill('3')
  await page.getByRole('button', { name: 'Pickup request preview' }).click()
  await expect(page.getByTestId('pickup-result')).toContainText('3 × example bags of yellow onions')
  await expect(page.getByTestId('pickup-result')).toContainText('No request has been sent')
  expect(requests).toEqual([])
})

test('selection persists across reverse scroll and resize', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.getByText('Yellow onions', { exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await expect(page.getByLabel('Yellow onions')).toBeChecked()
})

test('product selection works from the keyboard', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  const onion = page.getByLabel('Yellow onions')
  await onion.focus()
  await page.keyboard.press('Space')
  await expect(onion).toBeChecked()
})

test('contact remains a local copy-only preview', async ({ page }) => {
  await page.goto('/#contact')
  const field = page.getByLabel('What should your website make easier?')
  await field.fill('Show weekly produce and opening information.')
  await expect(page.getByText('Contact destination: not configured in this preview')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy website brief' })).toBeVisible()
  await expect(page.getByRole('button', { name: /send|submit/i })).toHaveCount(0)
})

test('page has no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('reduced motion removes the pinned scroll stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const position = await page.locator('.hero-sticky').evaluate((node) => getComputedStyle(node).position)
  expect(position).toBe('relative')
  await expect(page.getByRole('group', { name: 'Choose an example product' })).toBeVisible()
})

test('failed model requests retain the static scene and usable HTML', async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await page.evaluate(() => document.querySelector('#demo')?.scrollIntoView())
  await page.getByText('Yellow onions', { exact: true }).click()
  await expect(page.getByLabel('Yellow onions')).toBeChecked()
})

test('delayed models leave the opening offer visible before enhancement', async ({ page }) => {
  await page.route('**/models/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 180))
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
})

test('WebGL context loss settles on the complete static fallback', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--ready/)
  await page.locator('canvas').dispatchEvent('webglcontextlost')
  await expect(page.locator('.hero-stage')).toHaveClass(/hero-stage--fallback/)
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
})

test('failed fonts keep content readable', async ({ page }) => {
  await page.route('**/fonts/**', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This is what your farm could look like online.' })).toBeVisible()
  const fontLoaded = await page.evaluate(() => document.fonts.check('600 24px Fraunces'))
  expect(fontLoaded).toBe(false)
})

test('two-hundred-percent text sizing keeps the page usable', async ({ page }) => {
  await page.goto('/')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.getByRole('link', { name: 'Discuss my website' }).first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
