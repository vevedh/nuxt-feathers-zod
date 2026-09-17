#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { recordArtifactValidation, resolveReleaseArtifact } from './lib/release-artifact.mjs'
import { createExactReleaseConsumerPackage, installExactReleaseConsumer } from './lib/release-consumer-install.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifact = resolveReleaseArtifact(root, { allowFinal: false })
if (artifact.state !== 'candidate')
  throw new Error('SQLite certification requires the current immutable release candidate.')

const candidate = artifact.tarballPath
const FEATHERS_VERSION = '5.0.49'
const KNEX_VERSION = '3.2.10'
const BETTER_SQLITE3_VERSION = '12.11.1'
const ZOD_VERSION = '3.25.76'
const REBUILD_TIMEOUT_MS = 5 * 60 * 1000
const HARNESS_TIMEOUT_MS = 3 * 60 * 1000

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

const databaseFile = process.env.NFZ_SQLITE_CERTIFICATION_FILE
assert.ok(databaseFile, 'NFZ_SQLITE_CERTIFICATION_FILE is required')
assert.match(databaseFile.replaceAll('\\', '/'), /\/nfz-certification\.sqlite$/)

const capabilities = {
  healthCheck: true,
  namedConnections: true,
  transactions: true,
  schemaNamespaces: false,
  indexManagement: false,
  migrations: false,
  nativeObjectId: false,
}

function createRegistry() {
  return createNfzDatabaseRegistry({
    default: 'local',
    connections: {
      local: {
        name: 'local',
        type: 'sqlite',
        provider: 'knex',
        databaseFamily: 'sql',
        adapter: 'knex',
        certification: 'certified',
        capabilities,
        enabled: true,
        required: true,
        healthCheck: true,
        legacy: false,
        client: 'better-sqlite3',
        defaultClient: 'better-sqlite3',
        driverPackage: 'better-sqlite3',
        customClient: false,
        connection: { filename: databaseFile },
        pool: { min: 0, max: 1 },
        acquireConnectionTimeout: 60_000,
        useNullAsDefault: true,
      },
    },
  })
}

const registry = createRegistry()
let registryClosed = false
let reopenedRegistry
let reopenedClosed = false

try {
  await registry.connectAll()
  const app = koa(feathers())
  app.set('databaseRegistry', registry)
  const sql = getNfzKnexClient(app, 'local')

  const health = await checkNfzDatabaseConnection(app, 'local')
  assert.equal(health.type, 'sqlite')
  assert.equal(health.provider, 'knex')
  assert.equal(health.certification, 'certified')
  assert.equal(health.connected, true)
  assert.equal(health.capabilities.transactions, true)
  assert.equal(health.capabilities.schemaNamespaces, false)
  assert.equal(health.capabilities.indexManagement, false)
  assert.equal(health.capabilities.migrations, false)

  const versionRows = await sql.select(sql.raw('sqlite_version() AS version'))
  assert.match(String(versionRows?.[0]?.version || ''), /^\d+\.\d+\.\d+/)

  await sql.schema.createTable('audit_events', (table) => {
    table.increments('id').primary()
    table.string('category', 80).notNullable()
    table.integer('severity').notNullable()
    table.string('message', 255).notNullable()
  })
  await sql.schema.createTable('users', (table) => {
    table.string('id', 36).primary()
    table.string('email', 160).notNullable().unique()
    table.string('password', 255).notNullable()
  })
  await sql.schema.alterTable('audit_events', (table) => {
    table.index(['category', 'severity'], 'audit_events_category_severity_idx')
  })

  const indexRows = await sql('sqlite_master')
    .select('name', 'tbl_name')
    .where({ type: 'index', name: 'audit_events_category_severity_idx', tbl_name: 'audit_events' })
  assert.equal(indexRows.length, 1)

  class AuditService extends KnexService {}
  class UserService extends KnexService {}

  app.use('audit-events', new AuditService({
    Model: sql,
    name: 'audit_events',
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))
  app.use('users', new UserService({
    Model: sql,
    name: 'users',
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))

  app.set('authentication', {
    secret: 'nfz-sqlite-certification-secret-0123456789abcdef0123456789abcdef',
    entity: 'user',
    service: 'users',
    authStrategies: ['jwt', 'local'],
    jwtOptions: {
      header: { typ: 'access' },
      audience: 'https://nuxt-feathers-zod.local/sqlite-certification',
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
  const second = await audit.create({ category: 'security', severity: 8, message: 'second' })
  const third = await audit.create({ category: 'security', severity: 6, message: 'third' })
  const removable = await audit.create({ category: 'ops', severity: 2, message: 'remove-me' })
  assert.equal(typeof first.id, 'number')
  assert.equal((await audit.get(second.id)).message, 'second')

  const querySchema = zodQuerySyntax(z.object({
    id: z.number().int(),
    category: z.string(),
    severity: z.number().int(),
    message: z.string(),
  }))

  const idQuery = querySchema.parse({ id: String(first.id), $limit: '1' })
  const idPage = await audit.find({ query: idQuery })
  assert.equal(idPage.total, 1)
  assert.equal(idPage.data[0]?.id, first.id)

  const parsedQuery = querySchema.parse({
    severity: { $in: ['4', '6', '8'] },
    $sort: { severity: '-1' },
    $skip: '1',
    $limit: '2',
  })
  const page = await audit.find({ query: parsedQuery })
  assert.equal(page.total, 3)
  assert.deepEqual(page.data.map(row => row.severity), [6, 4])

  const patched = await audit.patch(first.id, { message: 'persisted-after-reopen' })
  assert.equal(patched.message, 'persisted-after-reopen')
  await audit.remove(removable.id)
  await assert.rejects(() => audit.get(removable.id))

  const beforeRollback = await audit.find({ paginate: false })
  let rollbackObserved = false
  try {
    await withNfzSqlTransaction(app, async (transaction) => {
      await transaction.table('audit_events').insert({
        category: 'transaction', severity: 10, message: 'rollback',
      })
      throw new Error('nfz-sqlite-certification-rollback')
    }, { connection: 'local' })
  }
  catch (error) {
    assert.equal(error.message, 'nfz-sqlite-certification-rollback')
    rollbackObserved = true
  }
  assert.equal(rollbackObserved, true)
  const afterRollback = await audit.find({ paginate: false })
  assert.equal(afterRollback.length, beforeRollback.length)

  const email = 'sqlite-' + randomUUID() + '@nfz.invalid'
  const plainPassword = 'NFZ-sqlite-certification-123!'
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
  await app.service('users').remove(userId)

  await registry.closeAll()
  registryClosed = true
  const closed = registry.diagnostics().find(item => item.name === 'local')
  assert.equal(closed?.state, 'closed')

  reopenedRegistry = createRegistry()
  await reopenedRegistry.connectAll()
  const reopenedApp = koa(feathers())
  reopenedApp.set('databaseRegistry', reopenedRegistry)
  const reopenedSql = getNfzKnexClient(reopenedApp, 'local')
  const persistedRows = await reopenedSql('audit_events')
    .select('id', 'severity', 'message')
    .orderBy('severity', 'desc')
  assert.equal(persistedRows.length, 3)
  assert.ok(persistedRows.some(row => row.id === first.id && row.message === 'persisted-after-reopen'))

  const reopenedIndexRows = await reopenedSql('sqlite_master')
    .select('name')
    .where({ type: 'index', name: 'audit_events_category_severity_idx' })
  assert.equal(reopenedIndexRows.length, 1)

  await reopenedSql.schema.dropTableIfExists('users')
  await reopenedSql.schema.dropTableIfExists('audit_events')
  await reopenedRegistry.closeAll()
  reopenedClosed = true
  const reopenedState = reopenedRegistry.diagnostics().find(item => item.name === 'local')
  assert.equal(reopenedState?.state, 'closed')

  console.log(
    '[sqlite-cert] File-backed SQLite CRUD, integer IDs, numeric query coercion, $in/$sort/$limit/$skip, '
    + 'UUID local/JWT auth, real index DDL, DML rollback, registry teardown and reopen persistence passed.',
  )
}
finally {
  if (reopenedRegistry && !reopenedClosed)
    await reopenedRegistry.closeAll()
  if (!registryClosed)
    await registry.closeAll()
}
`

let workspace
let databaseFile
let successfulCleanup = false
try {
  workspace = await mkdtemp(resolve(tmpdir(), 'nfz-sqlite-cert-'))
  const databaseDir = resolve(workspace, 'database')
  await mkdir(databaseDir, { recursive: false })
  databaseFile = resolve(databaseDir, 'nfz-certification.sqlite')

  const packagePath = candidate.replaceAll('\\', '/')
  const consumerPackage = createExactReleaseConsumerPackage({
    root,
    name: 'nfz-sqlite-certification-consumer',
    profile: 'database',
    dependencies: {
      '@feathersjs/authentication': FEATHERS_VERSION,
      '@feathersjs/authentication-local': FEATHERS_VERSION,
      '@feathersjs/feathers': FEATHERS_VERSION,
      '@feathersjs/knex': FEATHERS_VERSION,
      '@feathersjs/koa': FEATHERS_VERSION,
      'better-sqlite3': BETTER_SQLITE3_VERSION,
      knex: KNEX_VERSION,
      'nuxt-feathers-zod': `file:${packagePath}`,
      zod: ZOD_VERSION,
    },
  })

  await writeFile(resolve(workspace, 'package.json'), `${JSON.stringify(consumerPackage, null, 2)}\n`)
  await writeFile(resolve(workspace, 'sqlite-certification.mjs'), harnessSource)

  console.log(`[sqlite-cert] Installing exact certification consumer for ${basename(candidate)}.`)
  const { npmCommand, npmCliPath } = installExactReleaseConsumer({
    cwd: workspace,
    label: 'sqlite-cert',
  })

  const rebuildArgs = npmCliPath
    ? [npmCliPath, 'rebuild', 'better-sqlite3', '--foreground-scripts']
    : ['rebuild', 'better-sqlite3', '--foreground-scripts']
  run(npmCommand, rebuildArgs, {
    cwd: workspace,
    timeout: REBUILD_TIMEOUT_MS,
    stdio: 'inherit',
    shell: !npmCliPath && process.platform === 'win32',
  })

  console.log(`[sqlite-cert] Running exact candidate against isolated file ${databaseFile}.`)
  run(process.execPath, ['sqlite-certification.mjs'], {
    cwd: workspace,
    timeout: HARNESS_TIMEOUT_MS,
    stdio: 'inherit',
    env: {
      ...process.env,
      NFZ_SQLITE_CERTIFICATION_FILE: databaseFile,
    },
  })

  const databaseStat = await stat(databaseFile)
  if (!databaseStat.isFile() || databaseStat.size <= 0)
    throw new Error('SQLite certification did not produce a non-empty database file.')

  await rm(databaseFile, { force: false })
  if (existsSync(databaseFile))
    throw new Error('SQLite certification file still exists after explicit teardown.')
  await rm(workspace, { recursive: true, force: false, maxRetries: 5, retryDelay: 200 })
  if (existsSync(workspace))
    throw new Error('SQLite certification workspace still exists after explicit teardown.')
  successfulCleanup = true

  recordArtifactValidation(root, 'sqlite', artifact, {
    engine: 'sqlite',
    source: 'isolated-file',
    driver: `better-sqlite3@${BETTER_SQLITE3_VERSION}`,
    persistence: 'close-reopen',
  })
  console.log('[sqlite-cert] Exact release candidate SQLite certification passed.')
}
finally {
  if (workspace && !successfulCleanup) {
    await rm(workspace, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  }
}
