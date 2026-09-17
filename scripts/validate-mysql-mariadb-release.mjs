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
  throw new Error('MySQL/MariaDB certification requires the current immutable release candidate.')

const candidate = artifact.tarballPath
const FEATHERS_VERSION = '5.0.49'
const KNEX_VERSION = '3.2.10'
const MYSQL2_VERSION = '3.24.4'
const ZOD_VERSION = '3.25.76'
const HARNESS_TIMEOUT_MS = 3 * 60 * 1000
const DOCKER_READY_TIMEOUT_MS = 120 * 1000

const engines = [
  {
    engine: 'mysql',
    externalUrl: String(process.env.NFZ_MYSQL_CERTIFICATION_URL || '').trim(),
    dockerImage: String(process.env.NFZ_MYSQL_DOCKER_IMAGE || 'mysql:8.4').trim(),
    rootPasswordEnv: 'MYSQL_ROOT_PASSWORD',
    databaseEnv: 'MYSQL_DATABASE',
    userEnv: 'MYSQL_USER',
    passwordEnv: 'MYSQL_PASSWORD',
    adminCommand: 'mysqladmin',
  },
  {
    engine: 'mariadb',
    externalUrl: String(process.env.NFZ_MARIADB_CERTIFICATION_URL || '').trim(),
    dockerImage: String(process.env.NFZ_MARIADB_DOCKER_IMAGE || 'mariadb:11.8').trim(),
    rootPasswordEnv: 'MARIADB_ROOT_PASSWORD',
    databaseEnv: 'MARIADB_DATABASE',
    userEnv: 'MARIADB_USER',
    passwordEnv: 'MARIADB_PASSWORD',
    adminCommand: 'mariadb-admin',
  },
]

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
    throw new Error(`Unable to determine SQL Docker port from: ${line || '[empty]'}`)
  return Number(match[1])
}

function getDatabaseName(urlValue) {
  try {
    const parsed = new URL(urlValue)
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    if (!database)
      throw new Error('missing database name')
    return database
  }
  catch (error) {
    throw new Error('MySQL/MariaDB certification URL must contain an explicit database name.', { cause: error })
  }
}

async function provisionDockerEngine(spec) {
  if (!dockerAvailable()) {
    throw new Error(
      `${spec.engine} certification requires Docker Desktop/Engine or its NFZ_*_CERTIFICATION_URL override. `
      + 'Docker is unavailable and no external certification URL was provided.',
    )
  }

  const suffix = randomBytes(5).toString('hex')
  const name = `nfz-${spec.engine}-cert-${process.pid}-${suffix}`
  const user = 'nfz_cert'
  const database = 'nfz_cert'
  const password = `nfz_${randomBytes(18).toString('base64url')}`
  const rootPassword = `root_${randomBytes(18).toString('base64url')}`

  console.log(`[sql-cert:${spec.engine}] Starting isolated ${spec.dockerImage} container.`)
  run('docker', [
    'run', '--detach', '--rm',
    '--name', name,
    '--env', `${spec.rootPasswordEnv}=${rootPassword}`,
    '--env', `${spec.databaseEnv}=${database}`,
    '--env', `${spec.userEnv}=${user}`,
    '--env', `${spec.passwordEnv}=${password}`,
    '--publish', '127.0.0.1::3306',
    spec.dockerImage,
  ], { timeout: 120_000 })

  try {
    const startedAt = Date.now()
    let ready = false
    const passwordVariable = spec.rootPasswordEnv
    while (Date.now() - startedAt < DOCKER_READY_TIMEOUT_MS) {
      const probe = spawnSync('docker', [
        'exec', name, 'sh', '-lc',
        `${spec.adminCommand} ping --host=127.0.0.1 --user=root --password=\"$${passwordVariable}\" --silent`,
      ], { encoding: 'utf8', timeout: 10_000 })
      if (!probe.error && probe.status === 0) {
        ready = true
        break
      }
      await sleep(1_000)
    }
    if (!ready)
      throw new Error(`${spec.engine} container ${name} did not become ready within ${DOCKER_READY_TIMEOUT_MS} ms.`)

    const portResult = run('docker', ['port', name, '3306/tcp'], { timeout: 20_000 })
    const port = parseDockerPort(portResult.stdout)
    const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`

    return {
      url,
      database,
      source: `docker:${spec.dockerImage}`,
      async stop() {
        const stopped = spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
        if (stopped.error)
          throw stopped.error
        if (stopped.status !== 0 && !String(stopped.stderr || '').includes('No such container')) {
          throw new Error(
            `Unable to remove ${spec.engine} certification container ${name}: ${String(stopped.stderr || '').trim()}`,
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

const engine = process.env.NFZ_SQL_CERTIFICATION_ENGINE
const databaseUrl = process.env.NFZ_SQL_CERTIFICATION_URL
const databaseName = process.env.NFZ_SQL_CERTIFICATION_DATABASE
const prefix = process.env.NFZ_SQL_CERTIFICATION_PREFIX
assert.ok(engine === 'mysql' || engine === 'mariadb')
assert.ok(databaseUrl, 'NFZ_SQL_CERTIFICATION_URL is required')
assert.match(databaseName, /^[A-Za-z0-9_$-]+$/)
assert.match(prefix, /^nfz_[a-z0-9_]+$/)

const auditTable = prefix + '_audit'
const usersTable = prefix + '_users'
const indexName = prefix + '_cat_sev_idx'
const capabilities = {
  healthCheck: true,
  namedConnections: true,
  transactions: true,
  schemaNamespaces: false,
  indexManagement: false,
  migrations: false,
  nativeObjectId: false,
}

const registry = createNfzDatabaseRegistry({
  default: 'reporting',
  connections: {
    reporting: {
      name: 'reporting',
      type: engine,
      provider: 'knex',
      databaseFamily: 'sql',
      adapter: 'knex',
      certification: 'certified',
      capabilities,
      enabled: true,
      required: true,
      healthCheck: true,
      legacy: false,
      client: 'mysql2',
      defaultClient: 'mysql2',
      driverPackage: 'mysql2',
      customClient: false,
      connection: databaseUrl,
      pool: { min: 0, max: 4 },
      acquireConnectionTimeout: 60_000,
    },
  },
})

await registry.connectAll()
const app = koa(feathers())
app.set('databaseRegistry', registry)
const sql = getNfzKnexClient(app, 'reporting')
let auditCreated = false
let usersCreated = false

try {
  const health = await checkNfzDatabaseConnection(app, 'reporting')
  assert.equal(health.type, engine)
  assert.equal(health.provider, 'knex')
  assert.equal(health.certification, 'certified')
  assert.equal(health.connected, true)
  assert.equal(health.capabilities.transactions, true)
  assert.equal(health.capabilities.schemaNamespaces, false)

  const versionRows = await sql.select(sql.raw('VERSION() AS version'))
  const version = String(versionRows?.[0]?.version || '')
  assert.ok(version)
  if (engine === 'mariadb')
    assert.match(version, /mariadb/i)
  else
    assert.doesNotMatch(version, /mariadb/i)

  await sql.schema.createTable(auditTable, (table) => {
    table.increments('id').primary()
    table.string('category', 80).notNullable()
    table.integer('severity').notNullable()
    table.string('message', 255).notNullable()
  })
  auditCreated = true
  await sql.schema.createTable(usersTable, (table) => {
    table.string('id', 36).primary()
    table.string('email', 160).notNullable().unique()
    table.string('password', 255).notNullable()
  })
  usersCreated = true
  await sql.schema.alterTable(auditTable, (table) => {
    table.index(['category', 'severity'], indexName)
  })

  const indexRows = await sql('information_schema.statistics')
    .select({ indexName: 'INDEX_NAME' })
    .where({ TABLE_SCHEMA: databaseName, TABLE_NAME: auditTable })
  assert.ok(indexRows.some(row => row.indexName === indexName))

  class AuditService extends KnexService {}
  class UserService extends KnexService {}

  app.use('audit-events', new AuditService({
    Model: sql,
    name: auditTable,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))
  app.use('users', new UserService({
    Model: sql,
    name: usersTable,
    id: 'id',
    paginate: { default: 10, max: 100 },
    multi: true,
  }))

  app.set('authentication', {
    secret: 'nfz-mysql-family-certification-secret-0123456789abcdef0123456789abcdef',
    entity: 'user',
    service: 'users',
    authStrategies: ['jwt', 'local'],
    jwtOptions: {
      header: { typ: 'access' },
      audience: 'https://nuxt-feathers-zod.local/mysql-family-certification',
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
      await transaction.table(auditTable).insert({
        category: 'transaction', severity: 10, message: 'rollback',
      })
      throw new Error('nfz-mysql-family-certification-rollback')
    }, { connection: 'reporting' })
  }
  catch (error) {
    assert.equal(error.message, 'nfz-mysql-family-certification-rollback')
    rollbackObserved = true
  }
  assert.equal(rollbackObserved, true)
  const afterRollback = await audit.find({ paginate: false })
  assert.equal(afterRollback.length, beforeRollback.length)

  const email = engine + '-' + randomUUID() + '@nfz.invalid'
  const plainPassword = 'NFZ-mysql-family-certification-123!'
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
    '[sql-cert:' + engine + '] CRUD, numeric query coercion, pagination/sort, UUID auth, JWT re-read, '
    + 'index DDL and DML transaction rollback passed.',
  )
}
finally {
  let teardownError
  try {
    if (usersCreated)
      await sql.schema.dropTableIfExists(usersTable)
    if (auditCreated)
      await sql.schema.dropTableIfExists(auditTable)
  }
  catch (error) {
    teardownError = error
  }
  await registry.closeAll()
  const closed = registry.diagnostics().find(item => item.name === 'reporting')
  assert.equal(closed?.state, 'closed')
  if (teardownError)
    throw teardownError
}
`

let workspace
try {
  workspace = await mkdtemp(resolve(tmpdir(), 'nfz-mysql-mariadb-cert-'))
  const packagePath = candidate.replaceAll('\\', '/')
  const consumerPackage = createExactReleaseConsumerPackage({
    root,
    name: 'nfz-mysql-mariadb-certification-consumer',
    profile: 'database',
    dependencies: {
      '@feathersjs/authentication': FEATHERS_VERSION,
      '@feathersjs/authentication-local': FEATHERS_VERSION,
      '@feathersjs/feathers': FEATHERS_VERSION,
      '@feathersjs/knex': FEATHERS_VERSION,
      '@feathersjs/koa': FEATHERS_VERSION,
      knex: KNEX_VERSION,
      mysql2: MYSQL2_VERSION,
      'nuxt-feathers-zod': `file:${packagePath}`,
      zod: ZOD_VERSION,
    },
  })

  await writeFile(resolve(workspace, 'package.json'), `${JSON.stringify(consumerPackage, null, 2)}\n`)
  await writeFile(resolve(workspace, 'mysql-family-certification.mjs'), harnessSource)

  console.log(`[sql-cert] Installing exact certification consumer for ${basename(candidate)}.`)
  installExactReleaseConsumer({ cwd: workspace, label: 'sql-cert' })

  for (const spec of engines) {
    let runtime
    try {
      runtime = spec.externalUrl
        ? {
            url: spec.externalUrl,
            database: getDatabaseName(spec.externalUrl),
            source: 'external',
            async stop() {},
          }
        : await provisionDockerEngine(spec)

      const prefix = `nfz_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
      console.log(
        `[sql-cert:${spec.engine}] Running exact candidate against ${runtime.source}; `
        + `database=${runtime.database}; prefix=${prefix}.`,
      )
      run(process.execPath, ['mysql-family-certification.mjs'], {
        cwd: workspace,
        timeout: HARNESS_TIMEOUT_MS,
        stdio: 'inherit',
        env: {
          ...process.env,
          NFZ_SQL_CERTIFICATION_ENGINE: spec.engine,
          NFZ_SQL_CERTIFICATION_URL: runtime.url,
          NFZ_SQL_CERTIFICATION_DATABASE: runtime.database,
          NFZ_SQL_CERTIFICATION_PREFIX: prefix,
        },
      })

      recordArtifactValidation(root, spec.engine, artifact, {
        engine: spec.engine,
        source: runtime.source,
        driver: `mysql2@${MYSQL2_VERSION}`,
      })
      console.log(`[sql-cert:${spec.engine}] Exact release candidate certification passed.`)
    }
    finally {
      await runtime?.stop?.()
    }
  }
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
}

console.log('[sql-cert] Exact release candidate MySQL and MariaDB certification passed.')
