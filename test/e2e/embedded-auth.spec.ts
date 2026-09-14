import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const e2eSetupTimeout = process.platform === 'win32' ? 420_000 : 120_000
const e2eServerStartTimeout = process.platform === 'win32' ? 180_000 : 60_000

process.env.NFZ_AUTH_SECRET ||= randomBytes(48).toString('base64url')

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/embedded-auth', import.meta.url)),
  server: true,
  dev: false,
  browser: false,
  setupTimeout: e2eSetupTimeout,
  serverStartTimeout: e2eServerStartTimeout,
})

describe('e2e embedded-auth fixture', () => {

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

    const consoleServices = await $fetch<{ services: Array<{ name: string }> }>('/feathers/nfz/services', {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    expect(Array.isArray(consoleServices.services)).toBe(true)
  })

  it('protects canonical NFZ console services when authentication is enabled', async () => {
    await expect($fetch('/feathers/nfz/services')).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})
