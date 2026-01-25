import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { kebabCase, pascalCase } from 'change-case'
import consola from 'consola'

type Adapter = 'mongodb' | 'memory'
type MiddlewareTarget = 'nitro' | 'feathers'

export type RunCliOptions = {
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

  if (subcmd !== 'service' && subcmd !== 'middleware') {
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
    const dry = Boolean(flags.dry)
    const force = Boolean(flags.force)

    const projectRoot = await findProjectRoot(cwd)
    const servicesDir = resolve(projectRoot, flags.servicesDir ?? 'services')

    await generateService({
      projectRoot,
      servicesDir,
      name,
      adapter,
      auth,
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
  // eslint-disable-next-line no-console
  console.log(`\nnuxt-feathers-zod CLI\n\nUsage:\n  nuxt-feathers-zod add service <serviceName> [--adapter mongodb|memory] [--auth] [--servicesDir <dir>] [--dry] [--force]\n  nuxt-feathers-zod add middleware <name> [--target nitro|feathers] [--dry] [--force]\n\nExamples:\n  bunx nuxt-feathers-zod add service posts --adapter mongodb --auth\n  bunx nuxt-feathers-zod add middleware session\n  bunx nuxt-feathers-zod add middleware dummy --target feathers\n`)
}

function parseFlags(argv: string[]) {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue
    if (!a.startsWith('--')) continue
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
    if (existsSync(join(dir, 'package.json'))) return dir
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`Could not find project root from ${start}`)
}

function singularize(input: string) {
  // Minimal heuristic (good enough for a DX helper; users can rename if needed)
  if (input.endsWith('ies')) return `${input.slice(0, -3)}y`
  if (input.endsWith('ses')) return input.slice(0, -2)
  if (input.endsWith('s') && input.length > 1) return input.slice(0, -1)
  return input
}

function normalizeServiceName(raw: string) {
  // Allow "posts", "haproxy-domains", "traefik_stacks" etc.
  return kebabCase(raw)
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

type GenerateServiceOptions = {
  projectRoot: string
  servicesDir: string
  name: string
  adapter: Adapter
  auth: boolean
  dry: boolean
  force: boolean
}

export async function generateService(opts: GenerateServiceOptions) {
  const serviceNameKebab = normalizeServiceName(opts.name)
  const ids = createServiceIds(serviceNameKebab)

  const dir = join(opts.servicesDir, serviceNameKebab)
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`)
  const classFile = join(dir, `${serviceNameKebab}.class.ts`)
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const files: Array<{ path: string; content: string }> = [
    { path: schemaFile, content: renderSchema(ids, opts.adapter) },
    { path: classFile, content: renderClass(ids, opts.adapter) },
    { path: sharedFile, content: renderShared(ids) },
    { path: serviceFile, content: renderService(ids, opts.auth) },
  ]

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (!opts.dry) {
    consola.success(`Generated service '${serviceNameKebab}' in ${relativeToCwd(dir)}`)
  }
}

type GenerateMiddlewareOptions = {
  projectRoot: string
  name: string
  target: MiddlewareTarget
  dry: boolean
  force: boolean
}

export async function generateMiddleware(opts: GenerateMiddlewareOptions) {
  const fileBase = kebabCase(opts.name)

  if (opts.target === 'nitro') {
    const dir = join(opts.projectRoot, 'server', 'middleware')
    const file = join(dir, `${fileBase}.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderNitroMiddleware(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry) consola.success(`Generated Nitro middleware '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  // feathers target: generate a server plugin under server/feathers
  const dir = join(opts.projectRoot, 'server', 'feathers')
  const file = join(dir, `${fileBase}.ts`)
  await ensureDir(dir, opts.dry)
  await writeFileSafe(file, renderFeathersPlugin(fileBase), { dry: opts.dry, force: opts.force })
  if (!opts.dry) consola.success(`Generated Feathers server plugin '${fileBase}' in ${relativeToCwd(file)}`)
}

async function ensureDir(dir: string, dry: boolean) {
  if (dry) return
  await mkdir(dir, { recursive: true })
}

async function writeFileSafe(path: string, content: string, opts: { dry: boolean; force: boolean }) {
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
    return p.replace(resolve(process.cwd()) + '/', '')
  }
  catch {
    return p
  }
}

function renderSchema(ids: ReturnType<typeof createServiceIds>, adapter: Adapter) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const idField = adapter === 'mongodb' ? '_id' : 'id'
  const idSchema = adapter === 'mongodb'
    ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
`
    : ''

  const mainSchema = adapter === 'mongodb'
    ? `export const ${base}Schema = z.object({
  ${idField}: objectIdSchema(),
  text: z.string(),
})`
    : `export const ${base}Schema = z.object({
  ${idField}: z.number().int(),
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

function renderClass(ids: ReturnType<typeof createServiceIds>, adapter: Adapter) {
  const base = ids.baseCamel
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
    Model: mongoClient.then(db => db.collection('${serviceName}')),
  }
}
`
}

function renderShared(ids: ReturnType<typeof createServiceIds>) {
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

export const ${pathConst} = '${serviceName}'

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

function renderService(ids: ReturnType<typeof createServiceIds>, auth: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''

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
${authImports}import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, ${serviceClass} } from './${serviceName}.class'
import {
  ${base}DataResolver,
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
    events: [],
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
