import type { Params } from '@feathersjs/feathers'
import { LocalStrategy } from '@feathersjs/authentication-local'

const objectIdPattern = /^[0-9a-f]{24}$/i

interface BsonObjectIdLike {
  _bsontype?: unknown
  constructor?: { name?: unknown }
  toHexString?: unknown
}

function isBsonObjectIdLike(value: unknown): value is BsonObjectIdLike & { toHexString(): string } {
  if (!value || typeof value !== 'object')
    return false

  const candidate = value as BsonObjectIdLike
  const bsonType = candidate._bsontype
  const constructorName = candidate.constructor?.name

  return typeof candidate.toHexString === 'function'
    && (bsonType === 'ObjectId' || constructorName === 'ObjectId')
}

/**
 * Convert a BSON ObjectId from any installed mongodb/bson copy to the string ID
 * accepted by Feathers adapters. Primitive IDs and unrelated objects are left
 * unchanged so the downstream service keeps its normal validation behavior.
 */
export function normalizeNfzAuthenticationEntityId(value: unknown): unknown {
  if (!isBsonObjectIdLike(value))
    return value

  try {
    const normalized = value.toHexString()
    return objectIdPattern.test(normalized) ? normalized : value
  }
  catch {
    return value
  }
}

/** Backwards-compatible alias retained for code that imported the Mongo-specific helper name. */
export function normalizeNfzLocalEntityId(value: unknown): unknown {
  return normalizeNfzAuthenticationEntityId(value)
}

/**
 * Local authentication strategy that keeps Feathers' upstream behavior while
 * normalizing cross-package BSON ObjectIds before the external entity re-read.
 */
export class NfzLocalStrategy extends LocalStrategy {
  async getEntity(result: any, params: Params): Promise<any> {
    if (!params.provider)
      return super.getEntity(result, params)

    const entityService = this.entityService as { id?: string }
    const { entityId = entityService.id } = this.configuration
    const currentId = entityId ? result?.[entityId] : undefined
    const normalizedId = normalizeNfzAuthenticationEntityId(currentId)

    if (!entityId || normalizedId === currentId)
      return super.getEntity(result, params)

    return super.getEntity({
      ...result,
      [entityId]: normalizedId,
    }, params)
  }
}
