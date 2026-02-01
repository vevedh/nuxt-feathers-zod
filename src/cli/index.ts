import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { kebabCase, pascalCase } from 'change-case'
import consola from 'consola'

type Adapter = 'mongodb' | 'memory'
type MiddlewareTarget = 'nitro' | 'feathers'
type IdField = 'id' | '_id'
type CollectionName = string

export interface RunCliOptions {
  cwd: string
}

export async function runCli(argv: string[], opts: RunCliOptions) {
  const cwd = resolve(opts.cwd)

  const [cmd, subcmd, name, ...rest] = argv

  if (!cmd || cmd === '-h' || cmd === '--help') {
    printHelp()
    process.exit(0)
  }

  // Expected:
  // nuxt-feathers-zod add service <name> [...]
  // nuxt-feathers-zod add middleware <name> [...]
  if (cmd !== 'add') {
    consola.error(`Unknown command: ${cmd}`)
    printHelp()
    process.exit(1)
  }

  if (subcmd !== 'service' && subcmd !== 'custom-service' && subcmd !== 'middleware') {
    consola.error(`Unknown add target: ${subcmd ?? '(missing)'}`)
    printHelp()
    process.exit(1)
  }

  if (!name) {
    consola.error('Missing <name>.')
    printHelp()
    process.exit(1)
  }

  const flags = parseFlags(rest)

  if (subcmd === 'service') {
    const adapter = (flags.adapter as Adapter | undefined) ?? 'mongodb'
    const auth = Boolean(flags.auth)
    const idField = (flags.idField as IdField | undefined) ?? (adapter === 'mongodb' ? '_id' : 'id')
    const servicePath = typeof flags.path === 'string' ? String(flags.path) : undefined
    const collectionName = typeof flags.collection === 'string' ? String(flags.collection) : undefined
    const docs = Boolean(flags.docs)
    const dry = Boolean(flags.dry)
    const force = Boolean(flags.force)

    const projectRoot = await findProjectRoot(cwd)
    const servicesDirFlag = typeof flags.servicesDir === 'string' ? flags.servicesDir : undefined
    const servicesDir = resolve(projectRoot, servicesDirFlag ?? 'services')

    await generateService({
      projectRoot,
      servicesDir,
      name,
      adapter,
      auth,
      idField,
      servicePath,
      collectionName,
      docs,
      dry,
      force,
    })
    return
  }


  if (subcmd === 'custom-service') {
    const auth = Boolean(flags.auth)
    const servicePath = typeof flags.path === 'string' ? String(flags.path) : undefined
    const methods = typeof flags.methods === 'string' ? String(flags.methods) : undefined
    const customMethods = typeof flags.customMethods === 'string' ? String(flags.customMethods) : undefined
    const docs = Boolean(flags.docs)
    const dry = Boolean(flags.dry)
    const force = Boolean(flags.force)

    const projectRoot = await findProjectRoot(cwd)
    const servicesDirFlag = typeof flags.servicesDir === 'string' ? flags.servicesDir : undefined
    const servicesDir = resolve(projectRoot, servicesDirFlag ?? 'services')

    await generateCustomService({
      projectRoot,
      servicesDir,
      name,
      auth,
      servicePath,
      methods,
      customMethods,
      docs,
      dry,
      force,
    })
    return
  }

  if (subcmd === 'middleware') {
    const target = (flags.target as MiddlewareTarget | undefined) ?? 'nitro'
    const dry = Boolean(flags.dry)
    const force = Boolean(flags.force)

    const projectRoot = await findProjectRoot(cwd)

    await generateMiddleware({
      projectRoot,
      name,
      target,
      dry,
      force,
    })
  }
}

function printHelp() {
  // Keep output short; this is a CLI entrypoint.

  console.log(`\nnuxt-feathers-zod CLI\n\nUsage:\n  nuxt-feathers-zod add service <serviceName> [--adapter mongodb|memory] [--auth] [--idField id|_id] [--path <customPath>] [--collection <mongoCollection>] [--docs] [--servicesDir <dir>] [--dry] [--force]\n  nuxt-feathers-zod add custom-service <serviceName> [--methods <csv>] [--customMethods <csv>] [--auth] [--path <customPath>] [--docs] [--servicesDir <dir>] [--dry] [--force]\n  nuxt-feathers-zod add middleware <name> [--target nitro|feathers] [--dry] [--force]\n\nExamples:\n  bunx nuxt-feathers-zod add service posts --adapter mongodb --auth\n  bunx nuxt-feathers-zod add service users --adapter mongodb --idField _id --path accounts --docs\n  bunx nuxt-feathers-zod add service haproxy-domains --path haproxy/domains --collection haproxy-domains --auth --docs\n  bunx nuxt-feathers-zod add custom-service actions --methods find --customMethods run --auth\n  bunx nuxt-feathers-zod add middleware session\n  bunx nuxt-feathers-zod add middleware dummy --target feathers\n`)
}

function parseFlags(argv: string[]) {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a)
      continue
    if (!a.startsWith('--'))
      continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
      continue
    }
    out[key] = next
    i++
  }
  return out
}

async function findProjectRoot(start: string) {
  // Walk up until we find a package.json.
  let dir = resolve(start)
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, 'package.json')))
      return dir
    const parent = resolve(dir, '..')
    if (parent === dir)
      break
    dir = parent
  }
  throw new Error(`Could not find project root from ${start}`)
}

function singularize(input: string) {
  // Minimal heuristic (good enough for a DX helper; users can rename if needed)
  if (input.endsWith('ies'))
    return `${input.slice(0, -3)}y`
  if (input.endsWith('ses'))
    return input.slice(0, -2)
  if (input.endsWith('s') && input.length > 1)
    return input.slice(0, -1)
  return input
}

function normalizeServiceName(raw: string) {
  // Allow "posts", "haproxy-domains", "traefik_stacks" etc.
  return kebabCase(raw)
}

function normalizeServicePath(raw: string) {
  // Feathers service paths are usually kebab-case and can include slashes.
  // We keep user intent, but normalize leading/trailing slashes.
  const cleaned = String(raw).trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!cleaned)
    throw new Error('Invalid --path: path cannot be empty')
  return cleaned
}

function normalizeCollectionName(raw: string) {
  // MongoDB collection names are strings, but in practice should not include path separators.
  // We keep it permissive while preventing common foot-guns.
  const cleaned = String(raw).trim()
  if (!cleaned)
    throw new Error('Invalid --collection: collection name cannot be empty')
  if (cleaned.includes('/') || cleaned.includes('\\')) {
    throw new Error('Invalid --collection: collection name must not include \/ or \\')
  }
  if (cleaned.includes('\u0000')) {
    throw new Error('Invalid --collection: collection name must not include null characters')
  }
  return cleaned
}

function createServiceIds(serviceNameKebab: string) {
  const baseKebab = singularize(serviceNameKebab)
  const basePascal = pascalCase(baseKebab)
  const baseCamel = basePascal.charAt(0).toLowerCase() + basePascal.slice(1)

  return {
    serviceNameKebab,
    baseKebab,
    basePascal,
    baseCamel,
  }
}

interface GenerateServiceOptions {
  projectRoot: string
  servicesDir: string
  name: string
  adapter: Adapter
  auth: boolean
  idField: IdField
  servicePath?: string
  collectionName?: CollectionName
  docs: boolean
  dry: boolean
  force: boolean
}

export async function generateService(opts: GenerateServiceOptions) {
  const serviceNameKebab = normalizeServiceName(opts.name)
  const ids = createServiceIds(serviceNameKebab)

  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab)
  const collectionName = normalizeCollectionName(
    opts.collectionName
    ?? (servicePath.includes('/') ? serviceNameKebab : servicePath),
  )

  const dir = join(opts.servicesDir, serviceNameKebab)
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`)
  const classFile = join(dir, `${serviceNameKebab}.class.ts`)
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const files: Array<{ path: string, content: string }> = [
    { path: schemaFile, content: renderSchema(ids, opts.adapter, opts.idField) },
    { path: classFile, content: renderClass(ids, opts.adapter, collectionName) },
    { path: sharedFile, content: renderShared(ids, servicePath) },
    { path: serviceFile, content: renderService(ids, opts.auth, opts.docs) },
  ]

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force })
  }

  if (!opts.dry) {
    consola.success(`Generated service '${serviceNameKebab}' in ${relativeToCwd(dir)}`)
  }
}

async function ensureFeathersSwaggerSupport(projectRoot: string, io: { dry: boolean, force: boolean }) {
  // 1) Ensure TS sees `ServiceOptions.docs` (required for feathers-swagger in TS projects)
  const typesDir = join(projectRoot, 'types')
  const typesFile = join(typesDir, 'feathers-swagger.d.ts')
  const typesContent = `// Auto-generated by nuxt-feathers-zod CLI (required when using feathers-swagger in TypeScript)\n\nimport type { ServiceSwaggerOptions } from 'feathers-swagger'\n\ndeclare module '@feathersjs/feathers' {\n  interface ServiceOptions {\n    docs?: ServiceSwaggerOptions\n  }\n}\n`

  await ensureDir(typesDir, io.dry)
  await writeFileSafe(typesFile, typesContent, { dry: io.dry, force: io.force })

  // 2) Best-effort dependency hint (we do not auto-install dependencies)
  try {
    const pkgPath = join(projectRoot, 'package.json')
    if (!existsSync(pkgPath))
      return
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    if (!deps['feathers-swagger']) {
      consola.warn(
        `--docs was used but 'feathers-swagger' is not listed in package.json. Install it (and swagger UI deps if needed): bun add feathers-swagger swagger-ui-dist`,
      )
    }
  }
  catch (e) {
    // ignore
  }
}

interface GenerateMiddlewareOptions {
  projectRoot: string
  name: string
  target: MiddlewareTarget
  dry: boolean
  force: boolean
}

export 
interface GenerateCustomServiceOptions {
  projectRoot: string
  servicesDir: string
  name: string
  auth: boolean
  servicePath?: string
  /**
   * CSV list of standard Feathers methods to implement/register.
   * Default: "find"
   */
  methods?: string
  /**
   * CSV list of custom (RPC-like) methods to expose (e.g. "run").
   * Default: "run"
   */
  customMethods?: string
  docs: boolean
  dry: boolean
  force: boolean
}

export async function generateCustomService(opts: GenerateCustomServiceOptions) {
  const serviceNameKebab = normalizeServiceName(opts.name)
  const ids = createServiceIds(serviceNameKebab)

  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab)

  const stdMethods = parseCsvMethods(opts.methods ?? 'find')
  const customMethods = parseCsvMethods(opts.customMethods ?? 'run').filter(m => !STD_SERVICE_METHODS.has(m))

  // Always ensure at least one method is registered (Feathers requirement)
  if (stdMethods.length === 0 && customMethods.length === 0) {
    throw new Error('Custom service must register at least one method. Use --methods and/or --customMethods.')
  }

  // Ensure "find" exists if user did not provide any standard methods (helps with SSR-safe registration)
  if (stdMethods.length === 0)
    stdMethods.push('find')

  const dir = join(opts.servicesDir, serviceNameKebab)
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`)
  const classFile = join(dir, `${serviceNameKebab}.class.ts`)
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const files: Array<{ path: string, content: string }> = [
    { path: schemaFile, content: renderCustomSchema(ids, stdMethods, customMethods) },
    { path: classFile, content: renderCustomClass(ids, stdMethods, customMethods) },
    { path: sharedFile, content: renderCustomShared(ids, servicePath, stdMethods, customMethods) },
    { path: serviceFile, content: renderCustomService(ids, servicePath, stdMethods, customMethods, opts.auth, opts.docs) },
  ]

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force })
  }

  if (!opts.dry) {
    consola.success(`Generated custom service '${serviceNameKebab}' in ${dir}`)
  }
}

const STD_SERVICE_METHODS = new Set([
  'find',
  'get',
  'create',
  'update',
  'patch',
  'remove',
])

function parseCsvMethods(value: string) {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function uniq(arr: string[]) {
  return [...new Set(arr)]
}

function isValidIdentifier(name: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

function safeMethodName(name: string) {
  // custom methods should still be valid JS identifiers
  return isValidIdentifier(name) ? name : kebabCase(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}


async function generateMiddleware(opts: GenerateMiddlewareOptions) {
  const fileBase = kebabCase(opts.name)

  if (opts.target === 'nitro') {
    const dir = join(opts.projectRoot, 'server', 'middleware')
    const file = join(dir, `${fileBase}.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderNitroMiddleware(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Nitro middleware '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  // feathers target: generate a server plugin under server/feathers
  const dir = join(opts.projectRoot, 'server', 'feathers')
  const file = join(dir, `${fileBase}.ts`)
  await ensureDir(dir, opts.dry)
  await writeFileSafe(file, renderFeathersPlugin(fileBase), { dry: opts.dry, force: opts.force })
  if (!opts.dry)
    consola.success(`Generated Feathers server plugin '${fileBase}' in ${relativeToCwd(file)}`)
}

async function ensureDir(dir: string, dry: boolean) {
  if (dry)
    return
  await mkdir(dir, { recursive: true })
}

async function writeFileSafe(path: string, content: string, opts: { dry: boolean, force: boolean }) {
  if (!opts.force && existsSync(path)) {
    throw new Error(`File already exists: ${path} (use --force to overwrite)`)
  }

  if (opts.dry) {
    consola.info(`[dry] write ${relativeToCwd(path)}`)
    return
  }

  await writeFile(path, content, 'utf8')
}

function relativeToCwd(p: string) {
  try {
    return p.replace(`${resolve(process.cwd())}/`, '')
  }
  catch (e) {
    return p
  }
}

function renderSchema(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, idField: IdField) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const idSchemaField = idField
  const idSchema = adapter === 'mongodb'
    ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
`
    : ''

  const mainSchema = adapter === 'mongodb'
    ? `export const ${base}Schema = z.object({
  ${idSchemaField}: objectIdSchema(),
  text: z.string(),
})`
    : `export const ${base}Schema = z.object({
  ${idSchemaField}: z.number().int(),
  text: z.string(),
})`

  const pickCreate = adapter === 'mongodb'
    ? `{ text: true }`
    : `{ text: true }`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
${idSchema}

// Main data model schema
${mainSchema}
export type ${Base} = z.infer<typeof ${base}Schema>
export const ${base}Validator = getZodValidator(${base}Schema, { kind: 'data' })
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})

export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = ${base}Schema.pick(${pickCreate})
export type ${Base}Data = z.infer<typeof ${base}DataSchema>
export const ${base}DataValidator = getZodValidator(${base}DataSchema, { kind: 'data' })
export const ${base}DataResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for updating existing entries
export const ${base}PatchSchema = ${base}Schema.partial()
export type ${Base}Patch = z.infer<typeof ${base}PatchSchema>
export const ${base}PatchValidator = getZodValidator(${base}PatchSchema, { kind: 'data' })
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for allowed query properties
export const ${base}QuerySchema = zodQuerySyntax(${base}Schema)
export type ${Base}Query = z.infer<typeof ${base}QuerySchema>
export const ${base}QueryValidator = getZodValidator(${base}QuerySchema, { kind: 'query' })
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({})
`
}

function renderClass(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, collectionName: string) {
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const paramsName = `${Base}Params`

  if (adapter === 'memory') {
    return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services

import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MemoryService } from '@feathersjs/memory'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends Params<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MemoryService<
  ${Base},
  ${Base}Data
> {}

export function getOptions(app: Application): MemoryServiceOptions<${Base}> {
  return {
    multi: true,
  }
}
`
  }

  // mongodb
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends MongoDBAdapterParams<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MongoDBService<
  ${Base},
  ${Base}Data,
  ${paramsName},
  ${Base}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient')
  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('${collectionName}')),
  }
}
`
}

function renderShared(ids: ReturnType<typeof createServiceIds>, servicePath: string) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const methodsConst = `${base}Methods`
  const pathConst = `${base}Path`
  const clientFn = `${base}Client`
  const clientServiceType = `${Base}ClientService`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html

import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query, ${serviceClass} } from './${serviceName}.class'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export type ${clientServiceType} = Pick<${serviceClass}<Params<${Base}Query>>, (typeof ${methodsConst})[number]>

export const ${pathConst} = '${servicePath}'

export const ${methodsConst}: Array<keyof ${serviceClass}> = ['find', 'get', 'create', 'patch', 'remove']

export function ${clientFn}(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(${pathConst}, connection.service(${pathConst}), {
    methods: ${methodsConst},
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${pathConst}]: ${clientServiceType}
  }
}
`
}

function renderService(ids: ReturnType<typeof createServiceIds>, auth: boolean, docs: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const authImports = auth ? 'import { authenticate } from \'@feathersjs/authentication\'\n' : ''

  const swaggerImports = ''

  const swaggerSchemaImports = ''
  const docsBlock = docs
    ? `
    docs: {
      description: '${Base} service',
      idType: 'string',
${auth
  ? `      securities: ${base}Methods,
`
  : ''}      definitions: {
        ${base}: { type: 'object', properties: {} },
        ${base}Data: { type: 'object', properties: {} },
        ${base}Patch: { type: 'object', properties: {} },
        ${base}Query: {
          type: 'object',
          properties: {
            $limit: { type: 'number' },
            $skip: { type: 'number' },
            $sort: { type: 'object', additionalProperties: { type: 'number' } },
          },
        },
      },
    },
`
    : ''

  const authAround = auth
    ? `
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
`
    : `
      find: [],
      get: [],
      create: [],
      patch: [],
      remove: [],
`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${swaggerImports}import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, ${serviceClass} } from './${serviceName}.class'
import {
${swaggerSchemaImports}  ${base}DataResolver,
  ${base}DataValidator,
  ${base}ExternalResolver,
  ${base}PatchResolver,
  ${base}PatchValidator,
  ${base}QueryResolver,
  ${base}QueryValidator,
  ${base}Resolver,
} from './${serviceName}.schema'
import { ${base}Methods, ${base}Path } from './${serviceName}.shared'

export * from './${serviceName}.class'
export * from './${serviceName}.schema'

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(getOptions(app)), {
    methods: ${base}Methods,
    events: [],${docsBlock}
  })

  app.service(${base}Path).hooks({
    around: {
      all: [schemaHooks.resolveExternal(${base}ExternalResolver), schemaHooks.resolveResult(${base}Resolver)],
${authAround}    },
    before: {
      all: [schemaHooks.validateQuery(${base}QueryValidator), schemaHooks.resolveQuery(${base}QueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(${base}DataValidator), schemaHooks.resolveData(${base}DataResolver)],
      patch: [schemaHooks.validateData(${base}PatchValidator), schemaHooks.resolveData(${base}PatchResolver)],
      remove: [],
    },
    after: {
      all: [],
    },
    error: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`
}


function renderCustomSchema(
  ids: ReturnType<typeof createServiceIds>,
  stdMethods: string[],
  customMethods: string[],
) {
  const Base = ids.basePascal
  const base = ids.baseCamel

  const customSchemas = customMethods.map((m) => {
    const M = pascalCase(m)
    if (m === 'run') {
      return `
export const ${base}${M}DataSchema = z.object({
  action: z.string().min(1),
  payload: z.unknown().optional(),
})
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.object({
  acknowledged: z.boolean(),
  action: z.string(),
  received: z.unknown().optional(),
})
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`
    }
    return `
export const ${base}${M}DataSchema = z.unknown()
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.unknown()
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`
  }).join('\n')

  return `// ! Generated by nuxt-feathers-zod - custom service template
import { z } from 'zod'

${customSchemas}
`
}

function renderCustomClass(
  ids: ReturnType<typeof createServiceIds>,
  stdMethods: string[],
  customMethods: string[],
) {
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const stdImpl = uniq(stdMethods).map((m) => {
    if (m === 'find') {
      return `
  async find(_params?: Params) {
    return [{ ok: true, source: '${ids.serviceNameKebab}.${m}' }]
  }`
    }
    if (m === 'get') {
      return `
  async get(id: Id, _params?: Params) {
    return { id, ok: true, source: '${ids.serviceNameKebab}.${m}' }
  }`
    }
    if (m === 'create') {
      return `
  async create(data: any, _params?: Params) {
    return { ok: true, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
    }
    if (m === 'patch') {
      return `
  async patch(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
    }
    if (m === 'remove') {
      return `
  async remove(id: NullableId, _params?: Params) {
    return { ok: true, id, source: '${ids.serviceNameKebab}.${m}' }
  }`
    }
    if (m === 'update') {
      return `
  async update(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
    }
    // fallback stub
    return `
  async ${m}(..._args: any[]) {
    throw new Error('${ids.serviceNameKebab}.${m} not implemented')
  }`
  }).join('\n')

  const customImpl = uniq(customMethods).map((m) => {
    const M = pascalCase(m)
    const DataT = `${Base}${M}Data`
    const ResT = `${Base}${M}Result`

    if (m === 'run') {
      return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return {
      acknowledged: true,
      action: data.action,
      received: data.payload,
    }
  }`
    }

    return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return data as any
  }`
  }).join('\n')

  const schemaImports = uniq(customMethods).map((m) => {
    const M = pascalCase(m)
    return `type ${Base}${M}Data, type ${Base}${M}Result`
  })

  const schemaImportLine = schemaImports.length
    ? `import { ${schemaImports.join(', ')} } from './${ids.serviceNameKebab}.schema'`
    : ''

  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Id, NullableId, Params } from '@feathersjs/feathers'
import type { Application } from 'nuxt-feathers-zod/server'
${schemaImportLine}

export class ${serviceClass} {
  constructor(public app: Application) {}

${stdImpl}

${customImpl}
}
`
}

function renderCustomShared(
  ids: ReturnType<typeof createServiceIds>,
  servicePath: string,
  stdMethods: string[],
  customMethods: string[],
) {
  const Base = ids.basePascal
  const base = ids.baseCamel
  const serviceName = ids.serviceNameKebab

  const stdList = uniq(stdMethods)
  const customList = uniq(customMethods)

  const allClientMethods = uniq([...stdList, ...customList])

  const schemaImports = customList.map((m) => {
    const M = pascalCase(m)
    return `type ${Base}${M}Data, type ${Base}${M}Result`
  })
  const schemaImportLine = schemaImports.length
    ? `import { ${schemaImports.join(', ')} } from './${serviceName}.schema'`
    : ''

  const patches = customList.map((m) => {
    const M = pascalCase(m)
    const DataT = `${Base}${M}Data`
    const ResT = `${Base}${M}Result`
    return `
function attach_${m}(client: ClientApplication, remote: any) {
  if (typeof remote?.${m} === 'function')
    return

  // 1) REST transport
  if (typeof remote?.request === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.request({ method: '${m}', body: data }, params)
    return
  }

  // 2) Socket transport (best-effort)
  if (typeof remote?.send === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.send('${m}', data, params)
    return
  }

  // 3) Universal HTTP fallback
  remote.${m} = async (data: ${DataT}, params?: Params): Promise<${ResT}> => {
    const cfg: any = useRuntimeConfig()
    const pub = cfg.public?.feathers ?? {}

    const baseURL = pub.restUrl ?? pub.baseURL ?? pub.url ?? ''
    const prefix
      = pub.rest?.path
      ?? pub.restPath
      ?? pub.prefix
      ?? '/feathers'

    const url = joinURL(baseURL, prefix, '${servicePath}', '${m}')

    const headers: Record<string, string> = {}
    const auth = (params as any)?.headers?.authorization || (params as any)?.headers?.Authorization
    if (auth)
      headers.authorization = auth

    return await $fetch<${ResT}>(url, { method: 'POST', body: data, headers })
  }
}
`
  }).join('\n')

  const attachCalls = customList.map(m => `    attach_${m}(client, remote)`).join('\n')

  const ssrMethodsList = JSON.stringify(stdList.length ? stdList : ['find'])

  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { RestService } from '@feathersjs/rest-client'
import { joinURL } from 'ufo'
${schemaImportLine}

export const ${base}Path = '${servicePath}'
export const ${base}Methods = ${JSON.stringify(allClientMethods)} as const

export type ${Base}ClientService = RestService & {
${customList.map((m) => {
    const M = pascalCase(m)
    return `  ${m}(data: ${Base}${M}Data, params?: Params): Promise<${Base}${M}Result>`
  }).join('\n')}
}

${patches}

export function ${base}Client(client: ClientApplication) {
  const connection: any = client.get('connection')
  const remote: any = connection.service(${base}Path)

  // SSR-safe: register only standard methods on server
  if (import.meta.server) {
    client.use(${base}Path, remote, { methods: ${ssrMethodsList} })
    return
  }

${attachCalls}

  client.use(${base}Path, remote, { methods: ${JSON.stringify(allClientMethods)} })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${base}Path]: ${Base}ClientService
  }
}
`
}

function renderCustomService(
  ids: ReturnType<typeof createServiceIds>,
  servicePath: string,
  stdMethods: string[],
  customMethods: string[],
  auth: boolean,
  docs: boolean,
) {
  const Base = ids.basePascal
  const base = ids.baseCamel
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`

  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''

  const allMethods = uniq([...stdMethods, ...customMethods])
  const methodsConst = `${base}Methods`

  const hookBefore = auth
    ? `      all: [authenticate('jwt')],\n`
    : ''

  const schemaHookImports = customMethods.length
    ? "import { schemaHooks } from '@feathersjs/schema'\n"
    : ''

  const schemaImports = customMethods.map((m) => {
    const M = pascalCase(m)
    return `${base}${M}DataSchema, ${base}${M}ResultSchema`
  }).join(', ')

  const customHookBlocks = customMethods.map((m) => {
    const M = pascalCase(m)
    return `      ${m}: [
        schemaHooks.validateData(${base}${M}DataSchema),
        schemaHooks.resolveData(async (ctx) => ctx),
      ],`
  }).join('\n')

  // custom result validation is applied as around hooks (required pattern)
  const customAroundBlocks = customMethods.map((m) => {
    const M = pascalCase(m)
    return `      ${m}: [
        async (context) => {
          ${base}${M}ResultSchema.parse(context.result)
          return context
        },
      ],`
  }).join('\n')

  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${schemaHookImports}import { ${serviceClass} } from './${serviceName}.class'
${customMethods.length ? `import { ${schemaImports} } from './${serviceName}.schema'\n` : ''}

export const ${base}Path = '${servicePath}'
export const ${methodsConst} = ${JSON.stringify(allMethods)} as const

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(app), {
    methods: ${methodsConst} as unknown as string[],
    events: [],
  })

  app.service(${base}Path).hooks({
    around: {
      all: [],
      ${customMethods.length ? customAroundBlocks : ''}
    },
    before: {
${hookBefore}${customMethods.length ? customHookBlocks : ''}
    },
    after: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`
}

function renderNitroMiddleware(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Nitro middleware: ${nice}
// Runs on every request (or conditionally based on route rules).

export default defineEventHandler(async (event) => {
  // Example: attach a request id
  // event.context.requestId = crypto.randomUUID()
})
`
}

function renderFeathersPlugin(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Feathers server plugin: ${nice}
// Loaded by Nuxt Nitro server (see playground/server/feathers/*.ts for examples)

import type { HookContext, NextFunction } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context: HookContext, next: NextFunction) => {
        // Place initialization logic here
        await next()
      },
    ],
  })
})
`
}
