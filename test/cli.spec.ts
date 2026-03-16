import { existsSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertInitEmbeddedArgs, assertInitRemoteArgs, assertServiceGenerationArgs, generateMiddleware, generateService, runCli } from '../src/cli/index'

const LONG_TIMEOUT = 20000

describe('nuxt-feathers-zod CLI generators', () => {


it('publishes the CLI bin from dist instead of src', async () => {
  const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
    bin?: Record<string, string>
    files?: string[]
  }

  expect(pkg.bin?.['nuxt-feathers-zod']).toBe('./dist/cli/index.mjs')
  expect(pkg.files).toContain('dist')
  expect(pkg.files).not.toContain('src/cli')
})
  it('generates a mongodb service (4 files)', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'posts',
      adapter: 'mongodb',
      auth: true,
      idField: '_id',
      docs: false,
      schema: 'zod',
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'posts')
    const schemaFile = join(base, 'posts.schema.ts')
    const classFile = join(base, 'posts.class.ts')
    const sharedFile = join(base, 'posts.shared.ts')
    const svcFile = join(base, 'posts.ts')

    expect(existsSync(schemaFile)).toBe(true)
    expect(existsSync(classFile)).toBe(true)
    expect(existsSync(sharedFile)).toBe(true)
    expect(existsSync(svcFile)).toBe(true)

    const svc = await readFile(svcFile, 'utf8')
    expect(svc).toContain('authenticate(\'jwt\')')
    expect(svc).toContain('export function post')
  })

  it('supports --path, --idField, --docs and --collection', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'users',
      adapter: 'mongodb',
      auth: true,
      idField: 'id',
      servicePath: 'accounts',
      collectionName: 'users',
      docs: true,
      schema: 'zod',
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'users')
    const sharedFile = join(base, 'users.shared.ts')
    const schemaFile = join(base, 'users.schema.ts')
    const classFile = join(base, 'users.class.ts')
    const svcFile = join(base, 'users.ts')

    const shared = await readFile(sharedFile, 'utf8')
    expect(shared).toContain('export const userPath = \'accounts\'')

    const schema = await readFile(schemaFile, 'utf8')
    expect(schema).toContain('id: objectIdSchema()')

    const klass = await readFile(classFile, 'utf8')
    expect(klass).toContain('db.collection(\'users\')')

    const svc = await readFile(svcFile, 'utf8')
    expect(svc).toContain('docs:')
  })


  it('generates an adapter-less service via generateService --custom', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'actions',
      adapter: 'memory',
      auth: true,
      idField: 'id',
      docs: false,
      schema: 'none',
      dry: false,
      force: false,
      custom: true,
      methods: 'find',
      customMethods: 'run,preview',
    })

    const base = join(servicesDir, 'actions')
    const classFile = join(base, 'actions.class.ts')
    const sharedFile = join(base, 'actions.shared.ts')
    const svcFile = join(base, 'actions.ts')
    const hooksFile = join(base, 'actions.hooks.ts')

    expect(existsSync(classFile)).toBe(true)
    expect(existsSync(sharedFile)).toBe(true)
    expect(existsSync(svcFile)).toBe(true)
    expect(existsSync(hooksFile)).toBe(true)

    const klass = await readFile(classFile, 'utf8')
    expect(klass).toContain('async run')
    expect(klass).toContain('async preview')

    const shared = await readFile(sharedFile, 'utf8')
    expect(shared).toContain('actionMethods = ["find","run","preview"] as const')
  })

  const authAwareCombos = [
    { schema: 'none', adapter: 'memory', idField: 'id' },
    { schema: 'none', adapter: 'mongodb', idField: '_id' },
    { schema: 'zod', adapter: 'memory', idField: 'id' },
    { schema: 'zod', adapter: 'mongodb', idField: '_id' },
    { schema: 'json', adapter: 'memory', idField: 'id' },
    { schema: 'json', adapter: 'mongodb', idField: '_id' },
  ] as const

  it.each(authAwareCombos)(
    'generates auth-aware users service variant schema=$schema adapter=$adapter',
    { timeout: 15000 },
    async (combo) => {
      const root = await mkdtemp(join(tmpdir(), 'nfz-'))
      const servicesDir = join(root, 'services')
      const name = `users-${combo.schema}-${combo.adapter}`

      await generateService({
        projectRoot: root,
        servicesDir,
        name,
        adapter: combo.adapter,
        auth: true,
        authAware: true,
        idField: combo.idField,
        docs: false,
        schema: combo.schema,
        dry: false,
        force: false,
      })

      const base = join(servicesDir, name)
      const serviceFile = await readFile(join(base, `${name}.ts`), 'utf8')

      if (combo.schema === 'none') {
        const hooksFile = await readFile(join(base, `${name}.hooks.ts`), 'utf8')
        expect(hooksFile).toContain("authenticate('jwt')")
        expect(hooksFile).toContain("passwordHash({ strategy: 'local' })")
        expect(hooksFile).toContain('stripPassword')
        return
      }

      expect(serviceFile).toContain("authenticate('jwt')")
      const schemaFile = await readFile(join(base, `${name}.schema.ts`), 'utf8')
      expect(schemaFile).toContain("passwordHash({ strategy: 'local' })")
      expect(schemaFile).toContain('password: async () => undefined')
    },
  )

  it('can disable auth-aware generation explicitly for users service', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'users',
      adapter: 'memory',
      auth: true,
      authAware: false,
      idField: 'id',
      docs: false,
      schema: 'none',
      dry: false,
      force: false,
    })

    const hooks = await readFile(join(servicesDir, 'users', 'users.hooks.ts'), 'utf8')
    expect(hooks).not.toContain("passwordHash({ strategy: 'local' })")
    expect(hooks).not.toContain('stripPassword')
  })


  it('dispatches mongo management through the citty CLI entrypoint', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), "export default defineNuxtConfig({})\n")

    await runCli([
      'mongo',
      'management',
      '--url', 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
      '--auth', 'false',
      '--basePath', '///ops///mongo///',
      '--exposeUsersService', 'true',
    ], { cwd: root, throwOnError: true })

    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin'")
    expect(config).toContain('enabled: true')
    expect(config).toContain('auth: false')
    expect(config).toContain("basePath: '/ops/mongo'")
    expect(config).toContain('exposeUsersService: true')
  })

  it('supports dry-run for mongo management without mutating nuxt.config', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const initial = "export default defineNuxtConfig({})\n"
    await writeFile(join(root, 'nuxt.config.ts'), initial)

    await runCli([
      'mongo',
      'management',
      '--basePath', '/mongo-admin',
      '--dry',
    ], { cwd: root, throwOnError: true })

    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toBe(initial)
  })


  it('dispatches add middleware through the citty CLI entrypoint', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))

    await runCli(['add', 'middleware', 'session', '--target', 'nitro'], { cwd: root })

    const file = join(root, 'server', 'middleware', 'session.ts')
    expect(existsSync(file)).toBe(true)
    const txt = await readFile(file, 'utf8')
    expect(txt).toContain('defineEventHandler')
  })

  it('generates a Nitro middleware', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))

    await generateMiddleware({
      projectRoot: root,
      name: 'session',
      target: 'nitro',
      dry: false,
      force: false,
    })

    const file = join(root, 'server', 'middleware', 'session.ts')
    expect(existsSync(file)).toBe(true)
    const txt = await readFile(file, 'utf8')
    expect(txt).toContain('defineEventHandler')
  })


  it('hardens invalid service flag combinations', () => {
    expect(() => assertServiceGenerationArgs({ _: [], collection: 'users' }, false, 'memory')).toThrow(
      '--collection requires --adapter mongodb',
    )
    expect(() => assertServiceGenerationArgs({ _: [], adapter: 'mongodb' }, true, 'mongodb')).toThrow(
      '--adapter is not supported for adapter-less custom services',
    )
    expect(() => assertServiceGenerationArgs({ _: [], customMethods: 'run' }, false, 'memory')).toThrow(
      '--methods and --customMethods are only supported with --custom',
    )
  })

  it('hardens invalid remote init flag combinations', () => {
    expect(() => assertInitRemoteArgs({ _: [], websocketPath: '/socket.io' }, 'rest', false)).toThrow(
      'websocket options are not supported when --transport rest is used',
    )
    expect(() => assertInitRemoteArgs({ _: [], payloadMode: 'keycloak' }, 'socketio', false)).toThrow(
      'auth options require --auth true',
    )
  })

  it('hardens invalid embedded init flag combinations', () => {
    expect(() => assertInitEmbeddedArgs({ _: [], serveStaticPath: '/public' }, 'express', false)).toThrow(
      '--serveStaticPath/--serveStaticDir require --serveStatic true',
    )
    expect(() => assertInitEmbeddedArgs({ _: [], expressBaseline: true }, 'koa', true, 'express-baseline')).toThrow(
      'express-baseline preset is only available with --framework express',
    )
  })

  it('dispatches init embedded through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), 'export default defineNuxtConfig({})\n')

    await runCli(['init', 'embedded', '--servicesDir', 'services', '--auth', '--swagger'], { cwd: root, throwOnError: true })

    const nuxtConfig = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(nuxtConfig).toContain("mode: 'embedded'")
    expect(nuxtConfig).toContain("servicesDirs: ['services']")
    expect(nuxtConfig).toContain('auth: true')
    expect(nuxtConfig).toContain('swagger: true')
  })

  it('dispatches init remote through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), 'export default defineNuxtConfig({})\n')

    await runCli(['init', 'remote', '--url', 'https://api.example.test', '--transport', 'rest', '--auth'], { cwd: root, throwOnError: true })

    const nuxtConfig = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(nuxtConfig).toContain("mode: 'remote'")
    expect(nuxtConfig).toContain("url: 'https://api.example.test'")
    expect(nuxtConfig).toContain("transport: 'rest'")
    expect(nuxtConfig).not.toContain("transports:")
    expect(nuxtConfig).toContain('enabled: true')
  })

  it('dispatches auth service through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')
    await writeFile(join(root, 'package.json'), '{"name":"tmp"}\n')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'posts',
      adapter: 'memory',
      auth: false,
      idField: 'id',
      docs: false,
      dry: false,
      force: false,
    })

    await runCli(['auth', 'service', 'posts', '--enabled'], { cwd: root, throwOnError: true })

    const hooks = await readFile(join(servicesDir, 'posts', 'posts.hooks.ts'), 'utf8')
    expect(hooks).toContain("authenticate('jwt')")
  })

  it('dispatches plugins add through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), "export default defineNuxtConfig({})\n")

    await runCli(['plugins', 'add', 'audit-log'], { cwd: root, throwOnError: true })

    const pluginFile = await readFile(join(root, 'server', 'feathers', 'audit-log.ts'), 'utf8')
    const nuxtConfig = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(pluginFile).toContain('defineFeathersServerPlugin')
    expect(nuxtConfig).toContain("pluginDirs: ['server/feathers']")
  })

  it('dispatches modules add through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), "export default defineNuxtConfig({})\n")

    await runCli(['modules', 'add', 'security-headers', '--preset', 'security-headers'], { cwd: root, throwOnError: true })

    const moduleFile = await readFile(join(root, 'server', 'feathers', 'modules', 'security-headers.ts'), 'utf8')
    const nuxtConfig = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(moduleFile).toContain('defineFeathersServerModule')
    expect(nuxtConfig).toContain("moduleDirs: ['server/feathers/modules']")
  })

  it('dispatches middlewares add through the citty CLI entrypoint', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))

    await runCli(['middlewares', 'add', 'request-id'], { cwd: root, throwOnError: true })

    const middlewareFile = await readFile(join(root, 'server', 'middleware', 'request-id.ts'), 'utf8')
    expect(middlewareFile).toContain('defineEventHandler')
  })


})
