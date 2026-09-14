import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const MODES = new Set(['auto', 'external', 'memory'])

export function resolveStarterReleaseMongoMode(value) {
  const mode = String(value || 'auto').trim().toLowerCase()
  if (!MODES.has(mode)) {
    throw new Error(
      `Invalid NFZ_STARTER_RELEASE_MONGODB_MODE=${JSON.stringify(value)}. Expected auto, external or memory.`,
    )
  }
  return mode
}

export async function probeMongoUrl(url) {
  const { MongoClient } = await import('mongodb')
  const client = new MongoClient(url, {
    connectTimeoutMS: 2_000,
    serverSelectionTimeoutMS: 2_000,
  })

  const probeCollectionName = `nfz_release_probe_${randomUUID().replaceAll('-', '')}`

  try {
    await client.connect()
    const db = client.db()
    await db.command({ ping: 1 })

    const collection = db.collection(probeCollectionName)
    try {
      await collection.insertOne({ nfzProbe: true })
      await collection.createIndex({ nfzProbe: 1 })
      await collection.findOne({ nfzProbe: true })
    }
    finally {
      await collection.drop().catch(() => undefined)
    }
  }
  finally {
    await client.close().catch(() => undefined)
  }
}

function resolveBinaryCacheDirectory(env) {
  const configured = String(env.NFZ_STARTER_RELEASE_MONGODB_CACHE_DIR || '').trim()
  if (configured)
    return resolve(configured)

  const stateRoot = env.LOCALAPPDATA
    ? resolve(env.LOCALAPPDATA, 'nuxt-feathers-zod')
    : resolve(homedir(), '.cache', 'nuxt-feathers-zod')
  return resolve(stateRoot, 'mongodb-binaries')
}

export async function createIsolatedMongoRuntime({ env = process.env } = {}) {
  const downloadDir = resolveBinaryCacheDirectory(env)
  mkdirSync(downloadDir, { recursive: true })

  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const server = await MongoMemoryServer.create({
    binary: { downloadDir },
    instance: { dbName: 'nfz_starter_release' },
  })

  return {
    mode: 'memory',
    url: server.getUri('nfz_starter_release'),
    async stop() {
      await server.stop()
    },
  }
}

async function startIsolatedMongo({ env, createMemoryRuntime }) {
  try {
    return await createMemoryRuntime({ env })
  }
  catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Unable to start the isolated MongoDB used by starter release validation: ${detail}. `
      + 'To validate against a real test database instead, set NFZ_STARTER_RELEASE_MONGODB_MODE=external '
      + 'and provide an authenticated MONGODB_URL with sufficient create/read/write/index permissions.',
    )
  }
}

export async function provisionStarterReleaseMongo({
  requestedUrl = process.env.MONGODB_URL,
  mode = process.env.NFZ_STARTER_RELEASE_MONGODB_MODE,
  env = process.env,
  probe = probeMongoUrl,
  createMemoryRuntime = createIsolatedMongoRuntime,
  logger = console,
} = {}) {
  const resolvedMode = resolveStarterReleaseMongoMode(mode)
  const normalizedUrl = String(requestedUrl || '').trim()

  if (resolvedMode === 'external') {
    if (!normalizedUrl) {
      throw new Error(
        'NFZ_STARTER_RELEASE_MONGODB_MODE=external requires MONGODB_URL.',
      )
    }

    try {
      await probe(normalizedUrl)
    }
    catch {
      throw new Error(
        'The configured external MONGODB_URL is unreachable or cannot authenticate. '
        + 'Provide a non-production database URL with the permissions required by the starter, '
        + 'or use NFZ_STARTER_RELEASE_MONGODB_MODE=memory.',
      )
    }

    logger.info('[starter-release] MongoDB validation mode: explicit external connection.')
    return { mode: 'external', url: normalizedUrl, stop: () => Promise.resolve() }
  }

  if (resolvedMode === 'memory') {
    logger.info('[starter-release] MongoDB validation mode forced to isolated memory server.')
    return startIsolatedMongo({ env, createMemoryRuntime })
  }

  if (normalizedUrl) {
    logger.info(
      '[starter-release] MONGODB_URL is ignored in auto mode; using an isolated MongoDB for deterministic candidate validation. '
      + 'Set NFZ_STARTER_RELEASE_MONGODB_MODE=external to opt into the configured database.',
    )
  }
  else {
    logger.info('[starter-release] MongoDB validation mode: isolated memory server (auto).')
  }

  return startIsolatedMongo({ env, createMemoryRuntime })
}
