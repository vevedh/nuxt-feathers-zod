import type { Application } from 'nuxt-feathers-zod/server'
import process from 'node:process'

interface SeedContext {
  moduleOptions?: unknown
}

interface RuntimeConfigLike {
  app?: {
    env?: string
  }
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

function ensureSafeDemoPassword(runtimeConfig: RuntimeConfigLike, password: string): void {
  const env = String(runtimeConfig.app?.env || process.env.NODE_ENV || 'development').toLowerCase()
  const isProduction = env === 'production'

  if (isProduction && password === 'admin123') {
    throw new Error('[nfz-starter] Refus de démarrer en production avec le mot de passe demo par défaut (admin123). Définis NFZ_DEMO_PASSWORD.')
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

  ensureSafeDemoPassword(runtimeConfig, password)

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

    console.warn(`[nfz-starter] Seed user created: ${userId}`)
  }
  else {
    console.warn(`[nfz-starter] Seed user already exists: ${userId}`)
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
