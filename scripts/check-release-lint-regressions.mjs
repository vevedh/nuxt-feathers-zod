import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, forbidden, label) {
  if (source.includes(forbidden))
    problems.push(`${label}: forbidden ${JSON.stringify(forbidden)}`)
}

const starterE2e = read('examples/nfz-quasar-unocss-pinia-starter/scripts/e2e-ci.mjs')
const databaseConnections = read('src/runtime/options/database/connections.ts')
const plugins = read('src/runtime/options/plugins.ts')
const serverOptions = read('src/runtime/options/server.ts')
const bootstrap = read('src/runtime/server/bootstrap.ts')
const databaseRegistryTest = read('src/runtime/server/database-registry.test.ts')
const databaseRegistry = read('src/runtime/server/database-registry.ts')
const instanceRegistry = read('src/runtime/server/instance-registry.ts')
const serverTypes = read('src/runtime/server/types.ts')
const zodQueryTest = read('src/runtime/zod/query.test.ts')
const bootstrapTest = read('test/unit/server-bootstrap.test.ts')
const publicCommandsTest = read('test/public-doc-commands.spec.ts')
const starterAdminClient = read('examples/nfz-quasar-unocss-pinia-starter/app/composables/useAdminFeathers.ts')
const authHook = read('src/runtime/auth/hook.ts')
const starterPublishedTypesTest = read('test/starter-published-types.spec.ts')

requireText(
  starterE2e,
  "import { resolve } from 'node:path'\nimport { setTimeout as delay } from 'node:timers/promises'",
  'starter E2E import order',
)
requireText(starterE2e, "child.stdout.on('data', (chunk) =>", 'starter stdout arrow parameters')
requireText(starterE2e, "child.stderr.on('data', (chunk) =>", 'starter stderr arrow parameters')
requireText(starterE2e, "'authorization': `Bearer ${accessToken}`", 'starter header quote consistency')

requireText(databaseConnections, 'const CONNECTION_NAME_PATTERN = /^[a-z][\\w-]{0,63}$/i', 'database connection regex')
requireText(databaseConnections, 'export type ResolvedNfzDatabaseConnectionOptions =\n  |', 'database union line wrapping')
forbidText(databaseConnections, '[a-z0-9_]', 'database connection character class')

requireText(plugins, 'const moduleExtensionPattern = /\\.[cm]?[jt]sx?$/i', 'module extension regex')
requireText(plugins, '/^[a-z]:[\\\\/]/i.test(value)', 'Windows path regex')
requireText(plugins, '/^[a-z]:\\//i.test(normalizedValue)', 'normalized Windows path regex')
forbidText(plugins, '(?:[cm]?[jt]sx?)', 'unnecessary module extension group')
forbidText(plugins, '[A-Za-z]', 'case-sensitive Windows drive class')

requireText(
  serverOptions,
  'allowMissingDatabaseServices:\n      (server as any)?.allowMissingDatabaseServices',
  'server option line wrapping',
)

requireText(bootstrap, "message.includes('uses adapter \\'mongodb\\'')", 'bootstrap single-quoted Mongo diagnostic')
requireText(bootstrap, 'await Promise.resolve(item.handler(app))', 'bootstrap MaybePromise handling')
requireText(bootstrap, 'await configureFeathersRegistrar(\n      item,', 'registrar call line wrapping')
forbidText(bootstrap, 'await result', 'non-thenable bootstrap await')
forbidText(bootstrap, 'item => { currentRegistrar', 'bootstrap arrow parentheses')

requireText(
  databaseRegistryTest,
  ").rejects.toThrow('Required database connection \\'requiredFailure\\' failed')",
  'database registry test quotes',
)

requireText(databaseRegistry, "import type { Db } from 'mongodb'", 'database registry external type import order')
requireText(databaseRegistry, 'close(): Promise<void>', 'database handle method shorthand')
requireText(databaseRegistry, 'connectMongo?(\n    context:', 'optional connector method shorthand')
requireText(databaseRegistry, ':\\/\\/\\S+/gi', 'database URL redaction regex')
requireText(databaseRegistry, "if (handle.type === 'mongodb') {\n        result = await", 'connector branch indentation')
requireText(databaseRegistry, "app.set('mongodbConnection', mongoHandle.client)", 'legacy Mongo alias without assertion')
requireText(databaseRegistry, 'export async function getNfzMongoDatabase', 'async Mongo accessor')
requireText(databaseRegistry, 'export async function checkNfzDatabaseConnection', 'async database checker')
forbidText(databaseRegistry, 'mongoHandle.client as MongoClient', 'unnecessary Mongo client assertion')
forbidText(databaseRegistry, 'close: () => Promise', 'database registry function property signature')
forbidText(databaseRegistry, 'healthCheck: () => Promise', 'database health function property signature')

requireText(instanceRegistry, "replace(/[^\\w-]+/g", 'runtime failure id regex')
requireText(instanceRegistry, '{ unref?(): void }', 'timer method shorthand')
forbidText(instanceRegistry, '[a-z0-9_]', 'runtime failure id character class')

requireText(serverTypes, 'handler(app: any): unknown', 'registrar method shorthand')
requireText(serverTypes, 'createApp(nitroApp: any, config: any): Promise<any>', 'bootstrap createApp method shorthand')
requireText(serverTypes, 'createRouters(app: any): MaybePromise<void>', 'bootstrap router method shorthand')
forbidText(serverTypes, 'handler: (app: any)', 'server handler function property signature')

requireText(
  zodQueryTest,
  "import { zodQuerySyntax } from './query'\nimport { getZodValidator } from './validators'",
  'Zod test import order',
)
requireText(zodQueryTest, "describe('zod 3 Feathers query boundary'", 'lowercase Zod test title')

requireText(
  bootstrapTest,
  "return new Error('Service \\'messages\\' uses adapter \\'mongodb\\' but app.get(\\'mongodbClient\\') is not configured')",
  'bootstrap test single quotes',
)

requireText(
  publicCommandsTest,
  "expect(publicationGuard).toContain(`prepack: 'node scripts/check-prepack-ready.mjs'`)",
  'publication contract quote style',
)
forbidText(
  publicCommandsTest,
  'expect(publicationGuard).toContain("prepack:',
  'publication contract double-quoted lint regression',
)

requireText(
  starterAdminClient,
  "import type { ClientApplication } from 'nuxt-feathers-zod/client'\nimport { Forbidden } from '@feathersjs/errors'",
  'starter admin client import order',
)
requireText(starterAdminClient, 'const client: unknown = nuxtApp.$api', 'starter admin client normalized injection')
forbidText(starterAdminClient, 'const client = nuxtApp.$api', 'starter admin client unnormalized injection')
forbidText(
  starterAdminClient,
  'nuxtApp.$api as ClientApplication',
  'starter admin client unnecessary assertion',
)
requireText(authHook, 'return proceed()', 'authentication hook direct promise return')
forbidText(authHook, 'return await proceed()', 'authentication hook redundant await')
requireText(
  starterPublishedTypesTest,
  "expect(userSchema).toContain(`declare module '@feathersjs/feathers'`)",
  'published starter test quote style',
)
forbidText(
  starterPublishedTypesTest,
  'expect(userSchema).toContain("declare module',
  'published starter test double-quoted lint regression',
)

if (/\n\s*\}\)\n\n\}\)\s*$/.test(bootstrapTest))
  problems.push('bootstrap test: padded final describe block')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Release lint regression guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Release lint regressions are covered.')
