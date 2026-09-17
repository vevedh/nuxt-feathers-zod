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
  throw new Error('MSSQL certification requires the current immutable release candidate.')

const candidate = artifact.tarballPath
const dockerImage = String(
  process.env.NFZ_MSSQL_DOCKER_IMAGE || 'mcr.microsoft.com/mssql/server:2025-CU8-ubuntu-22.04',
).trim()
const externalConnectionJson = String(process.env.NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON || '').trim()
const TEDIOUS_VERSION = '20.0.0'
const FEATHERS_VERSION = '5.0.49'
const KNEX_VERSION = '3.2.10'
const ZOD_VERSION = '3.25.76'
const HARNESS_TIMEOUT_MS = 4 * 60 * 1000
const DOCKER_READY_TIMEOUT_MS = 150 * 1000
const DOCKER_IMAGE_PULL_TIMEOUT_MS = 8 * 60 * 1000

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

function ensureDockerImageAvailable(image) {
  const inspect = spawnSync('docker', ['image', 'inspect', image], {
    encoding: 'utf8',
    timeout: 20_000,
  })
  if (!inspect.error && inspect.status === 0)
    return

  console.log(`[mssql-cert] Pulling pinned SQL Server image ${image}.`)
  try {
    run('docker', ['pull', image], { timeout: DOCKER_IMAGE_PULL_TIMEOUT_MS })
  }
  catch (error) {
    throw new Error(
      `MSSQL certification could not resolve Docker image ${image}. `
      + 'Use an available Microsoft SQL Server 2025 image or override the maintainer pin with '
      + 'NFZ_MSSQL_DOCKER_IMAGE.\n'
      + String(error?.message || error),
      { cause: error },
    )
  }
}

function parseDockerPort(output) {
  const line = String(output || '').trim().split(/\r?\n/).find(Boolean) || ''
  const match = /:(\d+)$/.exec(line)
  if (!match)
    throw new Error(`Unable to determine MSSQL Docker port from: ${line || '[empty]'}`)
  return Number(match[1])
}

function parseExternalConnection() {
  if (!externalConnectionJson)
    return undefined

  let value
  try {
    value = JSON.parse(externalConnectionJson)
  }
  catch (error) {
    throw new Error('NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON must contain valid JSON.', { cause: error })
  }

  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON must contain a connection object.')

  const connection = { ...value }
  const required = ['server', 'user', 'password']
  for (const key of required) {
    if (!String(connection[key] || '').trim())
      throw new Error(`NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON is missing '${key}'.`)
  }
  connection.port = Number(connection.port || 1433)
  if (!Number.isInteger(connection.port) || connection.port < 1 || connection.port > 65535)
    throw new Error('NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON port must be an integer between 1 and 65535.')
  connection.database = String(connection.database || 'master').trim()
  connection.options = {
    encrypt: true,
    trustServerCertificate: false,
    ...(connection.options && typeof connection.options === 'object' ? connection.options : {}),
    lowerCaseGuids: true,
  }
  return connection
}

async function provisionDockerMssql() {
  if (!dockerAvailable()) {
    throw new Error(
      'MSSQL certification requires Docker Desktop/Engine or NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON. '
      + 'Docker is unavailable and no external certification connection was provided.',
    )
  }

  ensureDockerImageAvailable(dockerImage)

  const suffix = randomBytes(5).toString('hex')
  const name = `nfz-mssql-cert-${process.pid}-${suffix}`
  const password = `Nfz!${randomBytes(24).toString('base64url')}9aA`

  console.log(`[mssql-cert] Starting isolated ${dockerImage} container.`)
  run('docker', [
    'run', '--detach', '--rm',
    '--name', name,
    '--env', 'ACCEPT_EULA=Y',
    '--env', 'MSSQL_SA_PASSWORD',
    '--publish', '127.0.0.1::1433',
    dockerImage,
  ], {
    timeout: 180_000,
    env: { ...process.env, MSSQL_SA_PASSWORD: password },
  })

  try {
    const portResult = run('docker', ['port', name, '1433/tcp'], { timeout: 20_000 })
    const port = parseDockerPort(portResult.stdout)
    const startedAt = Date.now()
    let ready = false

    while (Date.now() - startedAt < DOCKER_READY_TIMEOUT_MS) {
      const inspect = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', name], {
        encoding: 'utf8',
        timeout: 10_000,
      })
      if (inspect.error || inspect.status !== 0 || String(inspect.stdout || '').trim() !== 'true') {
        const logs = spawnSync('docker', ['logs', '--tail', '80', name], { encoding: 'utf8', timeout: 20_000 })
        throw new Error(
          `MSSQL certification container exited before becoming ready.\n${String(logs.stdout || logs.stderr || '').trim()}`,
        )
      }

      const logs = spawnSync('docker', ['logs', '--tail', '120', name], { encoding: 'utf8', timeout: 20_000 })
      const text = `${String(logs.stdout || '')}\n${String(logs.stderr || '')}`
      if (/SQL Server is now ready for client connections/i.test(text)) {
        ready = true
        break
      }
      await sleep(1_000)
    }

    if (!ready) {
      const logs = spawnSync('docker', ['logs', '--tail', '120', name], { encoding: 'utf8', timeout: 20_000 })
      throw new Error(
        `MSSQL container ${name} did not become ready within ${DOCKER_READY_TIMEOUT_MS} ms.\n`
        + String(logs.stdout || logs.stderr || '').trim(),
      )
    }

    return {
      connection: {
        server: '127.0.0.1',
        port,
        user: 'sa',
        password,
        database: 'master',
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          lowerCaseGuids: true,
          serverName: 'localhost',
        },
      },
      source: `docker:${dockerImage}`,
      async stop() {
        const stopped = spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
        if (stopped.error)
          throw stopped.error
        if (stopped.status !== 0 && !String(stopped.stderr || '').includes('No such container')) {
          throw new Error(
            `Unable to remove MSSQL certification container ${name}: ${String(stopped.stderr || '').trim()}`,
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

const connection = JSON.parse(process.env.NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON || '{}')
const databaseName = process.env.NFZ_MSSQL_CERTIFICATION_DATABASE
const schemaName = process.env.NFZ_MSSQL_CERTIFICATION_SCHEMA
assert.ok(connection && typeof connection === 'object')
assert.match(databaseName, /^nfz_cert_[a-z0-9_]+$/)
assert.match(schemaName, /^nfz_[a-z0-9_]+$/)

function quoteIdentifier(value) {
  assert.match(value, /^[A-Za-z][A-Za-z0-9_]{0,127}$/)
  return '[' + value.replaceAll(']', ']]') + ']'
}

const capabilities = {
  healthCheck: true,
  namedConnections: true,
  transactions: true,
  schemaNamespaces: true,
  indexManagement: false,
  migrations: false,
  nativeObjectId: false,
}

function resolvedConfig(name, targetDatabase) {
  return {
    name,
    type: 'mssql',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    capabilities,
    enabled: true,
    required: true,
    healthCheck: true,
    legacy: false,
    client: 'mssql',
    defaultClient: 'mssql',
    driverPackage: 'tedious',
    customClient: false,
    connection: { ...connection, database: targetDatabase },
    pool: { min: 0, max: 4 },
    acquireConnectionTimeout: 60_000,
  }
}

async function createRegistry(name, targetDatabase, options = {}) {
  const attempts = Number(options.attempts || 1)
  const retryDelayMs = Number(options.retryDelayMs || 750)
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const registry = createNfzDatabaseRegistry({
      default: name,
      connections: { [name]: resolvedConfig(name, targetDatabase) },
    })
    try {
      await registry.connectAll()
      return registry
    }
    catch (error) {
      lastError = error
      try { await registry.closeAll() } catch {}
      if (attempt < attempts)
        await new Promise(resolvePromise => setTimeout(resolvePromise, retryDelayMs))
    }
  }

  throw lastError || new Error('Unable to create MSSQL certification registry.')
}

let masterRegistry = await createRegistry('mssqlAdmin', connection.database || 'master')
const masterClient = getNfzKnexClient({ get: key => key === 'databaseRegistry' ? masterRegistry : undefined }, 'mssqlAdmin')
let databaseCreated = false
let applicationRegistry
let databaseClient
let schemaCreated = false
let auditCreated = false
let usersCreated = false

try {
  const serverIdentity = await masterClient.raw("SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) AS version, CAST(SERVERPROPERTY('ProductMajorVersion') AS int) AS majorVersion, CAST(SERVERPROPERTY('EngineEdition') AS int) AS engineEdition")
  const identityRow = Array.isArray(serverIdentity) ? serverIdentity[0] : serverIdentity
  const rows = identityRow?.recordset || identityRow
  const firstIdentity = Array.isArray(rows) ? rows[0] : rows
  assert.ok(firstIdentity?.version || firstIdentity?.VERSION || firstIdentity?.Version)
  const majorVersion = Number(firstIdentity?.majorVersion ?? firstIdentity?.MAJORVERSION ?? firstIdentity?.MajorVersion)
  assert.ok(Number.isInteger(majorVersion) && majorVersion >= 17, 'SQL Server 2025 / major version 17+ is required')

  await masterClient.raw('CREATE DATABASE ' + quoteIdentifier(databaseName))
  databaseCreated = true
  await masterRegistry.closeAll()
  masterRegistry = undefined

  applicationRegistry = await createRegistry('reporting', databaseName, { attempts: 10, retryDelayMs: 1_000 })
  const app = koa(feathers())
  app.set('databaseRegistry', applicationRegistry)
  databaseClient = getNfzKnexClient(app, 'reporting')

  const health = await checkNfzDatabaseConnection(app, 'reporting')
  assert.equal(health.type, 'mssql')
  assert.equal(health.provider, 'knex')
  assert.equal(health.certification, 'certified')
  assert.equal(health.connected, true)
  assert.equal(health.defaultClient, 'mssql')
  assert.equal(health.driverPackage, 'tedious')
  assert.equal(health.capabilities.transactions, true)
  assert.equal(health.capabilities.schemaNamespaces, true)

  await databaseClient.raw('CREATE SCHEMA ' + quoteIdentifier(schemaName) + ' AUTHORIZATION dbo')
  schemaCreated = true
  const schemaRows = await databaseClient('sys.schemas').select('name').where({ name: schemaName })
  assert.equal(schemaRows.length, 1)

  await databaseClient.schema.withSchema(schemaName).createTable('audit_events', (table) => {
    table.increments('id').primary()
    table.string('category', 80).notNullable()
    table.integer('severity').notNullable()
    table.string('message', 255).notNullable()
  })
  auditCreated = true
  await databaseClient.schema.withSchema(schemaName).createTable('users', (table) => {
    table.uuid('id').primary()
    table.string('email', 160).notNullable().unique()
    table.string('password', 255).notNullable()
  })
  usersCreated = true
  await databaseClient.schema.withSchema(schemaName).alterTable('audit_events', (table) => {
    table.index(['category', 'severity'], 'audit_events_category_severity_idx')
  })

  const indexRows = await databaseClient('sys.indexes as i')
    .join('sys.tables as t', 'i.object_id', 't.object_id')
    .join('sys.schemas as s', 't.schema_id', 's.schema_id')
    .select('i.name')
    .where({ 's.name': schemaName, 't.name': 'audit_events', 'i.name': 'audit_events_category_severity_idx' })
  assert.equal(indexRows.length, 1)

  class AuditService extends KnexService {}
  class UserService extends KnexService {}

  app.use('audit-events', new AuditService({
    Model: databaseClient,
    name: 'audit_events',
    schema: schemaName,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))
  app.use('users', new UserService({
    Model: databaseClient,
    name: 'users',
    schema: schemaName,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))

  app.set('authentication', {
    secret: 'nfz-mssql-certification-secret-0123456789abcdef0123456789abcdef',
    entity: 'user',
    service: 'users',
    authStrategies: ['jwt', 'local'],
    jwtOptions: {
      header: { typ: 'access' },
      audience: 'https://nuxt-feathers-zod.local/mssql-certification',
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
  await audit.create({ category: 'ops', severity: 2, message: 'ignored' })
  await audit.create({ category: 'security', severity: 6, message: 'skipped' })
  assert.equal(typeof first.id, 'number')
  assert.equal((await audit.get(second.id)).message, 'updated')
  await audit.patch(second.id, { message: 'patched' })
  assert.equal((await audit.get(second.id)).message, 'patched')

  const querySchema = zodQuerySyntax(z.object({
    id: z.number().int(),
    category: z.string(),
    severity: z.number().int(),
    message: z.string(),
  }))
  const parsedQuery = querySchema.parse({
    severity: { $gte: '4', $in: ['4', '6', '8'] },
    $sort: { severity: '-1' },
    $limit: '2',
    $skip: '1',
  })
  const page = await audit.find({ query: parsedQuery })
  assert.equal(page.total, 3)
  assert.equal(page.limit, 2)
  assert.equal(page.skip, 1)
  assert.deepEqual(page.data.map(row => row.severity), [6, 4])

  const uuid = randomUUID()
  const password = 'Mssql-Certification-Password!2026'
  const hashedPassword = await localStrategy.hashPassword(password)
  const user = await app.service('users').create({ id: uuid, email: 'mssql-cert@example.invalid', password: hashedPassword })
  assert.equal(user.id, uuid)
  const localResult = await app.service('authentication').create({ strategy: 'local', email: user.email, password })
  assert.equal(localResult.user.id, uuid)
  assert.ok(localResult.accessToken)
  const jwtResult = await app.service('authentication').create({ strategy: 'jwt', accessToken: localResult.accessToken })
  assert.equal(jwtResult.user.id, uuid)
  assert.equal(jwtResult.user.email, user.email)

  const beforeRollback = await audit.find({ paginate: false, query: { category: 'rollback' } })
  assert.equal(beforeRollback.length, 0)
  await assert.rejects(
    withNfzSqlTransaction(app, async (trx) => {
      await trx.withSchema(schemaName).table('audit_events').insert({ category: 'rollback', severity: 9, message: 'must disappear' })
      throw new Error('intentional-mssql-rollback')
    }, { connection: 'reporting' }),
    /intentional-mssql-rollback/,
  )
  const afterRollback = await audit.find({ paginate: false, query: { category: 'rollback' } })
  assert.equal(afterRollback.length, 0)

  await audit.remove(first.id)
  await assert.rejects(audit.get(first.id))

  console.log(
    '[mssql-cert] SQL Server identity/schema, CRUD, integer IDs, numeric query coercion, '
    + '$in/$sort/$limit/$skip, UUID local/JWT auth, real index DDL and DML rollback passed.',
  )
}
finally {
  let teardownError

  try {
    if (applicationRegistry) {
      if (usersCreated)
        await databaseClient.schema.withSchema(schemaName).dropTableIfExists('users')
      if (auditCreated)
        await databaseClient.schema.withSchema(schemaName).dropTableIfExists('audit_events')
      if (schemaCreated)
        await databaseClient.raw('DROP SCHEMA ' + quoteIdentifier(schemaName))
      await applicationRegistry.closeAll()
      const closed = applicationRegistry.diagnostics().find(item => item.name === 'reporting')
      assert.equal(closed?.state, 'closed')
      applicationRegistry = undefined
    }
  }
  catch (error) {
    teardownError = error
    if (applicationRegistry) {
      try { await applicationRegistry.closeAll() } catch {}
      applicationRegistry = undefined
    }
  }

  if (databaseCreated) {
    try {
      if (!masterRegistry)
        masterRegistry = await createRegistry('mssqlAdmin', connection.database || 'master', { attempts: 5, retryDelayMs: 1_000 })
      const cleanupClient = getNfzKnexClient({ get: key => key === 'databaseRegistry' ? masterRegistry : undefined }, 'mssqlAdmin')
      await cleanupClient.raw('ALTER DATABASE ' + quoteIdentifier(databaseName) + ' SET SINGLE_USER WITH ROLLBACK IMMEDIATE')
      await cleanupClient.raw('DROP DATABASE ' + quoteIdentifier(databaseName))
      databaseCreated = false
    }
    catch (error) {
      teardownError ||= error
    }
  }

  if (masterRegistry) {
    try {
      await masterRegistry.closeAll()
      const closed = masterRegistry.diagnostics().find(item => item.name === 'mssqlAdmin')
      assert.equal(closed?.state, 'closed')
    }
    catch (error) {
      teardownError ||= error
    }
  }

  if (teardownError)
    throw teardownError
}
`

let workspace
let runtime
try {
  workspace = await mkdtemp(resolve(tmpdir(), 'nfz-mssql-cert-'))
  const packagePath = candidate.replaceAll('\\', '/')
  const consumerPackage = createExactReleaseConsumerPackage({
    root,
    name: 'nfz-mssql-certification-consumer',
    profile: 'database',
    dependencies: {
      '@feathersjs/authentication': FEATHERS_VERSION,
      '@feathersjs/authentication-local': FEATHERS_VERSION,
      '@feathersjs/feathers': FEATHERS_VERSION,
      '@feathersjs/knex': FEATHERS_VERSION,
      '@feathersjs/koa': FEATHERS_VERSION,
      knex: KNEX_VERSION,
      'nuxt-feathers-zod': `file:${packagePath}`,
      tedious: TEDIOUS_VERSION,
      zod: ZOD_VERSION,
    },
  })

  await writeFile(resolve(workspace, 'package.json'), `${JSON.stringify(consumerPackage, null, 2)}\n`)
  await writeFile(resolve(workspace, 'mssql-certification.mjs'), harnessSource)

  console.log(`[mssql-cert] Installing exact certification consumer for ${basename(candidate)}.`)
  installExactReleaseConsumer({ cwd: workspace, label: 'mssql-cert' })

  const externalConnection = parseExternalConnection()
  runtime = externalConnection
    ? { connection: externalConnection, source: 'external', async stop() {} }
    : await provisionDockerMssql()

  const databaseName = `nfz_cert_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
  const schemaName = `nfz_${randomBytes(5).toString('hex')}`
  console.log(
    `[mssql-cert] Running exact candidate against ${runtime.source}; isolated database=${databaseName}; schema=${schemaName}.`,
  )
  run(process.execPath, ['mssql-certification.mjs'], {
    cwd: workspace,
    timeout: HARNESS_TIMEOUT_MS,
    stdio: 'inherit',
    env: {
      ...process.env,
      NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON: JSON.stringify(runtime.connection),
      NFZ_MSSQL_CERTIFICATION_DATABASE: databaseName,
      NFZ_MSSQL_CERTIFICATION_SCHEMA: schemaName,
    },
  })

  recordArtifactValidation(root, 'mssql', artifact, {
    engine: 'mssql',
    source: runtime.source,
    driver: `tedious@${TEDIOUS_VERSION}`,
    server: 'SQL Server 2025 (17.x)',
  })
  console.log('[mssql-cert] Exact release candidate MSSQL certification passed.')
}
finally {
  await runtime?.stop?.()
  if (workspace) {
    await rm(workspace, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  }
}
