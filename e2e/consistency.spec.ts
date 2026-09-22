import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/')
  await page.getByLabel('Staff number or email').fill('LEC00123')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Total Students')).toBeVisible()
  await expect(page.getByText('QR-CS301-0908')).toBeVisible()
}

// Pixel comparisons need baselines generated on the CI OS (Linux). Enable with VISUAL=1.
const visual = !!process.env.VISUAL

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('login page renders consistently', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lecturer Portal' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"'))).toBe(true)
  expect(await noHorizontalScroll(page)).toBe(true)
  if (visual) await expect(page).toHaveScreenshot('login.png')
})

test('inputs never trigger iOS zoom on touch devices', async ({ page, isMobile }) => {
  await page.goto('/')
  const size = await page.getByLabel('Password').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(size).toBeGreaterThanOrEqual(isMobile ? 16 : 14)
})

test('dashboard has no overflow, native select chrome or tiny tap targets', async ({ page, isMobile }) => {
  await signIn(page)
  expect(await noHorizontalScroll(page)).toBe(true)

  const select = page.getByLabel('Unit')
  expect(await select.evaluate((el) => getComputedStyle(el).appearance)).toBe('none')

  const selectBox = (await select.boundingBox())!
  expect(selectBox.height, 'unit select height').toBeGreaterThanOrEqual(40)

  const buttons = page.getByRole('button', { name: /^(Generate|Sign Out)$/ })
  for (const b of await buttons.all()) {
    if (!(await b.isVisible())) continue
    const box = (await b.boundingBox())!
    expect(box.height, 'tap target height').toBeGreaterThanOrEqual(40)
  }
  if (isMobile) await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  if (visual) await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
})

test('QR flow works end to end', async ({ page }) => {
  await signIn(page)
  await page.getByLabel('Unit').selectOption({ label: 'CS301 — Data Structures & Algorithms' })
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByRole('timer')).toContainText('Expires in')
  await expect(page.locator('canvas')).toBeVisible()
})
