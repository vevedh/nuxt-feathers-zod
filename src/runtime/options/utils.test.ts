import { describe, expect, it } from 'vitest'
import { filterExports, setImportMeta, setImportsMeta } from './utils'

describe('filterExports', () => {
  it('should return true for default export', () => {
    const result = filterExports({ name: 'default', from: 'module.ts', as: 'default' })
    expect(result).toBe(true)
  })

  it('should return true for matching named export', () => {
    const result = filterExports({ name: 'named', from: 'named.ts', as: 'named' })
    expect(result).toBe(true)
  })

  it('should return false for non-matching named export', () => {
    const result = filterExports({ name: 'named', from: 'module.ts', as: 'other' })
    expect(result).toBe(false)
  })

  it('should return true for multi word named export', () => {
    const result = filterExports({ name: 'namedMultiWord', from: 'named-multi-word.ts', as: 'namedMultiWord' })
    expect(result).toBe(true)
  })
})

describe('setImportMeta', () => {
  it('should set meta for default export', () => {
    const module = { name: 'default', from: 'module.ts', as: 'default' }
    const result = setImportMeta(module)
    expect(result.meta).toHaveProperty('importId')
    expect(result.meta).toHaveProperty('import')
  })

  it('should set meta for named export', () => {
    const module = { name: 'named', from: 'module.ts', as: 'named' }
    const result = setImportMeta(module)
    expect(result.meta).toHaveProperty('importId')
    expect(result.meta).toHaveProperty('import')
  })

  it('should set meta for multiple modules', () => {
    const modules = [
      { name: 'default', from: 'module.ts', as: 'default' },
      { name: 'named', from: 'named.ts', as: 'named' },
    ]
    const result = setImportsMeta(modules)
    expect(result).toHaveLength(2)
    result.forEach((module) => {
      expect(module.meta).toHaveProperty('importId')
      expect(module.meta).toHaveProperty('import')
    })
  })
})
