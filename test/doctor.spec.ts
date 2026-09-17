import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import consola from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runDoctor } from '../src/cli/commands/doctor'

describe('nfz doctor mongo management diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports mongo management routes and redacts credentials', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-'))
    await mkdir(join(root, 'services', 'messages'), { recursive: true })
    await writeFile(join(root, 'services', 'messages', 'messages.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: { rest: { path: '/feathers' } },
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: false,
          basePath: '///ops///mongo///',
          exposeUsersService: true,
        },
      },
    },
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- database.mongo.url: mongodb://root:***@127.0.0.1:27017/app?authSource=admin'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.enabled: true'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.auth: false'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.basePath: /ops/mongo'))).toBe(true)
    expect(infos.some(line => line.includes('/ops/mongo/databases'))).toBe(true)
    expect(infos.some(line => line.includes('/ops/mongo/users'))).toBe(true)
    expect(warns).toEqual([])
  })

  it('reports named database providers without exposing connection secrets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-database-registry-'))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    database: {
      default: 'reporting',
      connections: {
        archive: {
          type: 'mongodb',
          url: 'mongodb://archive:super-secret@127.0.0.1/archive',
          management: { enabled: false },
        },
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://reporter:super-secret@127.0.0.1/reporting',
        },
        commerce: {
          type: 'mysql',
          connection: 'mysql://commerce:super-secret@127.0.0.1/commerce',
        },
        legacy: {
          type: 'mariadb',
          connection: 'mysql://legacy:super-secret@127.0.0.1/legacy',
        },
        localCache: {
          type: 'sqlite',
          connection: { filename: './data/local-cache.sqlite' },
        },
        enterprise: {
          type: 'mssql',
          connection: {
            server: '127.0.0.1',
            user: 'sa',
            password: 'super-secret',
            database: 'enterprise',
            options: { encrypt: true, trustServerCertificate: true },
          },
        },
      },
    },
  },
})
`)

    const infos: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation(() => {})

    await runDoctor(root)

    expect(infos.some(line => line.includes('- database.supportedEngines: mongodb, postgresql, mysql, mariadb, sqlite, mssql'))).toBe(true)
    expect(infos.some(line => line.includes('- database.certifiedEngines: 6/6'))).toBe(true)
    expect(infos.some(line => line.includes('- database.default: reporting'))).toBe(true)
    expect(infos.some(line => line.includes('- database.connections: 6'))).toBe(true)
    expect(infos.some(line => line.includes('archive: type=mongodb provider=mongodb databaseFamily=document certification=certified enabled=true'))).toBe(true)
    expect(infos.some(line => line.includes('reporting: type=postgresql provider=knex databaseFamily=sql certification=certified driver=pg enabled=true'))).toBe(true)
    expect(
      infos.some(line => line.includes(
        'commerce: type=mysql provider=knex databaseFamily=sql certification=certified driver=mysql2 enabled=true',
      )),
    ).toBe(true)
    expect(
      infos.some(line => line.includes(
        'legacy: type=mariadb provider=knex databaseFamily=sql certification=certified driver=mysql2 enabled=true',
      )),
    ).toBe(true)
    expect(
      infos.some(line => line.includes(
        'localCache: type=sqlite provider=knex databaseFamily=sql certification=certified driver=better-sqlite3 enabled=true',
      )),
    ).toBe(true)
    expect(
      infos.some(line => line.includes(
        'enterprise: type=mssql provider=knex databaseFamily=sql certification=certified driver=tedious enabled=true',
      )),
    ).toBe(true)
    expect(infos.join('\n')).not.toContain('super-secret')
    expect(infos.join('\n')).not.toContain('postgresql://')
    expect(infos.join('\n')).not.toContain('mysql://')
  })

  it('diagnoses generated service database bindings against named connection types', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-service-bindings-'))
    await mkdir(join(root, 'services', 'audit-events'), { recursive: true })
    await mkdir(join(root, 'services', '.nfz', 'services'), { recursive: true })
    await writeFile(join(root, 'services', 'audit-events', 'audit-events.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'services', '.nfz', 'services', 'audit-events.json'), JSON.stringify({
      name: 'audit-events',
      path: 'audit-events',
      adapter: 'knex',
      connectionName: 'reporting',
      databaseType: 'postgresql',
      databaseProvider: 'knex',
      databaseFamily: 'sql',
      idStrategy: 'uuid',
      auth: false,
      schema: { mode: 'zod', fields: {} },
    }))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    database: {
      default: 'reporting',
      connections: {
        reporting: {
          type: 'mysql',
          connection: 'mysql://user:super-secret@127.0.0.1/reporting',
        },
      },
    },
  },
})
`)

    const infos: string[] = []
    const errors: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation(() => {})
    vi.spyOn(consola, 'error').mockImplementation((msg?: any) => { errors.push(String(msg ?? '')) })

    const result = await runDoctor(root)

    expect(result.ok).toBe(false)
    expect(infos.some(line => line.includes('audit-events: adapter=knex connection=reporting databaseType=postgresql provider=knex databaseFamily=sql idStrategy=uuid'))).toBe(true)
    expect(errors.some(line => line.includes("declares databaseType 'postgresql' but connection 'reporting' is configured as 'mysql'"))).toBe(true)
    expect(infos.join('\n')).not.toContain('super-secret')
  })

  it('rejects an identifier strategy that is incompatible with the generated adapter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-id-strategy-'))
    await mkdir(join(root, 'services', 'audit-events'), { recursive: true })
    await mkdir(join(root, 'services', '.nfz', 'services'), { recursive: true })
    await writeFile(join(root, 'services', 'audit-events', 'audit-events.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'services', '.nfz', 'services', 'audit-events.json'), JSON.stringify({
      name: 'audit-events',
      path: 'audit-events',
      adapter: 'knex',
      connectionName: 'reporting',
      databaseType: 'postgresql',
      databaseProvider: 'knex',
      databaseFamily: 'sql',
      idStrategy: 'objectid',
      auth: false,
      schema: { mode: 'zod', fields: {} },
    }))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    database: {
      default: 'reporting',
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://user:secret@127.0.0.1/reporting',
        },
      },
    },
  },
})
`)

    const errors: string[] = []
    vi.spyOn(consola, 'info').mockImplementation(() => {})
    vi.spyOn(consola, 'warn').mockImplementation(() => {})
    vi.spyOn(consola, 'error').mockImplementation((msg?: any) => { errors.push(String(msg ?? '')) })

    const result = await runDoctor(root)

    expect(result.ok).toBe(false)
    expect(errors.some(line => line.includes("declares idStrategy 'objectid' which is not supported by adapter 'knex'"))).toBe(true)
  })

  it('reports embedded local auth defaults and payload shape', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-auth-defaults-'))
    await mkdir(join(root, 'services', 'users'), { recursive: true })
    await writeFile(join(root, 'services', 'users', 'users.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- auth.enabled: true'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.source: default'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.authStrategies: local, jwt'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.usernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityUsernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes("- auth.local.payload.example: { strategy: 'local', userId: '<value>', password: '<value>' }"))).toBe(true)
    expect(warns).toEqual([])
  })

  it('warns when local auth request/entity fields diverge', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-auth-mapping-'))
    await mkdir(join(root, 'services', 'users'), { recursive: true })
    await writeFile(join(root, 'services', 'users', 'users.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    auth: {
      authStrategies: ['local', 'jwt'],
      service: 'users',
      entity: 'user',
      local: {
        usernameField: 'userId',
        passwordField: 'password',
        entityUsernameField: 'userId',
        entityPasswordField: 'passwordHash',
      },
    },
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- auth.local.usernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityUsernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityPasswordField: passwordHash'))).toBe(true)
    expect(warns.some(line => line.includes('Local auth request/entity field mapping differs.'))).toBe(true)
  })

  it('warns when mongo management is enabled without a mongo url', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-'))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    database: {
      mongo: {
        management: {
          enabled: true,
        },
      },
    },
  },
})
`)

    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation(() => {})
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(warns.some(line => line.includes('Mongo management is enabled but database.mongo.url is missing.'))).toBe(true)
  })
})

describe('nfz doctor embedded architecture diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports deterministic service sources and accepts the standard services phase', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-services-'))
    await mkdir(join(root, 'services', 'messages'), { recursive: true })
    await writeFile(join(root, 'services', 'messages', 'messages.ts'), 'export default () => undefined\n')
    await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: { zod: '3.25.76' } }))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    servicesDirs: ['services'],
    server: { loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'] },
  },
})
`)
    const infos: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation(() => {})
    vi.spyOn(consola, 'error').mockImplementation(() => {})

    const result = await runDoctor(root)

    expect(result.ok).toBe(true)
    expect(infos.some(line => line.includes('- services discovered: 1'))).toBe(true)
    expect(infos.some(line => line.includes('service messages: services/messages/messages.ts'))).toBe(true)
  })

  it('fails when discovered services are removed from loadOrder and manually aggregated', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-duplicate-architecture-'))
    await mkdir(join(root, 'services', 'application-catalog'), { recursive: true })
    await mkdir(join(root, 'server', 'feathers', 'plugins'), { recursive: true })
    await writeFile(join(root, 'services', 'application-catalog', 'application-catalog.ts'), 'export default () => undefined\n')
    await writeFile(join(root, 'server', 'feathers', 'plugins', 'traefik-services.ts'), "import catalog from '../../../services/application-catalog/application-catalog'\nexport default catalog\n")
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    servicesDirs: ['services'],
    server: { loadOrder: ['modules:pre', 'plugins', 'modules:post'] },
  },
})
`)
    vi.spyOn(consola, 'info').mockImplementation(() => {})
    vi.spyOn(consola, 'warn').mockImplementation(() => {})
    vi.spyOn(consola, 'error').mockImplementation(() => {})

    const result = await runDoctor(root)

    expect(result.ok).toBe(false)
    expect(result.errors.some(line => line.includes('loadOrder omits the services phase'))).toBe(true)
    expect(result.errors.some(line => line.includes('manually imported by server/feathers/plugins/traefik-services.ts'))).toBe(true)
  })

  it('fails on an explicitly incompatible Zod 4 application boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-zod4-'))
    await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: { zod: '^4.0.0' } }))
    await writeFile(join(root, 'nuxt.config.ts'), `export default defineNuxtConfig({ modules: ['nuxt-feathers-zod'] })\n`)
    vi.spyOn(consola, 'info').mockImplementation(() => {})
    vi.spyOn(consola, 'warn').mockImplementation(() => {})
    vi.spyOn(consola, 'error').mockImplementation(() => {})

    const result = await runDoctor(root)

    expect(result.ok).toBe(false)
    expect(result.errors.some(line => line.includes('requires Zod 3'))).toBe(true)
  })
})
