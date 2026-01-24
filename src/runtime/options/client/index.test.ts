import { describe, expect, it } from 'vitest'
import { testRootDir } from './../plugins.test'
import { clientDefaults, resolveClientOptions } from './index'
import { piniaDefaults } from './pinia'

const rootDir = testRootDir
const srcDir = rootDir

describe('resolveClientOptions', () => {
  it('should return clientDefaults and piniaDefaults if client is true', async () => {
    const client = true

    const result = await resolveClientOptions(client, false, rootDir, srcDir)

    expect(result).toEqual({
      ...clientDefaults,
      pinia: piniaDefaults,
    })
  })

  it('should return clientDefaults and piniaDefaults if client is undefined', async () => {
    const client = undefined

    // @ts-expect-error - test wrong client options
    const result = await resolveClientOptions(client, false, rootDir, srcDir)

    expect(result).toEqual({
      ...clientDefaults,
      pinia: piniaDefaults,
    })
  })

  it('should return false when client is false', async () => {
    const client = false

    const result = await resolveClientOptions(client, false, rootDir, srcDir)

    expect(result).toEqual(false)
  })

  it('should merge custom options with defaults', async () => {
    const client = {
      pinia: {
        idField: '_id',
      },
    }

    const result = await resolveClientOptions(client, false, rootDir, srcDir)

    expect(result).toEqual({
      ...clientDefaults,
      pinia: {
        ...piniaDefaults,
        idField: '_id',
      },
    })
  })
})
