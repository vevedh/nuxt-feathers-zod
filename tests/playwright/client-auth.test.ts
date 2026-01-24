import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../fixtures/client-auth', import.meta.url)),
    nuxtConfig: {
      feathers: {
        auth: true,
        client: {
          pinia: false,
        },
      },
    },
  },
})

test('auth', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })
  await expect(page.getByRole('heading')).toHaveText('login-page')
  await page.getByTestId('login-button').click()
  await page.waitForURL('**/user/test', { waitUntil: 'load' })
  await expect(page.getByTestId('user-id')).toHaveText('test')
})
