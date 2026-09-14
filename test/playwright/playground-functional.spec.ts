import type { Page, TestInfo } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const { version: packageVersion } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string }

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
    await expect(page.getByRole('main').getByText(`v${packageVersion}`, { exact: true })).toBeVisible()

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

  test('closes the local session and blocks the protected messages route', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'Desktop auth journey is sufficient for this contract.')
    const browserErrors = observePageErrors(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    // The existing @docs dashboard test owns the heading contract. For this
    // auth journey, the local login control is the observable readiness gate.
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Identifiant').fill('test')
    await page.getByLabel('Mot de passe').fill('12345')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Session active', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('link', { name: 'Tester le CRUD protégé' }).click()
    await expect(page).toHaveURL(/\/messages$/)
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()

    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => page.evaluate(() => ({
      feathersJwt: window.localStorage.getItem('feathers-jwt'),
      accessToken: window.localStorage.getItem('accessToken'),
    }))).toEqual({ feathersJwt: null, accessToken: null })

    const anonymousResponse = await request.get('/feathers/messages?$limit=1')
    expect(anonymousResponse.status()).toBe(401)

    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL((url) => {
      return url.pathname === '/'
        && url.searchParams.get('auth') === 'required'
        && url.searchParams.get('redirect') === '/messages'
    })
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible({ timeout: 15_000 })
    expect(browserErrors).toEqual([])
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
