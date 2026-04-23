import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/embedded-basic', import.meta.url)),
  server: true,
  dev: false,
  browser: false,
})

describe('e2e embedded-basic fixture', () => {
  it('renders the home page', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('NFZ E2E Embedded Basic')
  })

  it('registers and serves a basic feathers service', async () => {
    const created = await $fetch<{ id: number, label: string }>('/feathers/pings', {
      method: 'POST',
      body: { label: 'hello-e2e' },
    })

    expect(created.label).toBe('hello-e2e')

    const fetched = await $fetch<{ id: number, label: string }>(`/feathers/pings/${created.id}`)
    expect(fetched.label).toBe('hello-e2e')
  })
})
