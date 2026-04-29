import type { Application } from 'nuxt-feathers-zod/server'

interface SeedContext {
  moduleOptions?: unknown
}

interface RuntimeConfigLike {
  demo?: {
    user?: string
    password?: string
    roles?: string | string[]
  }
}

function toRoles(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map(role => String(role).trim()).filter(Boolean)

  if (typeof value === 'string')
    return value.split(',').map(role => role.trim()).filter(Boolean)

  return ['admin', 'user']
}

function getRuntimeConfig(app: Application): RuntimeConfigLike {
  const fromApp = app.get?.('nuxtRuntimeConfig')
  if (fromApp && typeof fromApp === 'object')
    return fromApp as RuntimeConfigLike

  return {
    demo: {
      user: process.env.NFZ_DEMO_USER || 'admin',
      password: process.env.NFZ_DEMO_PASSWORD || 'admin123',
      roles: process.env.NFZ_DEMO_ROLES || 'admin,user',
    },
  }
}

async function ensureMongoIndexes(app: Application): Promise<void> {
  const db = app.get?.('mongodbDb')
  if (!db || typeof db.collection !== 'function')
    return

  await Promise.all([
    db.collection('users').createIndex({ userId: 1 }, { unique: true }),
    db.collection('messages').createIndex({ createdAt: -1 }),
  ])
}

export default async function seedUsers(app: Application, _ctx: SeedContext = {}) {
  await ensureMongoIndexes(app)

  const users = app.service('users')
  const messages = app.service('messages')
  const runtimeConfig = getRuntimeConfig(app)
  const demo = runtimeConfig.demo || {}

  const userId = String(demo.user || 'admin')
  const password = String(demo.password || 'admin123')
  const roles = toRoles(demo.roles)

  const existing = await users.find({
    query: { userId, $limit: 1 },
    paginate: false,
  } as any)

  const rows = Array.isArray(existing) ? existing : existing.data || []
  if (!rows.length) {
    await users.create({
      userId,
      password,
      roles,
    } as any)

    console.info(`[nfz-starter] Seed user created: ${userId} / ${password}`)
  }
  else {
    console.info(`[nfz-starter] Seed user already exists: ${userId}`)
  }

  const existingMessages = await messages.find({
    query: { $limit: 1 },
    paginate: false,
  } as any)

  const messageRows = Array.isArray(existingMessages)
    ? existingMessages
    : existingMessages.data || []

  if (!messageRows.length) {
    await messages.create({
      text: 'Bienvenue dans le starter NFZ + Quasar + MongoDB.',
    } as any, {
      user: { userId },
    } as any)
  }
}
