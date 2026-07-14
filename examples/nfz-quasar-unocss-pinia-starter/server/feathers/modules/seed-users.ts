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
    enabled?: boolean | string
    user?: string
    password?: string
    roles?: string | string[]
  }
}

const UNSAFE_DEMO_PASSWORDS = new Set([
  'admin123',
  'changeme',
  'password',
  'password123',
])

function toRoles(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map(role => String(role).trim()).filter(Boolean)

  if (typeof value === 'string')
    return value.split(',').map(role => role.trim()).filter(Boolean)

  return ['admin', 'user']
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean')
    return value

  if (typeof value !== 'string')
    return undefined

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized))
    return true
  if (['0', 'false', 'no', 'off'].includes(normalized))
    return false

  return undefined
}

function getRuntimeConfig(app: Application): RuntimeConfigLike {
  const fromApp = app.get?.('nuxtRuntimeConfig')
  const appConfig = fromApp && typeof fromApp === 'object'
    ? fromApp as RuntimeConfigLike
    : {}

  return {
    ...appConfig,
    demo: {
      enabled: appConfig.demo?.enabled ?? process.env.NFZ_DEMO_ENABLED,
      user: appConfig.demo?.user ?? process.env.NFZ_DEMO_USER ?? 'admin',
      password: appConfig.demo?.password ?? process.env.NFZ_DEMO_PASSWORD ?? 'admin123',
      roles: appConfig.demo?.roles ?? process.env.NFZ_DEMO_ROLES ?? 'admin,user',
    },
  }
}

function getRuntimeEnvironment(runtimeConfig: RuntimeConfigLike): string {
  return String(runtimeConfig.app?.env || process.env.NODE_ENV || 'development')
    .trim()
    .toLowerCase()
}

function shouldSeedDemoUser(runtimeConfig: RuntimeConfigLike): boolean {
  const explicit = readOptionalBoolean(runtimeConfig.demo?.enabled)
  if (explicit !== undefined)
    return explicit

  return getRuntimeEnvironment(runtimeConfig) !== 'production'
}

function ensureSafeDemoPassword(runtimeConfig: RuntimeConfigLike, password: string): void {
  if (getRuntimeEnvironment(runtimeConfig) !== 'production')
    return

  const normalized = password.trim().toLowerCase()
  if (password.length < 12 || UNSAFE_DEMO_PASSWORDS.has(normalized)) {
    throw new Error(
      '[nfz-starter] NFZ_DEMO_PASSWORD doit contenir au moins 12 caractères '
      + 'et ne doit pas utiliser un mot de passe de démonstration connu.',
    )
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
  const runtimeConfig = getRuntimeConfig(app)

  if (!shouldSeedDemoUser(runtimeConfig)) {
    console.info('[nfz-starter] Demo seed disabled for this environment.')
    return
  }

  const demo = runtimeConfig.demo || {}
  const userId = String(demo.user || 'admin')
  const password = String(demo.password || 'admin123')
  const roles = toRoles(demo.roles)

  ensureSafeDemoPassword(runtimeConfig, password)
  await ensureMongoIndexes(app)

  const users = app.service('users')
  const messages = app.service('messages')
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

    console.info('[nfz-starter] Demo seed user created.')
  }
  else {
    console.info('[nfz-starter] Demo seed user already exists.')
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
