#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  recordArtifactValidation,
  requireArtifactValidations,
  resolveReleaseArtifact,
} from './lib/release-artifact.mjs'
import { createExactReleaseConsumerPackage, installExactReleaseConsumer } from './lib/release-consumer-install.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifact = resolveReleaseArtifact(root, { allowFinal: false })
if (artifact.state !== 'candidate')
  throw new Error('Database matrix certification requires the current immutable release candidate.')

requireArtifactValidations(root, artifact, ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql'])

const candidate = artifact.tarballPath
const MONGO_IMAGE = String(process.env.NFZ_MATRIX_MONGODB_DOCKER_IMAGE || 'mongo:7.0').trim()
const POSTGRES_IMAGE = String(process.env.NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE || 'postgres:18-alpine').trim()
const FEATHERS_VERSION = '5.0.49'
const KNEX_VERSION = '3.2.10'
const MONGODB_VERSION = '6.21.0'
const PG_VERSION = '8.23.0'
const BETTER_SQLITE3_VERSION = '12.11.1'
const REBUILD_TIMEOUT_MS = 10 * 60 * 1000
const HARNESS_TIMEOUT_MS = 4 * 60 * 1000
const READY_TIMEOUT_MS = 120 * 1000
const DOCKER_IMAGE_PULL_TIMEOUT_MS = 8 * 60 * 1000
const DOCKER_RUN_TIMEOUT_MS = 120 * 1000

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
    const output = [String(result.stdout || '').trim(), String(result.stderr || '').trim()].filter(Boolean).join('\n')
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}\n${output}`)
  }
  return result
}

function dockerAvailable() {
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8', timeout: 20_000 })
  return !result.error && result.status === 0 && String(result.stdout || '').trim() !== ''
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms))
}

function ensureDockerImageAvailable(image, label, overrideVariable) {
  const inspect = spawnSync('docker', ['image', 'inspect', image], {
    encoding: 'utf8',
    timeout: 20_000,
  })
  if (!inspect.error && inspect.status === 0)
    return

  console.log(`[database-matrix] Pulling ${label} image ${image}.`)
  try {
    run('docker', ['pull', image], { timeout: DOCKER_IMAGE_PULL_TIMEOUT_MS })
  }
  catch (error) {
    throw new Error(
      `Database matrix certification could not resolve ${label} Docker image ${image}. `
      + `Use an available image or override the maintainer pin with ${overrideVariable}.\n`
      + String(error?.message || error),
      { cause: error },
    )
  }
}

function parseDockerPort(output) {
  const line = String(output || '').trim().split(/\r?\n/).find(Boolean) || ''
  const match = /:(\d+)$/.exec(line)
  if (!match)
    throw new Error(`Unable to determine Docker port from: ${line || '[empty]'}`)
  return Number(match[1])
}

async function provisionMongo() {
  const name = `nfz-matrix-mongo-${process.pid}-${randomBytes(4).toString('hex')}`
  console.log(`[database-matrix] Starting isolated ${MONGO_IMAGE} container.`)
  run('docker', ['run', '--detach', '--rm', '--name', name, '--publish', '127.0.0.1::27017', MONGO_IMAGE], { timeout: DOCKER_RUN_TIMEOUT_MS })
  try {
    const started = Date.now()
    let ready = false
    while (Date.now() - started < READY_TIMEOUT_MS) {
      const probe = spawnSync('docker', ['exec', name, 'mongosh', '--quiet', '--eval', 'db.adminCommand({ ping: 1 }).ok'], {
        encoding: 'utf8', timeout: 10_000,
      })
      if (!probe.error && probe.status === 0 && String(probe.stdout || '').includes('1')) {
        ready = true
        break
      }
      await sleep(1_000)
    }
    if (!ready)
      throw new Error(`MongoDB matrix container ${name} did not become ready within ${READY_TIMEOUT_MS} ms.`)
    const port = parseDockerPort(run('docker', ['port', name, '27017/tcp'], { timeout: 20_000 }).stdout)
    return {
      url: `mongodb://127.0.0.1:${port}/nfz_matrix`,
      source: `docker:${MONGO_IMAGE}`,
      async stop() { run('docker', ['rm', '--force', name], { timeout: 30_000 }) },
    }
  }
  catch (error) {
    spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
    throw error
  }
}

async function provisionPostgres() {
  const name = `nfz-matrix-postgresql-${process.pid}-${randomBytes(4).toString('hex')}`
  const user = 'nfz_matrix'
  const database = 'nfz_matrix'
  const password = `nfz_${randomBytes(18).toString('base64url')}`
  console.log(`[database-matrix] Starting isolated ${POSTGRES_IMAGE} container.`)
  run('docker', [
    'run', '--detach', '--rm', '--name', name,
    '--env', `POSTGRES_USER=${user}`,
    '--env', 'POSTGRES_PASSWORD',
    '--env', `POSTGRES_DB=${database}`,
    '--publish', '127.0.0.1::5432',
    POSTGRES_IMAGE,
  ], { timeout: DOCKER_RUN_TIMEOUT_MS, env: { ...process.env, POSTGRES_PASSWORD: password } })
  try {
    const started = Date.now()
    let ready = false
    while (Date.now() - started < READY_TIMEOUT_MS) {
      const probe = spawnSync('docker', ['exec', name, 'pg_isready', '--username', user, '--dbname', database], {
        encoding: 'utf8', timeout: 10_000,
      })
      if (!probe.error && probe.status === 0) {
        ready = true
        break
      }
      await sleep(1_000)
    }
    if (!ready)
      throw new Error(`PostgreSQL matrix container ${name} did not become ready within ${READY_TIMEOUT_MS} ms.`)
    const port = parseDockerPort(run('docker', ['port', name, '5432/tcp'], { timeout: 20_000 }).stdout)
    return {
      url: `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`,
      source: `docker:${POSTGRES_IMAGE}`,
      async stop() { run('docker', ['rm', '--force', name], { timeout: 30_000 }) },
    }
  }
  catch (error) {
    spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 30_000 })
    throw error
  }
}

const candidateApiSurfaceSource = String.raw`
import assert from 'node:assert/strict'
import { getNfzDatabaseProviderDescriptor } from 'nuxt-feathers-zod/options'
import { createNfzDatabaseRegistry } from 'nuxt-feathers-zod/server-database'

assert.equal(typeof getNfzDatabaseProviderDescriptor, 'function')
assert.equal(typeof createNfzDatabaseRegistry, 'function')
assert.equal(getNfzDatabaseProviderDescriptor('postgresql').driverPackage, 'pg')
assert.equal(getNfzDatabaseProviderDescriptor('sqlite').driverPackage, 'better-sqlite3')
console.log('[database-matrix] Exact candidate public database API surface passed.')
`

const harnessSource = String.raw`
import assert from 'node:assert/strict'
import { feathers } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import { MongoDBService } from '@feathersjs/mongodb'
import { koa } from '@feathersjs/koa'
import { getNfzDatabaseProviderDescriptor } from 'nuxt-feathers-zod/options'
import {
  checkNfzDatabaseConnection,
  createNfzDatabaseRegistry,
  getNfzDatabaseDiagnostics,
  getNfzKnexClient,
  getNfzMongoDatabase,
} from 'nuxt-feathers-zod/server-database'

const mongoUrl = process.env.NFZ_MATRIX_MONGODB_URL
const postgresqlUrl = process.env.NFZ_MATRIX_POSTGRESQL_URL
const sqliteFile = process.env.NFZ_MATRIX_SQLITE_FILE
assert.ok(mongoUrl && postgresqlUrl && sqliteFile)

function resolvedBase(name, type) {
  const descriptor = getNfzDatabaseProviderDescriptor(type)
  return {
    name,
    type,
    provider: descriptor.provider,
    databaseFamily: descriptor.databaseFamily,
    adapter: descriptor.adapter,
    certification: descriptor.certification,
    capabilities: { ...descriptor.capabilities },
    enabled: true,
    required: true,
    healthCheck: true,
    legacy: false,
  }
}

function resolvedSql(name, type, connection, pool, extra = {}) {
  const descriptor = getNfzDatabaseProviderDescriptor(type)
  assert.equal(descriptor.provider, 'knex')
  assert.ok(descriptor.defaultClient && descriptor.driverPackage)
  return {
    ...resolvedBase(name, type),
    client: descriptor.defaultClient,
    defaultClient: descriptor.defaultClient,
    driverPackage: descriptor.driverPackage,
    customClient: false,
    connection,
    pool,
    acquireConnectionTimeout: 60_000,
    ...extra,
  }
}

const database = {
  default: 'documents',
  connections: {
    documents: {
      ...resolvedBase('documents', 'mongodb'),
      url: mongoUrl,
      database: 'nfz_matrix',
      management: { enabled: false },
    },
    reporting: resolvedSql('reporting', 'postgresql', postgresqlUrl, { min: 0, max: 3 }),
    localCache: resolvedSql(
      'localCache',
      'sqlite',
      { filename: sqliteFile },
      { min: 0, max: 1 },
      { useNullAsDefault: true },
    ),
  },
}

const registry = createNfzDatabaseRegistry(database)
await registry.connectAll()
const app = koa(feathers())
app.set('databaseRegistry', registry)
let pgTableCreated = false
let sqliteTableCreated = false
let mongoCollectionCreated = false

try {
  const diagnostics = getNfzDatabaseDiagnostics(app)
  assert.equal(diagnostics.length, 3)
  assert.deepEqual(diagnostics.map(item => item.name).sort(), ['documents', 'localCache', 'reporting'])
  assert.ok(diagnostics.every(item => item.state === 'ready' && item.certification === 'certified'))

  const [mongoHealth, postgresHealth, sqliteHealth] = await Promise.all([
    checkNfzDatabaseConnection(app, 'documents'),
    checkNfzDatabaseConnection(app, 'reporting'),
    checkNfzDatabaseConnection(app, 'localCache'),
  ])
  assert.equal(mongoHealth.provider, 'mongodb')
  assert.equal(postgresHealth.driverPackage, 'pg')
  assert.equal(sqliteHealth.driverPackage, 'better-sqlite3')

  const mongoDb = await getNfzMongoDatabase(app, 'documents')
  const postgres = getNfzKnexClient(app, 'reporting')
  const sqlite = getNfzKnexClient(app, 'localCache')
  const table = 'nfz_matrix_probe'
  const collection = mongoDb.collection(table)

  await collection.insertOne({ engine: 'mongodb', value: 1 })
  mongoCollectionCreated = true
  await collection.deleteMany({})

  await postgres.schema.dropTableIfExists(table)
  await sqlite.schema.dropTableIfExists(table)
  await postgres.schema.createTable(table, (schema) => {
    schema.increments('id').primary()
    schema.string('engine', 32).notNullable()
    schema.integer('value').notNullable()
  })
  pgTableCreated = true
  await sqlite.schema.createTable(table, (schema) => {
    schema.increments('id').primary()
    schema.string('engine', 32).notNullable()
    schema.integer('value').notNullable()
  })
  sqliteTableCreated = true

  class SqlProbeService extends KnexService {}
  class MongoProbeService extends MongoDBService {}
  app.use('matrix-mongo', new MongoProbeService({
    Model: Promise.resolve(collection),
    paginate: { default: 10, max: 20 },
    multi: true,
  }))
  app.use('matrix-postgresql', new SqlProbeService({
    Model: postgres,
    name: table,
    id: 'id',
    paginate: { default: 10, max: 20 },
    multi: true,
  }))
  app.use('matrix-sqlite', new SqlProbeService({
    Model: sqlite,
    name: table,
    id: 'id',
    paginate: { default: 10, max: 20 },
    multi: true,
  }))
  await app.setup()

  const [mongoCreated, pgCreated, sqliteCreated] = await Promise.all([
    app.service('matrix-mongo').create({ engine: 'mongodb', value: 11 }),
    app.service('matrix-postgresql').create({ engine: 'postgresql', value: 22 }),
    app.service('matrix-sqlite').create({ engine: 'sqlite', value: 33 }),
  ])
  assert.equal(mongoCreated.engine, 'mongodb')
  assert.equal(pgCreated.engine, 'postgresql')
  assert.equal(sqliteCreated.engine, 'sqlite')

  const [mongoRead, pgRead, sqliteRead] = await Promise.all([
    app.service('matrix-mongo').get(mongoCreated._id),
    app.service('matrix-postgresql').get(pgCreated.id),
    app.service('matrix-sqlite').get(sqliteCreated.id),
  ])
  assert.equal(mongoRead.value, 11)
  assert.equal(pgRead.value, 22)
  assert.equal(sqliteRead.value, 33)

  const [mongoPatched, pgPatched, sqlitePatched] = await Promise.all([
    app.service('matrix-mongo').patch(mongoCreated._id, { value: 111 }),
    app.service('matrix-postgresql').patch(pgCreated.id, { value: 222 }),
    app.service('matrix-sqlite').patch(sqliteCreated.id, { value: 333 }),
  ])
  assert.equal(mongoPatched.value, 111)
  assert.equal(pgPatched.value, 222)
  assert.equal(sqlitePatched.value, 333)

  await Promise.all([
    app.service('matrix-mongo').remove(mongoCreated._id),
    app.service('matrix-postgresql').remove(pgCreated.id),
    app.service('matrix-sqlite').remove(sqliteCreated.id),
  ])

  console.log('[database-matrix] One NFZ registry kept MongoDB, PostgreSQL and file-backed SQLite ready together; parallel Feathers CRUD stayed isolated per named connection.')
}
finally {
  let teardownError
  try {
    const mongoDb = await getNfzMongoDatabase(app, 'documents')
    if (mongoCollectionCreated)
      await mongoDb.collection('nfz_matrix_probe').drop().catch(error => { if (error?.codeName !== 'NamespaceNotFound') throw error })
  }
  catch (error) { teardownError ||= error }
  try {
    const postgres = getNfzKnexClient(app, 'reporting')
    if (pgTableCreated)
      await postgres.schema.dropTableIfExists('nfz_matrix_probe')
  }
  catch (error) { teardownError ||= error }
  try {
    const sqlite = getNfzKnexClient(app, 'localCache')
    if (sqliteTableCreated)
      await sqlite.schema.dropTableIfExists('nfz_matrix_probe')
  }
  catch (error) { teardownError ||= error }

  await registry.closeAll()
  const closed = registry.diagnostics()
  assert.ok(closed.every(item => item.state === 'closed'))
  if (teardownError)
    throw teardownError
}
`

if (!dockerAvailable())
  throw new Error('Database matrix certification requires Docker Desktop/Engine for its MongoDB + PostgreSQL coexistence fixture.')

ensureDockerImageAvailable(MONGO_IMAGE, 'MongoDB', 'NFZ_MATRIX_MONGODB_DOCKER_IMAGE')
ensureDockerImageAvailable(POSTGRES_IMAGE, 'PostgreSQL', 'NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE')

let workspace
let mongo
let postgres
let cleanupError
let harnessPassed = false
try {
  workspace = await mkdtemp(resolve(tmpdir(), 'nfz-database-matrix-'))
  const databaseDir = resolve(workspace, 'database')
  await mkdir(databaseDir, { recursive: false })
  const sqliteFile = resolve(databaseDir, 'matrix.sqlite')
  const packagePath = candidate.replaceAll('\\', '/')
  const consumerPackage = createExactReleaseConsumerPackage({
    root,
    name: 'nfz-database-matrix-certification-consumer',
    profile: 'database',
    dependencies: {
      '@feathersjs/feathers': FEATHERS_VERSION,
      '@feathersjs/knex': FEATHERS_VERSION,
      '@feathersjs/koa': FEATHERS_VERSION,
      '@feathersjs/mongodb': FEATHERS_VERSION,
      'better-sqlite3': BETTER_SQLITE3_VERSION,
      knex: KNEX_VERSION,
      mongodb: MONGODB_VERSION,
      'nuxt-feathers-zod': `file:${packagePath}`,
      pg: PG_VERSION,
    },
  })
  await writeFile(resolve(workspace, 'package.json'), `${JSON.stringify(consumerPackage, null, 2)}\n`)
  await writeFile(resolve(workspace, 'candidate-api-surface.mjs'), candidateApiSurfaceSource)
  await writeFile(resolve(workspace, 'database-matrix-certification.mjs'), harnessSource)

  console.log(`[database-matrix] Installing exact certification consumer for ${basename(candidate)}.`)
  const { npmCommand, npmCliPath } = installExactReleaseConsumer({
    cwd: workspace,
    label: 'database-matrix',
  })
  run(process.execPath, ['candidate-api-surface.mjs'], {
    cwd: workspace,
    timeout: 30_000,
    stdio: 'inherit',
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

  mongo = await provisionMongo()
  postgres = await provisionPostgres()
  console.log(`[database-matrix] Running exact candidate with simultaneous ${mongo.source}, ${postgres.source}, and file-backed SQLite.`)
  run(process.execPath, ['database-matrix-certification.mjs'], {
    cwd: workspace,
    timeout: HARNESS_TIMEOUT_MS,
    stdio: 'inherit',
    env: {
      ...process.env,
      NFZ_MATRIX_MONGODB_URL: mongo.url,
      NFZ_MATRIX_POSTGRESQL_URL: postgres.url,
      NFZ_MATRIX_SQLITE_FILE: sqliteFile,
    },
  })
  harnessPassed = true
}
finally {
  for (const runtime of [postgres, mongo]) {
    if (!runtime)
      continue
    try { await runtime.stop() }
    catch (error) { cleanupError ||= error }
  }
  if (workspace) {
    try {
      await rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    }
    catch (error) { cleanupError ||= error }
  }
}

if (!harnessPassed)
  throw new Error('Database matrix harness did not complete.')
if (cleanupError)
  throw cleanupError

recordArtifactValidation(root, 'database-matrix', artifact, {
  engines: ['mongodb', 'postgresql', 'sqlite'],
  prerequisiteEngineStamps: ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql'],
  simultaneousConnections: 3,
})
console.log('[database-matrix] Exact release candidate cross-database coexistence certification passed.')
