import { describe, expect, it, vi } from 'vitest'
import { NfzLocalStrategy, normalizeNfzLocalEntityId } from './local'

const objectId = '6a652673e2a21bbb2f337242'

function foreignObjectId(hex = objectId) {
  return {
    _bsontype: 'ObjectId',
    constructor: { name: 'ObjectId' },
    toHexString: () => hex,
    toJSON: () => hex,
  }
}

describe('nfz local authentication MongoDB entity IDs', () => {
  it('normalizes a BSON ObjectId from another driver copy', () => {
    expect(normalizeNfzLocalEntityId(foreignObjectId())).toBe(objectId)
  })

  it('preserves primitive and unrelated object IDs for downstream validation', () => {
    const unrelated = { toHexString: () => objectId }

    expect(normalizeNfzLocalEntityId('user-1')).toBe('user-1')
    expect(normalizeNfzLocalEntityId(42)).toBe(42)
    expect(normalizeNfzLocalEntityId(unrelated)).toBe(unrelated)
  })

  it('re-reads an externally authenticated entity with the normalized string ID', async () => {
    const get = vi.fn(async (id: unknown) => ({ _id: id, userId: 'admin' }))
    const strategy = new NfzLocalStrategy()

    Object.assign(strategy as any, {
      name: 'local',
      app: {
        service: () => ({ id: '_id', get }),
      },
      authentication: {
        configuration: {
          service: 'users',
          entity: 'user',
          entityId: '_id',
          local: {},
        },
      },
    })

    const result = { _id: foreignObjectId(), userId: 'admin' }
    await strategy.getEntity(result, { provider: 'rest' })

    expect(get).toHaveBeenCalledWith(objectId, expect.objectContaining({
      provider: 'rest',
      user: expect.objectContaining({ _id: objectId }),
    }))
  })

  it('does not change the internal local-strategy result path', async () => {
    const get = vi.fn()
    const strategy = new NfzLocalStrategy()
    const id = foreignObjectId()
    const result = { _id: id, userId: 'admin' }

    Object.assign(strategy as any, {
      name: 'local',
      app: {
        service: () => ({ id: '_id', get }),
      },
      authentication: {
        configuration: {
          service: 'users',
          entity: 'user',
          entityId: '_id',
          local: {},
        },
      },
    })

    await expect(strategy.getEntity(result, {})).resolves.toBe(result)
    expect(get).not.toHaveBeenCalled()
  })
})
