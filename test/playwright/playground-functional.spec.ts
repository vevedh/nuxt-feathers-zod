import type { Page, TestInfo } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const documentationImageDirectory = resolve(
  process.cwd(),
  'docs/public/images/guides/playwright',
)

async function captureDocumentationScreenshot(
  page: Page,
  filename: string,
  testInfo: TestInfo,
): Promise<void> {
  if (process.env.NFZ_UPDATE_DOC_SCREENSHOTS !== '1' || testInfo.project.name.includes('mobile'))
    return

  await mkdir(documentationImageDirectory, { recursive: true })
  await page.screenshot({
    path: resolve(documentationImageDirectory, filename),
    fullPage: true,
  })
}

function observePageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

test.describe('playground browser validation', () => {
  test('runs the read-only dashboard checks @docs', async ({ page }, testInfo) => {
    const browserErrors = observePageErrors(page)

    await page.goto('/', { waitUntil: 'networkidle' })

    await expect(page.getByRole('heading', { name: 'Tester le module sans se perdre' })).toBeVisible()
    await expect(page.getByRole('main').getByText('v6.6.0', { exact: true })).toBeVisible()

    const runButton = page.getByRole('button', { name: 'Lancer les contrôles rapides' })
    await runButton.click()

    const checks = page.locator('.nfz-check-item')
    await expect(checks).toHaveCount(6)
    await expect(page.locator('.nfz-check-item[data-status="idle"]')).toHaveCount(0, { timeout: 60_000 })
    await expect(page.locator('.nfz-check-item[data-status="running"]')).toHaveCount(0, { timeout: 60_000 })
    await expect(page.locator('.nfz-check-item[data-status="error"]')).toHaveCount(0)
    expect(browserErrors).toEqual([])

    await captureDocumentationScreenshot(page, 'playwright-dashboard.png', testInfo)
  })

  test('opens the detailed diagnostics without browser errors @docs', async ({ page }, testInfo) => {
    const browserErrors = observePageErrors(page)

    await page.goto('/tests', { waitUntil: 'networkidle' })

    await expect(page.getByRole('main').getByRole('heading', { name: 'Connexion et authentification' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('1. Tester un service', { exact: true })).toBeVisible()
    await expect(page.getByText('2. Tester une session locale', { exact: true })).toBeVisible()
    expect(browserErrors).toEqual([])

    await captureDocumentationScreenshot(page, 'playwright-diagnostics.png', testInfo)
  })

  test('keeps the navigation usable on a mobile viewport', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only navigation contract.')
    const browserErrors = observePageErrors(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Ouvrir la navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Navigation du playground' })).toBeVisible()
    const navigation = page.getByRole('navigation', { name: 'Navigation du playground' })
    await navigation.getByRole('link', { name: /Tests essentiels/i }).click()
    await expect(page).toHaveURL(/\/tests$/)
    expect(browserErrors).toEqual([])
  })
})
