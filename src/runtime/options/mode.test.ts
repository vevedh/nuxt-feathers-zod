import { describe, expect, it } from 'vitest'
import { detectResolvedMode, getResolvedClientMode, isRemoteClientMode, isResolvedRemoteAuthEnabled, isResolvedServerEnabled } from './mode'

describe('runtime options mode helpers', () => {
  it('detects embedded mode by default', () => {
    expect(getResolvedClientMode(undefined as any)).toBe('embedded')
    expect(getResolvedClientMode(false as any)).toBe('embedded')
    expect(getResolvedClientMode({ mode: 'embedded' } as any)).toBe('embedded')
  })

  it('detects remote mode from resolved client options', () => {
    const client = { mode: 'remote', remote: { url: 'https://api.example.com' } } as any
    expect(getResolvedClientMode(client)).toBe('remote')
    expect(isRemoteClientMode(client)).toBe(true)
    expect(detectResolvedMode({ client } as any)).toBe('remote')
  })

  it('defaults server enabled to false in remote mode', () => {
    const options = { client: { mode: 'remote' }, server: {} } as any
    expect(isResolvedServerEnabled(options)).toBe(false)
  })

  it('keeps explicit server.enabled override', () => {
    const options = { client: { mode: 'remote' }, server: { enabled: true } } as any
    expect(isResolvedServerEnabled(options)).toBe(true)
  })

  it('detects remote auth enablement only in remote mode', () => {
    expect(isResolvedRemoteAuthEnabled({ client: { mode: 'remote', remote: { auth: { enabled: true } } } } as any)).toBe(true)
    expect(isResolvedRemoteAuthEnabled({ client: { mode: 'embedded', remote: { auth: { enabled: true } } } } as any)).toBe(false)
  })
})
