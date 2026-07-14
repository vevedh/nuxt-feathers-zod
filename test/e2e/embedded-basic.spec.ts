import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup, useTestContext } from '@nuxt/test-utils/e2e'
import { io } from 'socket.io-client'
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

  it('serves NFZ Builder capabilities as canonical Feathers services over REST', async () => {
    const services = await $fetch<{ services: Array<{ name: string }> }>('/feathers/nfz/services')
    expect(services.services.some(service => service.name === 'pings')).toBe(true)

    const schema = await $fetch<{ service: string, fields: Record<string, unknown> }>('/feathers/nfz/schemas/pings')
    expect(schema.service).toBe('pings')
    expect(schema.fields.label).toBeTruthy()

    const preview = await $fetch<{ ok: boolean, after: { fields: Record<string, unknown> } }>('/feathers/nfz/builder', {
      method: 'POST',
      body: {
        action: 'preview',
        service: 'pings',
        fields: schema.fields,
      },
    })
    expect(preview.ok).toBe(true)
    expect(preview.after.fields.label).toBeTruthy()
  })

  it('exposes the same NFZ services over Socket.IO', async () => {
    const baseUrl = useTestContext().url
    expect(baseUrl).toBeTruthy()

    const socket = io(baseUrl as string, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    })

    try {
      const result = await new Promise<{ services: Array<{ name: string }> }>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Socket.IO NFZ service timeout.')), 10_000)
        socket.emit('find', 'nfz/services', {}, (error: unknown, payload: { services: Array<{ name: string }> }) => {
          clearTimeout(timer)
          if (error)
            reject(error)
          else
            resolve(payload)
        })
      })

      expect(result.services.some(service => service.name === 'pings')).toBe(true)
    }
    finally {
      socket.close()
    }
  })

  it('keeps deprecated Nitro facades as thin compatibility adapters', async () => {
    const response = await fetch('/api/nfz/schema?service=pings')
    expect(response.status).toBe(200)
    expect(response.headers.get('deprecation')).toBe('true')
    expect(response.headers.get('x-nfz-successor')).toContain('nfz/*')

    const payload = await response.json() as { service: string }
    expect(payload.service).toBe('pings')
  })
})
