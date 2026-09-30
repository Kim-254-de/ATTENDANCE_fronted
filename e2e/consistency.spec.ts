import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/login?role=lecturer')
  await page.getByLabel('Staff number or email').fill('LEC00123')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Activate Class').first()).toBeVisible()
  await expect(page.getByText('QR-CS301-0908')).toBeVisible()
}

// Pixel comparisons need baselines generated on the CI OS (Linux). Enable with VISUAL=1.
const visual = !!process.env.VISUAL

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('login page renders consistently', async ({ page }) => {
  await page.goto('/login?role=lecturer')
  await expect(page.getByRole('heading', { name: 'Lecturer Portal' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"'))).toBe(true)
  expect(await noHorizontalScroll(page)).toBe(true)
  if (visual) await expect(page).toHaveScreenshot('login.png')
})

test('inputs never trigger iOS zoom on touch devices', async ({ page, isMobile }) => {
  await page.goto('/login?role=lecturer')
  const size = await page.getByLabel('Password', { exact: true }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(size).toBeGreaterThanOrEqual(isMobile ? 16 : 14)
})

test('dashboard has no overflow, or tiny tap targets', async ({ page }) => {
  await signIn(page)
  expect(await noHorizontalScroll(page)).toBe(true)

  const buttons = page.getByRole('button', { name: /^(Activate Class|Sign Out)$/ })
  for (const b of await buttons.all()) {
    if (!(await b.isVisible())) continue
    const box = (await b.boundingBox())!
    expect(box.height, 'tap target height').toBeGreaterThanOrEqual(40)
  }
  if (visual) await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
})

test('activate class flow works end to end', async ({ page }) => {
  await signIn(page)
  // The unit comes from the timetable (GET /units/current), not a picker.
  await expect(page.getByText('CS301 — Data Structures & Algorithms')).toBeVisible()
  await page.getByRole('button', { name: 'Activate Class', exact: true }).click()
  await page.waitForURL(/\/session\//)
  await expect(page.getByRole('timer')).toContainText('Refreshes in')
  await expect(page.locator('canvas')).toBeVisible()
})
