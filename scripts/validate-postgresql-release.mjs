#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { recordArtifactValidation, resolveReleaseArtifact } from './lib/release-artifact.mjs'
import { createExactReleaseConsumerPackage, installExactReleaseConsumer } from './lib/release-consumer-install.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifact = resolveReleaseArtifact(root, { allowFinal: false })
if (artifact.state !== 'candidate')
  throw new Error('PostgreSQL certification requires the current immutable release candidate.')
const candidate = artifact.tarballPath
const externalUrl = String(process.env.NFZ_POSTGRESQL_CERTIFICATION_URL || '').trim()
const dockerImage = String(process.env.NFZ_POSTGRESQL_DOCKER_IMAGE || 'postgres:18-alpine').trim()
const PG_PACKAGE_VERSION = '8.23.0'
const FEATHERS_VERSION = '5.0.49'
const KNEX_VERSION = '3.2.10'
const HARNESS_TIMEOUT_MS = 3 * 60 * 1000
const DOCKER_READY_TIMEOUT_MS = 90 * 1000

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: options.env || process.env,
    stdio: options.stdio || 'pipe',
    timeout: options.timeout,
    shell: options.shell || false,
  })

  if (result.error)
    throw result.error
  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim()
    const stdout = String(result.stdout || '').trim()
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}\n`
      + [stdout, stderr].filter(Boolean).join('\n'),
    )
  }
  return result
}

function dockerAvailable() {
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
    timeout: 20_000,
  })
  return !result.error && result.status === 0 && String(result.stdout || '').trim() !== ''
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms))
}

function parseDockerPort(output) {
  const line = String(output || '').trim().split(/\r?\n/).find(Boolean) || ''
  const match = /:(\d+)$/.exec(line)
  if (!match)
    throw new Error(`Unable to determine PostgreSQL Docker port from: ${line || '[empty]'}`)
  return Number(match[1])
}

async function provisionDockerPostgres() {
  if (!dockerAvailable()) {
    throw new Error(
      'PostgreSQL certification requires Docker Desktop/Engine or NFZ_POSTGRESQL_CERTIFICATION_URL. '
      + 'Docker is unavailable and no external certification URL was provided.',
    )
  }

  const suffix = randomBytes(5).toString('hex')
  const name = `nfz-postgresql-cert-${process.pid}-${suffix}`
  const user = 'nfz_cert'
  const database = 'nfz_cert'
  const password = `nfz_${randomBytes(18).toString('base64url')}`

  console.log(`[postgresql-cert] Starting isolated ${dockerImage} container.`)
  run('docker', [
    'run', '--detach', '--rm',
    '--name', name,
    '--env', `POSTGRES_USER=${user}`,
    '--env', `POSTGRES_PASSWORD=${password}`,
    '--env', `POSTGRES_DB=${database}`,
    '--publish', '127.0.0.1::5432',
    dockerImage,
  ], { timeout: 120_000 })

  try {
    const startedAt = Date.now()
    let ready = false
    while (Date.now() - startedAt < DOCKER_READY_TIMEOUT_MS) {
      const probe = spawnSync('docker', [
        'exec', name,
        'pg_isready', '--username', user, '--dbname', database,
      ], { encoding: 'utf8', timeout: 10_000 })
      if (!probe.error && probe.status === 0) {
        ready = true
        break
      }
      await sleep(1_000)
    }
    if (!ready)
      throw new Error(`PostgreSQL container ${name} did not become ready within ${DOCKER_READY_TIMEOUT_MS} ms.`)

    const portResult = run('docker', ['port', name, '5432/tcp'], { timeout: 20_000 })
    const port = parseDockerPort(portResult.stdout)
    const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`

    return {
      url,
      source: `docker:${dockerImage}`,
      async stop() {
        const stopped = spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
        if (stopped.error)
          throw stopped.error
        if (stopped.status !== 0 && !String(stopped.stderr || '').includes('No such container')) {
          throw new Error(
            `Unable to remove PostgreSQL certification container ${name}: ${String(stopped.stderr || '').trim()}`,
          )
        }
      },
    }
  }
  catch (error) {
    spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
    throw error
  }
}

const harnessSource = String.raw`
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { feathers } from '@feathersjs/feathers'
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { KnexService } from '@feathersjs/knex'
import { koa } from '@feathersjs/koa'
import { z } from 'zod'
import {
  checkNfzDatabaseConnection,
  createNfzDatabaseRegistry,
  getNfzKnexClient,
  withNfzSqlTransaction,
} from 'nuxt-feathers-zod/server-database'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'

const databaseUrl = process.env.NFZ_POSTGRESQL_CERTIFICATION_URL
const schema = process.env.NFZ_POSTGRESQL_CERTIFICATION_SCHEMA
assert.ok(databaseUrl, 'NFZ_POSTGRESQL_CERTIFICATION_URL is required')
assert.match(schema, /^nfz_cert_[a-z0-9_]+$/)

const capabilities = {
  healthCheck: true,
  namedConnections: true,
  transactions: true,
  schemaNamespaces: true,
  indexManagement: false,
  migrations: false,
  nativeObjectId: false,
}

const registry = createNfzDatabaseRegistry({
  default: 'reporting',
  connections: {
    reporting: {
      name: 'reporting',
      type: 'postgresql',
      provider: 'knex',
      databaseFamily: 'sql',
      adapter: 'knex',
      certification: 'certified',
      capabilities,
      enabled: true,
      required: true,
      healthCheck: true,
      legacy: false,
      client: 'pg',
      defaultClient: 'pg',
      driverPackage: 'pg',
      customClient: false,
      connection: databaseUrl,
      pool: { min: 0, max: 4 },
      acquireConnectionTimeout: 60_000,
      searchPath: [schema],
    },
  },
})

await registry.connectAll()
const app = koa(feathers())
app.set('databaseRegistry', registry)
const sql = getNfzKnexClient(app, 'reporting')
let schemaCreated = false

try {
  const health = await checkNfzDatabaseConnection(app, 'reporting')
  assert.equal(health.type, 'postgresql')
  assert.equal(health.provider, 'knex')
  assert.equal(health.certification, 'certified')
  assert.equal(health.connected, true)
  assert.equal(health.capabilities.transactions, true)
  assert.equal(health.capabilities.schemaNamespaces, true)

  await sql.raw('CREATE SCHEMA ??', [schema])
  schemaCreated = true

  await sql.schema.withSchema(schema).createTable('audit_events', (table) => {
    table.increments('id').primary()
    table.string('category', 80).notNullable()
    table.integer('severity').notNullable()
    table.string('message', 255).notNullable()
  })
  await sql.schema.withSchema(schema).createTable('users', (table) => {
    table.uuid('id').primary()
    table.string('email', 160).notNullable().unique()
    table.string('password', 255).notNullable()
  })
  await sql.schema.withSchema(schema).alterTable('audit_events', (table) => {
    table.index(['category', 'severity'], 'audit_events_category_severity_idx')
  })

  const indexRows = await sql('pg_indexes')
    .select('indexname')
    .where({ schemaname: schema, tablename: 'audit_events' })
  assert.ok(indexRows.some(row => row.indexname === 'audit_events_category_severity_idx'))

  class AuditService extends KnexService {}
  class UserService extends KnexService {}

  app.use('audit-events', new AuditService({
    Model: sql,
    name: 'audit_events',
    schema,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))
  app.use('users', new UserService({
    Model: sql,
    name: 'users',
    schema,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))

  app.set('authentication', {
    secret: 'nfz-postgresql-certification-secret-0123456789abcdef0123456789abcdef',
    entity: 'user',
    service: 'users',
    authStrategies: ['jwt', 'local'],
    jwtOptions: {
      header: { typ: 'access' },
      audience: 'https://nuxt-feathers-zod.local/postgresql-certification',
      issuer: 'nuxt-feathers-zod',
      algorithm: 'HS256',
      expiresIn: '10m',
    },
    local: {
      usernameField: 'email',
      passwordField: 'password',
    },
  })
  const authService = new AuthenticationService(app)
  const localStrategy = new LocalStrategy()
  authService.register('jwt', new JWTStrategy())
  authService.register('local', localStrategy)
  app.use('authentication', authService)
  await app.setup()

  const audit = app.service('audit-events')
  const first = await audit.create({ category: 'security', severity: 4, message: 'created' })
  const second = await audit.create({ category: 'security', severity: 8, message: 'updated' })
  const third = await audit.create({ category: 'ops', severity: 2, message: 'ignored' })
  assert.equal(typeof first.id, 'number')
  assert.equal((await audit.get(second.id)).message, 'updated')

  const querySchema = zodQuerySyntax(z.object({
    id: z.number().int(),
    category: z.string(),
    severity: z.number().int(),
    message: z.string(),
  }))
  const parsedQuery = querySchema.parse({
    severity: { $gte: '4', $in: ['4', '8'] },
    $sort: { severity: '-1' },
    $limit: '2',
  })
  const page = await audit.find({ query: parsedQuery })
  assert.equal(page.total, 2)
  assert.deepEqual(page.data.map(row => row.severity), [8, 4])

  const patched = await audit.patch(first.id, { message: 'patched' })
  assert.equal(patched.message, 'patched')

  const beforeRollback = await audit.find({ paginate: false })
  let rollbackObserved = false
  try {
    await withNfzSqlTransaction(app, async (transaction) => {
      await transaction.withSchema(schema).table('audit_events').insert({
        category: 'transaction', severity: 10, message: 'rollback',
      })
      throw new Error('nfz-postgresql-certification-rollback')
    }, { connection: 'reporting' })
  }
  catch (error) {
    assert.equal(error.message, 'nfz-postgresql-certification-rollback')
    rollbackObserved = true
  }
  assert.equal(rollbackObserved, true)
  const afterRollback = await audit.find({ paginate: false })
  assert.equal(afterRollback.length, beforeRollback.length)

  const email = 'postgresql-' + randomUUID() + '@nfz.invalid'
  const plainPassword = 'NFZ-postgresql-certification-123!'
  const userId = randomUUID()
  const hashedPassword = await localStrategy.hashPassword(plainPassword)
  await app.service('users').create({ id: userId, email, password: hashedPassword })

  const localResult = await app.service('authentication').create({
    strategy: 'local', email, password: plainPassword,
  })
  assert.equal(localResult.user.id, userId)
  assert.equal(typeof localResult.accessToken, 'string')

  const jwtResult = await app.service('authentication').create({
    strategy: 'jwt', accessToken: localResult.accessToken,
  })
  assert.equal(jwtResult.user.id, userId)

  await audit.remove(third.id)
  await audit.remove(second.id)
  await audit.remove(first.id)
  await app.service('users').remove(userId)

  console.log(
    '[postgresql-cert] CRUD, numeric query coercion, pagination/sort, UUID auth, JWT re-read, '
    + 'index/schema and transaction rollback passed.',
  )
}
finally {
  let teardownError
  if (schemaCreated) {
    try {
      await sql.raw('DROP SCHEMA ?? CASCADE', [schema])
    }
    catch (error) {
      teardownError = error
    }
  }
  await registry.closeAll()
  const closed = registry.diagnostics().find(item => item.name === 'reporting')
  assert.equal(closed?.state, 'closed')
  if (teardownError)
    throw teardownError
}
`

let runtime
let workspace
try {
  runtime = externalUrl
    ? { url: externalUrl, source: 'external', async stop() {} }
    : await provisionDockerPostgres()

  workspace = await mkdtemp(resolve(tmpdir(), 'nfz-postgresql-cert-'))
  const packagePath = candidate.replaceAll('\\', '/')
  const consumerPackage = createExactReleaseConsumerPackage({
    root,
    name: 'nfz-postgresql-certification-consumer',
    profile: 'database',
    dependencies: {
      '@feathersjs/authentication': FEATHERS_VERSION,
      '@feathersjs/authentication-local': FEATHERS_VERSION,
      '@feathersjs/feathers': FEATHERS_VERSION,
      '@feathersjs/knex': FEATHERS_VERSION,
      '@feathersjs/koa': FEATHERS_VERSION,
      knex: KNEX_VERSION,
      'nuxt-feathers-zod': `file:${packagePath}`,
      pg: PG_PACKAGE_VERSION,
      zod: '3.25.76',
    },
  })

  await writeFile(resolve(workspace, 'package.json'), `${JSON.stringify(consumerPackage, null, 2)}\n`)
  await writeFile(resolve(workspace, 'postgresql-certification.mjs'), harnessSource)

  console.log(`[postgresql-cert] Installing exact certification consumer for ${basename(candidate)}.`)
  installExactReleaseConsumer({ cwd: workspace, label: 'postgresql-cert' })

  const schema = `nfz_cert_${Date.now()}_${randomBytes(4).toString('hex')}`
  console.log(`[postgresql-cert] Running exact candidate against ${runtime.source}; isolated schema=${schema}.`)
  run(process.execPath, ['postgresql-certification.mjs'], {
    cwd: workspace,
    timeout: HARNESS_TIMEOUT_MS,
    stdio: 'inherit',
    env: {
      ...process.env,
      NFZ_POSTGRESQL_CERTIFICATION_URL: runtime.url,
      NFZ_POSTGRESQL_CERTIFICATION_SCHEMA: schema,
    },
  })
}
finally {
  if (workspace) {
    await rm(workspace, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  }
  await runtime?.stop?.()
}

recordArtifactValidation(root, 'postgresql', artifact, {
  engine: 'postgresql',
  source: runtime.source,
})
console.log('[postgresql-cert] Exact release candidate PostgreSQL certification passed.')
