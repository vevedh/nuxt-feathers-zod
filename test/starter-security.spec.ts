import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

interface MockService {
  find: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

function createApp(runtimeConfig: Record<string, unknown>) {
  const users: MockService = {
    find: vi.fn(async () => []),
    create: vi.fn(async data => data),
  }
  const messages: MockService = {
    find: vi.fn(async () => []),
    create: vi.fn(async data => data),
  }
  const createIndex = vi.fn(async () => 'index')
  const app = {
    get: vi.fn((key: string) => {
      if (key === 'nuxtRuntimeConfig')
        return runtimeConfig
      if (key === 'mongodbDb')
        return { collection: vi.fn(() => ({ createIndex })) }
      return undefined
    }),
    service: vi.fn((path: string) => path === 'users' ? users : messages),
  }

  return { app, users, messages, createIndex }
}

type SeedUsers = (
  app: ReturnType<typeof createApp>['app'],
  context?: { moduleOptions?: unknown },
) => Promise<void>

const starterSeedPath = join(
  process.cwd(),
  'examples',
  'nfz-quasar-unocss-pinia-starter',
  'server',
  'feathers',
  'modules',
  'seed-users.ts',
)

let isolatedModuleDir = ''
let seedUsers: SeedUsers

async function loadStarterSeedModule(): Promise<SeedUsers> {
  const source = await readFile(starterSeedPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    fileName: starterSeedPath,
    reportDiagnostics: true,
  })

  const errors = (transpiled.diagnostics || [])
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)

  if (errors.length) {
    throw new Error(errors
      .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      .join('\n'))
  }

  isolatedModuleDir = await mkdtemp(join(tmpdir(), 'nfz-starter-seed-test-'))
  const modulePath = join(isolatedModuleDir, 'seed-users.mjs')
  await writeFile(modulePath, transpiled.outputText, 'utf8')

  const moduleUrl = `${pathToFileURL(modulePath).href}?v=${Date.now()}`
  const loaded = await import(moduleUrl) as { default?: unknown }

  if (typeof loaded.default !== 'function')
    throw new TypeError('Starter seed module must export a default function')

  return loaded.default as SeedUsers
}

beforeAll(async () => {
  seedUsers = await loadStarterSeedModule()
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.NFZ_DEMO_ENABLED
  delete process.env.NFZ_DEMO_PASSWORD
})

afterAll(async () => {
  if (isolatedModuleDir)
    await rm(isolatedModuleDir, { recursive: true, force: true })
})

describe('starter demo seed security', () => {
  it('disables the demo seed in production by default', async () => {
    const { app, users, messages, createIndex } = createApp({
      app: { env: 'production' },
      demo: {},
    })
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    await seedUsers(app)

    expect(app.service).not.toHaveBeenCalled()
    expect(users.create).not.toHaveBeenCalled()
    expect(messages.create).not.toHaveBeenCalled()
    expect(createIndex).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledWith('[nfz-starter] Demo seed disabled for this environment.')
  })

  it('rejects weak demo passwords when production seeding is explicitly enabled', async () => {
    const { app } = createApp({
      app: { env: 'production' },
      demo: {
        enabled: true,
        password: 'admin123',
      },
    })

    await expect(seedUsers(app)).rejects.toThrow(/au moins 12 caractères/)
    expect(app.service).not.toHaveBeenCalled()
  })

  it('allows an explicit strong production seed without logging credentials', async () => {
    const { app, users, messages } = createApp({
      app: { env: 'production' },
      demo: {
        enabled: true,
        user: 'demo-admin',
        password: 'Correct-Horse-2026!',
        roles: ['admin'],
      },
    })
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    await seedUsers(app)

    expect(users.create).toHaveBeenCalledWith({
      userId: 'demo-admin',
      password: 'Correct-Horse-2026!',
      roles: ['admin'],
    })
    expect(messages.create).toHaveBeenCalledTimes(1)
    const logged = info.mock.calls.flat().join(' ')
    expect(logged).not.toContain('Correct-Horse-2026!')
    expect(logged).not.toContain('demo-admin')
  })

  it('keeps the development demo seed enabled by default', async () => {
    const { app, users } = createApp({
      app: { env: 'development' },
      demo: {},
    })
    vi.spyOn(console, 'info').mockImplementation(() => {})

    await seedUsers(app)

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin',
      password: 'admin123',
    }))
  })
})
