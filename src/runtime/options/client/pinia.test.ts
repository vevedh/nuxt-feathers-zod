import { describe, expect, it } from 'vitest'
import { getPiniaDefaults, piniaDefaults, resolvePiniaOptions } from './pinia'

describe('getPiniaDefaults', () => {
  it('should return piniaDefaults', () => {
    const defaults = getPiniaDefaults(false)
    expect(defaults).toEqual(piniaDefaults)
  })
})

describe('resolvePiniaOptions', () => {
  it('should return piniaDefaults if pinia is undefined', () => {
    const pinia = undefined

    const result = resolvePiniaOptions(pinia, false)

    expect(result).toEqual(piniaDefaults)
  })

  it('should return piniaDefaults if pinia is true', () => {
    const pinia = true

    const result = resolvePiniaOptions(pinia, false)

    expect(result).toEqual(piniaDefaults)
  })

  it('should return false if pinia is false', () => {
    const pinia = false

    const result = resolvePiniaOptions(pinia, false)

    expect(result).toEqual(false)
  })

  it('should merge custom options with defaults', () => {
    const pinia = { idField: '_id' }

    const result = resolvePiniaOptions(pinia, false)

    expect(result).toEqual({
      ...piniaDefaults,
      idField: '_id',
    })
  })

  it('should use _id idField default for mongodb', () => {
    const pinia = undefined
    const mongodb = true

    const result = resolvePiniaOptions(pinia, mongodb)

    expect(result).toEqual({
      ...piniaDefaults,
      idField: '_id',
    })
  })
})
