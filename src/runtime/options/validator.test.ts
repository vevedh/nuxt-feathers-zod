import type { ValidatorOptions } from './validator'
import { describe, expect, it } from 'vitest'
import { getValidatorDefaults, resolveValidatorOptions, validatorFormatsDefaults } from './validator'

describe('getValidatorDefaults', () => {
  it('should return default validator formats', () => {
    const extendDefaults = true

    const result = getValidatorDefaults(extendDefaults)

    expect(result.formats).toEqual(validatorFormatsDefaults)
  })

  it('should return empty array if extendsDefault is false', () => {
    const extendDefaults = false

    const result = getValidatorDefaults(extendDefaults)

    expect(result.formats).toEqual([])
  })
})

describe('resolveValidatorOptions', () => {
  it('should return default formats if validator formats are empty', () => {
    const validator = { formats: [], extendDefaults: true }

    const result = resolveValidatorOptions(validator)

    expect(result.formats).toEqual(validatorFormatsDefaults)
  })

  it('should return empty array if validator formats are empty and extendDefaults is false', () => {
    const validator = { formats: [], extendDefaults: false }

    const result = resolveValidatorOptions(validator)

    expect(result.formats).toEqual([])
  })

  it('should extend default formats if new formats defined and extendDefaults is true', () => {
    const validator: ValidatorOptions = { formats: ['binary'], extendDefaults: true }

    const result = resolveValidatorOptions(validator)

    expect(result.formats).toEqual(['binary', ...validatorFormatsDefaults])
  })

  it('should not extend default formats if extendDefaults is false', () => {
    const validator: ValidatorOptions = { formats: ['binary'], extendDefaults: false }

    const result = resolveValidatorOptions(validator)

    expect(result.formats).toEqual(['binary'])
  })

  it('should remove duplicate formats', () => {
    const validator: ValidatorOptions = { formats: [validatorFormatsDefaults[0]!], extendDefaults: true }

    const result = resolveValidatorOptions(validator)

    expect(result.formats).toEqual(validatorFormatsDefaults)
    expect(result.formats).toHaveLength(validatorFormatsDefaults.length)
  })
})
