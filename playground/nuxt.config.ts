import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'
import { defineNuxtConfig } from 'nuxt/config'

// NOTE: `nuxi dev playground` runs Nuxt with `playground/` as the app root.
// Nuxt loads `playground/.env` by default, not the repository root `.env`.
// On Windows + Bun + Nuxt CLI, relying on implicit dotenv loading can be flaky.
// For DX in this module repo, we force-load BOTH:
//   - playground/.env
//   - ../.env (repo root)
// We only set variables that are not already defined in process.env.
// On Windows, a variable can exist but be an empty string; treat that as "unset".
function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value
  }
}

const playgroundEnvPath = resolve(__dirname, './.env')
const rootEnvPath = resolve(__dirname, '../.env')
// Precedence: repo root .env should win over playground/.env defaults.
loadEnvFile(rootEnvPath)
loadEnvFile(playgroundEnvPath)

// DX log (dev only): show effective values read from .env files.
// Helps debug Windows/Bun/Nuxt CLI environment precedence.


function envBool(name: string, fallback = false) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase())
}

function envList(name: string, fallback: string[] = []) {
  const raw = process.env[name]
  if (!raw) return fallback
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

const remoteServices = envList('NFZ_REMOTE_SERVICES', ['messages', 'users', 'ldapusers'])
const keycloakEnabled = envBool('NFZ_KEYCLOAK_ENABLED', false)
const remoteMode = ((process.env.NFZ_CLIENT_MODE as any) || 'embedded') === 'remote'
const remoteTransport = (process.env.NFZ_REMOTE_TRANSPORT as any) || 'auto'
const remoteAuthEnabled = envBool('NFZ_REMOTE_AUTH_ENABLED', true)
const remoteAuthPayloadMode = (process.env.NFZ_REMOTE_AUTH_PAYLOAD_MODE as any) || (keycloakEnabled ? 'keycloak' : 'jwt')
const remoteAuthTokenField = process.env.NFZ_REMOTE_AUTH_TOKEN_FIELD || (remoteAuthPayloadMode === 'keycloak' ? 'access_token' : 'accessToken')

function buildPlaygroundKeycloakConfig() {
  if (!keycloakEnabled) return undefined
  const serverUrl = process.env.KC_URL
  const realm = process.env.KC_REALM
  const clientId = process.env.KC_CLIENT_ID
  if (!serverUrl || !realm || !clientId) return undefined
  return {
    serverUrl,
    realm,
    clientId,
    onLoad: ((process.env.KC_ONLOAD as any) || 'check-sso'),
    authServicePath: process.env.KC_AUTH_SERVICE_PATH || '/_keycloak',
  }
}

const keycloakConfig = buildPlaygroundKeycloakConfig()
const embeddedMongoEnabled = envBool('NFZ_PLAYGROUND_EMBEDDED_MONGODB', true)
const requestedMongoUrl = (process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL || process.env.MONGO_URL || '').trim()
const fallbackToMemory = envBool('NFZ_PLAYGROUND_EMBEDDED_MONGODB_FALLBACK_TO_MEMORY', true)

async function canConnectToMongo(url: string) {
  let client: MongoClient | null = null
  try {
    client = await MongoClient.connect(url, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      maxPoolSize: 1,
    })
    await client.db().admin().ping()
    return true
  }
  catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error || '')
      console.warn(`[NFZ DX] Mongo URL probe failed: ${message}`)
    }
    return false
  }
  finally {
    await client?.close().catch(() => {})
  }
}

let embeddedMongoMode: 'disabled' | 'memory' | 'url' = 'disabled'
let mongod: MongoMemoryServer | null = null
let effectiveMongoUrl = ''
let embeddedMongoFallbackUsed = false

if (embeddedMongoEnabled) {
  if (requestedMongoUrl) {
    const externalMongoReachable = await canConnectToMongo(requestedMongoUrl)
    if (externalMongoReachable) {
      embeddedMongoMode = 'url'
      effectiveMongoUrl = requestedMongoUrl
    }
    else if (fallbackToMemory) {
      mongod = await MongoMemoryServer.create()
      embeddedMongoMode = 'memory'
      effectiveMongoUrl = mongod.getUri()
      embeddedMongoFallbackUsed = true
    }
    else {
      throw new Error(`[NFZ DX] Unable to connect to MongoDB URL and fallback is disabled: ${requestedMongoUrl}`)
    }
  }
  else {
    mongod = await MongoMemoryServer.create()
    embeddedMongoMode = 'memory'
    effectiveMongoUrl = mongod.getUri()
  }
}

// DX log (dev only): show effective values read from .env files.
// Helps debug Windows/Bun/Nuxt CLI environment precedence and Mongo mode selection.
if (process.env.NODE_ENV !== 'production') {
  const mode = process.env.NFZ_CLIENT_MODE || 'embedded'
  const url = process.env.NFZ_REMOTE_URL || ''
  // eslint-disable-next-line no-console
  console.info(`[NFZ DX] NFZ_CLIENT_MODE=${mode}`)
  // eslint-disable-next-line no-console
  console.info(`[NFZ DX] NFZ_REMOTE_URL=${url}`)
  // eslint-disable-next-line no-console
  console.info(`[NFZ DX] NFZ_PLAYGROUND_EMBEDDED_MONGODB_MODE=${embeddedMongoMode}`)
  // eslint-disable-next-line no-console
  console.info(`[NFZ DX] NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL=${effectiveMongoUrl ? '[configured]' : ''}`)
  // eslint-disable-next-line no-console
  console.info(`[NFZ DX] NFZ_PLAYGROUND_EMBEDDED_MONGODB_FALLBACK_USED=${embeddedMongoFallbackUsed ? 'true' : 'false'}`)
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-23',

  typescript: {
    typeCheck: false,
  },
  extends: [
    '@gabortorma/nuxt-eslint-layer',
  ],

  modules: [
    '@pinia/nuxt',
    '../src/module.ts',
  ],

  feathers: {
    swagger: { enabled: true },
    servicesDirs: '../services',
    server: {
      pluginDirs: ['server/feathers'],
    },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: {
        path: process.env.NFZ_REMOTE_WS_PATH || '/socket.io',
        transports: envList('NFZ_WEBSOCKET_TRANSPORTS', ['websocket', 'polling']),
        connectTimeout: Number(process.env.NFZ_WEBSOCKET_CONNECT_TIMEOUT || '20000'),
        cors: {
          origin: process.env.NFZ_WEBSOCKET_CORS_ORIGIN || true,
          credentials: envBool('NFZ_WEBSOCKET_CORS_CREDENTIALS', true),
        },
      },
    },
    database: embeddedMongoEnabled
      ? {
          mongo: {
            url: effectiveMongoUrl,
          },
        }
      : undefined,
    keycloak: keycloakConfig,

    client: {
      mode: remoteMode ? 'remote' : 'embedded',
      remote: remoteMode
        ? {
            url: process.env.NFZ_REMOTE_URL || 'https://api.domain.ltd',
            transport: remoteTransport,
            restPath: process.env.NFZ_REMOTE_REST_PATH || '/api/v1',
            websocketPath: process.env.NFZ_REMOTE_WS_PATH || '/socket.io',
            auth: remoteAuthEnabled
              ? {
                  enabled: true,
                  servicePath: process.env.NFZ_REMOTE_AUTH_SERVICE_PATH || 'authentication',
                  payloadMode: remoteAuthPayloadMode,
                  strategy: (process.env.NFZ_REMOTE_AUTH_STRATEGY as any) || 'jwt',
                  tokenField: remoteAuthTokenField,
                  storageKey: process.env.NFZ_REMOTE_AUTH_STORAGE_KEY || 'feathers-jwt',
                  reauth: envBool('NFZ_REMOTE_AUTH_REAUTH', true),
                }
              : { enabled: false },
            services: remoteServices.map(path => ({ path })),
          }
        : undefined,
      pinia: {
        idField: 'id',
        services: {
          mongos: {
            idField: '_id',
          },
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      nfzPlayground: {
        embeddedMongoEnabled,
        embeddedMongoMode,
        embeddedMongoUrlConfigured: !!effectiveMongoUrl,
        embeddedMongoFallbackUsed,
      },
    },
  },

  hooks: {
    close: async () => {
      await mongod?.stop()
    },
  },

  ssr: true,

  devtools: { enabled: false },
})
