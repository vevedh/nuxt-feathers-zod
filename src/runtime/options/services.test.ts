import type { ServicesDir, ServicesDirs } from './services'
import { describe, expect, it } from 'vitest'
import { resolveServicesDirs, servicesDirDefault } from './services'

describe('resolveServicesDirs', () => {
  const rootDir = '/nuxt/root-dir'
  const defaultResult: ServicesDirs = [`${rootDir}/${servicesDirDefault}`]

  const customDir = 'custom-dir'
  const customResult: ServicesDirs = [`${rootDir}/custom-dir`]

  it('should use default directories if provided empty array', () => {
    const servicesDirs: ServicesDirs = []

    const result = resolveServicesDirs(servicesDirs, rootDir)

    expect(result).toEqual(defaultResult)
  })

  it('should use default directories if provided empty string', () => {
    const servicesDirs: ServicesDir = ''

    const result = resolveServicesDirs(servicesDirs, rootDir)

    expect(result).toEqual(defaultResult)
  })

  it('should resolve a single string directory', () => {
    const servicesDirs = customDir

    const result = resolveServicesDirs(servicesDirs, rootDir)

    expect(result).toEqual(customResult)
  })

  it('should resolve an array of directories', () => {
    const servicesDirs = [customDir]

    const result = resolveServicesDirs(servicesDirs, rootDir)

    expect(result).toEqual(customResult)
  })

  it('should filter out empty values from the array', () => {
    const servicesDirs = ['', customDir]

    const result = resolveServicesDirs(servicesDirs, rootDir)

    expect(result).toEqual(customResult)
  })
})
