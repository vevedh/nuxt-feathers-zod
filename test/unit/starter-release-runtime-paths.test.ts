import { describe, expect, it } from 'vitest'

import { resolveMountedRoutePath } from '../../examples/nfz-quasar-unocss-pinia-starter/scripts/runtime-paths.mjs'

describe('packaged starter runtime paths', () => {
  it('mounts Express server-module routes behind the Feathers REST prefix', () => {
    expect(resolveMountedRoutePath('/feathers', '/api/health')).toBe('/feathers/api/health')
  })

  it('normalizes missing and trailing slashes', () => {
    expect(resolveMountedRoutePath('feathers/', 'api/health/')).toBe('/feathers/api/health')
  })

  it('keeps the configured route unchanged when the REST bridge is mounted at root', () => {
    expect(resolveMountedRoutePath('/', '/api/health')).toBe('/api/health')
  })
})
