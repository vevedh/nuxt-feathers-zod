import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('e2e embedded-auth fixture', async () => {
  await setup({
    rootDir: 'test/fixtures/embedded-auth',
    server: true,
    browser: false,
  })

  it('renders the auth fixture home page', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('NFZ E2E Embedded Auth')
  })

  it('authenticates with local strategy and accesses a protected service', async () => {
    const auth = await $fetch<{ accessToken: string }>('/feathers/authentication', {
      method: 'POST',
      body: {
        strategy: 'local',
        userId: 'e2e',
        password: '12345',
      },
    })

    expect(auth.accessToken).toBeTruthy()

    const accounts = await $fetch<Array<{ userId: string }>>('/feathers/e2e-accounts', {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    expect(Array.isArray(accounts)).toBe(true)
    expect(accounts[0]?.userId).toBe('e2e')
  })
})
