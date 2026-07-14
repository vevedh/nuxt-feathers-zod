import { Forbidden } from '@feathersjs/errors'
import type { EntityId, MessageRecord, ServiceListResult, StudioUser } from '~/types/auth'
import { getErrorMessage, getFeathersErrorDebug } from '~/utils/errors'

interface FeathersCallParams {
  query?: Record<string, unknown>
  headers?: Record<string, string>
  authentication?: {
    strategy: 'jwt'
    accessToken: string
  }
}

function unwrapList<T>(result: T[] | ServiceListResult<T>): T[] {
  return Array.isArray(result) ? result : result.data ?? []
}

function normalizeMongoRecord<T extends { id?: EntityId, _id?: EntityId }>(record: T): T {
  if (record.id != null || record._id == null)
    return record

  return {
    ...record,
    id: String(record._id),
    _id: String(record._id),
  }
}

function sortByCreatedAtDesc<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    return String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''))
  })
}

export function useAdminFeathers() {
  const nuxtApp = useNuxtApp()
  const session = useStudioSessionStore()

  function api() {
    const client = nuxtApp.$api
    if (!client)
      throw new Error('Client Feathers NFZ indisponible.')
    return client
  }

  async function ensureAuthenticated(): Promise<void> {
    await session.restore('admin-feathers-access')
    if (!session.authenticated)
      throw new Forbidden('Authentification requise')
  }

  async function authParams(query?: Record<string, unknown>): Promise<FeathersCallParams> {
    await ensureAuthenticated()

    const accessToken = session.accessToken
    const authorization = await session.getAuthorizationHeader()

    if (!accessToken || !authorization)
      throw new Forbidden('Session NFZ restaurée mais token JWT indisponible.')

    return {
      query,
      headers: {
        Authorization: authorization,
      },
      authentication: {
        strategy: 'jwt',
        accessToken,
      },
    }
  }

  async function run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    }
    catch (error) {
      console.error('[nfz-starter] Feathers call failed:', getFeathersErrorDebug(error))
      throw new Error(getErrorMessage(error))
    }
  }

  return {
    async whoami(): Promise<StudioUser | null> {
      await ensureAuthenticated()
      return session.user
    },

    messages: {
      async find(): Promise<MessageRecord[]> {
        return run(async () => {
          const result = await api().service('messages').find(
            await authParams({ $limit: 50 }),
          )

          return sortByCreatedAtDesc(
            unwrapList<MessageRecord>(result as ServiceListResult<MessageRecord>)
              .map(normalizeMongoRecord),
          )
        })
      },

      async create(text: string): Promise<MessageRecord> {
        return run(async () => {
          const record = await api().service('messages').create(
            { text },
            await authParams(),
          ) as MessageRecord

          return normalizeMongoRecord(record)
        })
      },

      async remove(id: EntityId): Promise<MessageRecord> {
        return run(async () => {
          const record = await api().service('messages').remove(
            id,
            await authParams(),
          ) as MessageRecord

          return normalizeMongoRecord(record)
        })
      },
    },
  }
}
