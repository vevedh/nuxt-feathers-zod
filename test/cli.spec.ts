import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { assertInitEmbeddedArgs, assertInitRemoteArgs, assertServiceGenerationArgs, generateFileService, generateMiddleware, generateService, runCli } from '../src/cli/index'
import { resolveServerOptions } from '../src/runtime/options/server'
import { getServerPluginContents } from '../src/runtime/templates/server/plugin'
const LONG_TIMEOUT = 20000

function getTsParseMessages(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  return sourceFile.parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

async function expectGeneratedTsSyntaxOk(files: string[]) {
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const messages = getTsParseMessages(file, source)
    expect(messages).toEqual([])
  }
}

describe('nuxt-feathers-zod CLI generators', () => {
it('keeps public release metadata aligned with package version', async () => {
  const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as { version: string }
  const targets = [
    'README.md',
    'docs/guide/cli.md',
    'docs/en/guide/cli.md',
    'docs/reference/cli.md',
    'docs/en/reference/cli.md',
    'AI_CONTEXT/CLI_REFERENCE.md',
  ]
  for (const file of targets) {
    const text = await readFile(join(process.cwd(), file), 'utf8')
    expect(text).toContain(pkg.version)
  }
})
  
it('publishes the CLI bin from dist instead of src', async () => {
  const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
    bin?: Record<string, string>
    files?: string[]
  }
  expect(pkg.bin?.['nuxt-feathers-zod']).toBe('./bin/nuxt-feathers-zod')
  expect(pkg.bin?.nfz).toBe('./bin/nfz')
  expect(pkg.files).toContain('dist')
  expect(pkg.files).toContain('bin')
  expect(pkg.files).not.toContain('src/cli')
})
  it('resolves built-in server modules to package subpath exports in consumer apps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-consumer-'))
    const resolved = await resolveServerOptions({
      secureDefaults: true,
      secure: { compression: true, cors: true, helmet: true, bodyParser: { json: true, urlencoded: true } },
    } as any, root, root, 'express')

    const compressionModule = resolved.modules.find(m => (m.from || '').includes('compression'))
    expect(compressionModule).toBeTruthy()
    expect(compressionModule?.from).toBe('nuxt-feathers-zod/server/modules/express/compression')
    expect(compressionModule?.meta.import).toContain('nuxt-feathers-zod/server/modules/express/compression')
    expect(compressionModule?.from).not.toContain('server/server/modules')
    expect(compressionModule?.from).not.toContain('src/runtime/server/modules')
  })


  it('renders consumer-safe built-in server module imports in the generated server plugin', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-consumer-plugin-'))
    const servicesDir = join(root, 'services')
    await mkdir(servicesDir, { recursive: true })

    const server = await resolveServerOptions({
      secureDefaults: true,
      secure: { compression: true, cors: true, helmet: true, bodyParser: { json: true, urlencoded: true } },
    } as any, root, root, 'express')

    const code = await getServerPluginContents({
      servicesDirs: [servicesDir],
      server,
      transports: { rest: { framework: 'express', path: '/feathers' }, websocket: false },
      database: {},
      auth: false,
      keycloak: false,
      loadFeathersConfig: false,
      swagger: false,
    } as any)()

    expect(code).toContain('nuxt-feathers-zod/server/modules/express/compression')
    expect(code).not.toContain('server/server/modules')
    expect(code).not.toContain('src/runtime/server/modules')
  })

  it('runs help without explicit cli options', async () => {
    await runCli(['--help'])
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
  it('generates a file-service scaffold with manifest and service files', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateFileService({
      projectRoot: root,
      servicesDir,
      name: 'assets',
      auth: true,
      servicePath: 'api/v1/assets',
      storageDir: 'storage/assets',
      docs: true,
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'assets')
    const schemaFile = join(base, 'assets.schema.ts')
    const classFile = join(base, 'assets.class.ts')
    const sharedFile = join(base, 'assets.shared.ts')
    const svcFile = join(base, 'assets.ts')
    const manifestFile = join(servicesDir, '.nfz', 'manifest.json')

    expect(existsSync(schemaFile)).toBe(true)
    expect(existsSync(classFile)).toBe(true)
    expect(existsSync(sharedFile)).toBe(true)
    expect(existsSync(svcFile)).toBe(true)
    expect(existsSync(manifestFile)).toBe(true)

    const klass = await readFile(classFile, 'utf8')
    expect(klass).toContain("return join(root, `\${id}.bin`)")
    expect(klass).toContain("return join(root, `\${id}.json`)")
    expect(klass).toContain("const configured = this.app.get('assetStorageDir') || this.app.get('nfzFileStorageDir') || 'storage/assets'")

    const shared = await readFile(sharedFile, 'utf8')
    expect(shared).toContain("export const assetPath = 'api/v1/assets'")
    expect(shared).toContain("upload(data: AssetUploadData")
    expect(shared).toContain("download(data: AssetDownloadData")

    const svc = await readFile(svcFile, 'utf8')
    expect(svc).toContain("authenticate('jwt')")
    expect(svc).toContain("methods: assetMethods as unknown as string[]")

    const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as { services?: Array<any> }
    const entry = manifest.services?.find(service => service.name === 'assets')
    expect(entry).toMatchObject({
      name: 'assets',
      path: 'api/v1/assets',
      adapter: 'memory',
      auth: true,
      custom: true,
      customMethods: ['upload', 'download'],
    })
  })

  it('emits TypeScript-syntax-valid files for the generated file-service scaffold', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateFileService({
      projectRoot: root,
      servicesDir,
      name: 'attachments',
      auth: false,
      servicePath: 'attachments',
      storageDir: 'storage/attachments',
      docs: false,
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'attachments')
    await expectGeneratedTsSyntaxOk([
      join(base, 'attachments.schema.ts'),
      join(base, 'attachments.class.ts'),
      join(base, 'attachments.shared.ts'),
      join(base, 'attachments.ts'),
    ])
  })

  it('dispatches add file-service through the CLI entrypoint', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), "export default defineNuxtConfig({})\n")

    await runCli([
      'add',
      'file-service',
      'media',
      '--path', 'api/v1/media',
      '--storageDir', 'storage/media',
      '--auth', 'true',
      '--docs', 'true',
    ], { cwd: root, throwOnError: true })

    const base = join(root, 'services', 'media')
    expect(existsSync(join(base, 'media.schema.ts'))).toBe(true)
    expect(existsSync(join(base, 'media.class.ts'))).toBe(true)
    expect(existsSync(join(base, 'media.shared.ts'))).toBe(true)
    expect(existsSync(join(base, 'media.ts'))).toBe(true)

    const service = await readFile(join(base, 'media.ts'), 'utf8')
    expect(service).toContain("authenticate('jwt')")
    expect(service).toContain("description: 'media local file upload/download service'")

    await expectGeneratedTsSyntaxOk([
      join(base, 'media.schema.ts'),
      join(base, 'media.class.ts'),
      join(base, 'media.shared.ts'),
      join(base, 'media.ts'),
    ])
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
  it('generates a Nuxt route middleware for Keycloak', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await generateMiddleware({
      projectRoot: root,
      name: 'auth-keycloak',
      target: 'route',
      dry: false,
      force: false,
    })
    const file = join(root, 'app', 'middleware', 'auth-keycloak.ts')
    const silent = join(root, 'public', 'silent-check-sso.html')
    expect(existsSync(file)).toBe(true)
    expect(existsSync(silent)).toBe(true)
    const txt = await readFile(file, 'utf8')
    expect(txt).toContain('defineNuxtRouteMiddleware')
    expect(txt).toContain("auth.provider.value === 'keycloak'")
    expect(txt).toContain('redirectUri: window.location.origin + to.fullPath')
  })
  it('dispatches add route middleware through the citty CLI entrypoint', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await runCli(['add', 'middleware', 'auth-keycloak', '--target', 'route'], { cwd: root })
    expect(existsSync(join(root, 'app', 'middleware', 'auth-keycloak.ts'))).toBe(true)
    expect(existsSync(join(root, 'public', 'silent-check-sso.html'))).toBe(true)
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
  
  it('patches remote init + keycloak auth + remote-service without corrupting nuxt.config', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), "export default defineNuxtConfig({})\n")
    await runCli([
      'init',
      'remote',
      '--url', 'https://svrapi.agglo.local',
      '--transport', 'auto',
      '--auth', 'true',
      '--payloadMode', 'keycloak',
    ], { cwd: root, throwOnError: true })
    await runCli([
      'remote',
      'auth',
      'keycloak',
      '--ssoUrl', 'https://svrkeycloak.agglo.local:8443',
      '--realm', 'CACEM',
      '--clientId', 'nuxt4app',
    ], { cwd: root, throwOnError: true })
    await runCli([
      'add',
      'remote-service',
      'users',
      '--path', 'users',
      '--methods', 'find,get',
    ], { cwd: root, throwOnError: true })
    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("transport: 'auto'")
    expect(config).toContain("rest: { path: '/feathers' }")
    expect(config).toContain("websocket: { path: '/socket.io' }")
    expect(config).toContain("serverUrl: 'https://svrkeycloak.agglo.local:8443'")
    expect(config).toContain("realm: 'CACEM'")
    expect(config).toContain("clientId: 'nuxt4app'")
    expect(config).toContain(`services: [{ path: 'users', methods: ["find","get"] }]`)
    expect(config).not.toContain('rest: rest:')
    expect(config).not.toContain('websocket: websocket:')
    expect(config).not.toContain('auth: false')
  })

  it('patches a prefilled feathers block without duplicating config or nested properties', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), `export default defineNuxtConfig({
  feathers: {
    swagger: false,
    servicesDirs: ['services']
  }
})
`)

    await runCli(['init', 'remote', '--url', 'https://svrapi.agglo.local', '--transport', 'auto', '--auth', 'true', '--payloadMode', 'keycloak'], { cwd: root, throwOnError: true })
    await runCli(['remote', 'auth', 'keycloak', '--ssoUrl', 'https://svrkeycloak.agglo.local:8443', '--realm', 'CACEM', '--clientId', 'nuxt4app'], { cwd: root, throwOnError: true })
    await runCli(['add', 'remote-service', 'users', '--path', 'users', '--methods', 'find,get'], { cwd: root, throwOnError: true })

    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect((config.match(/export default defineNuxtConfig/g) ?? []).length).toBe(1)
    expect(config).not.toContain('keycloak: keycloak:')
    expect(config).not.toContain('rest: rest:')
    expect(config).not.toContain('websocket: websocket:')
    expect(config).not.toContain('client: client:')
    expect(config).toContain(`services: [{ path: 'users', methods: ["find","get"] }]`)
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

  it('keeps remote/keycloak/service patching idempotent across repeated CLI runs', { timeout: LONG_TIMEOUT }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), `export default defineNuxtConfig({
  feathers: { templates: { dirs: ['custom/templates'] } }
})
`)

    const remoteInit = [
      'init', 'remote',
      '--url', 'https://svrapi.agglo.local',
      '--transport', 'auto',
      '--auth', 'true',
      '--payloadMode', 'keycloak',
    ]
    const keycloak = [
      'remote', 'auth', 'keycloak',
      '--ssoUrl', 'https://svrkeycloak.agglo.local:8443',
      '--realm', 'CACEM',
      '--clientId', 'nuxt4app',
    ]
    const remoteService = [
      'add', 'remote-service', 'users',
      '--path', 'users',
      '--methods', 'find,get',
    ]

    await runCli(remoteInit, { cwd: root, throwOnError: true })
    await runCli(keycloak, { cwd: root, throwOnError: true })
    await runCli(remoteService, { cwd: root, throwOnError: true })
    await runCli(remoteInit, { cwd: root, throwOnError: true })
    await runCli(keycloak, { cwd: root, throwOnError: true })
    await runCli(remoteService, { cwd: root, throwOnError: true })

    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("templates: { dirs: ['custom/templates'] }")
    expect(config).toContain("serverUrl: 'https://svrkeycloak.agglo.local:8443'")
    expect(config).toContain("realm: 'CACEM'")
    expect(config).toContain("clientId: 'nuxt4app'")
    expect(config).toContain("rest: { path: '/feathers' }")
    expect(config).toContain("websocket: { path: '/socket.io' }")
    expect(config).toContain(`services: [{ path: 'users', methods: ["find","get"] }]`)
    expect(config).not.toContain('keycloak: keycloak:')
    expect(config).not.toContain('rest: rest:')
    expect(config).not.toContain('websocket: websocket:')
    expect(config).not.toContain('client: client:')
    expect((config.match(/path: 'users'/g) ?? []).length).toBe(1)
    expect((config.match(/export default defineNuxtConfig/g) ?? []).length).toBe(1)
  })

  it('keeps config patching idempotent for embedded and mongo management commands', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    await writeFile(join(root, 'nuxt.config.ts'), 'export default defineNuxtConfig({})\n')

    await runCli(['init', 'embedded', '--servicesDir', 'services', '--auth', '--swagger'], { cwd: root, throwOnError: true })
    await runCli(['init', 'embedded', '--servicesDir', 'services', '--auth', '--swagger'], { cwd: root, throwOnError: true })
    await runCli(['mongo', 'management', '--url', 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin', '--auth', 'false'], { cwd: root, throwOnError: true })
    await runCli(['mongo', 'management', '--url', 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin', '--auth', 'false'], { cwd: root, throwOnError: true })

    const config = await readFile(join(root, 'nuxt.config.ts'), 'utf8')
    expect((config.match(/servicesDirs:/g) ?? []).length).toBe(1)
    expect((config.match(/swagger:/g) ?? []).length).toBe(1)
    expect((config.match(/database:/g) ?? []).length).toBe(1)
    expect(config).not.toContain('servicesDirs: servicesDirs:')
    expect(config).not.toContain('database: database:')
  })

})


it('uses exact-match aliases so server subpath exports are not rewritten to .nuxt local paths', async () => {
  const source = await readFile(join(process.cwd(), 'src/module.ts'), 'utf8')
  expect(source).toContain("'nuxt-feathers-zod/server$'")
  expect(source).toContain("'nuxt-feathers-zod/client$'")
})
