export type BuilderSchemaMode = 'zod' | 'json' | 'typebox' | 'none'
export type BuilderFieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any'
export type BuilderHookPreset = 'standard' | 'action' | 'custom'
export type BuilderHooksFileMode = 'inline' | 'separate'
export type BuilderBarrelMode = 'none' | 'service' | 'service+root'
export type BuilderServiceOriginKind = 'draft' | 'demo' | 'scanned'
export type BuilderServiceProfile = 'mongoCrud' | 'mongoAuth' | 'memoryCrud' | 'actionCustom' | 'customService'

export type BuilderField = {
  id: string
  name: string
  type: BuilderFieldType
  required: boolean
  nullable: boolean
  defaultValue?: string
  description?: string
}

export type BuilderServiceManifest = {
  id: string
  name: string
  path: string
  collection: string
  adapter: 'mongodb' | 'memory' | 'custom'
  schemaMode: BuilderSchemaMode
  auth: boolean
  docs: boolean
  hookPreset: BuilderHookPreset
  methods: string[]
  customMethods: string[]
  idField: string
  fields: BuilderField[]
  customCode: string
  hooksFileMode: BuilderHooksFileMode
  barrelMode: BuilderBarrelMode
  starterId?: string
  originKind?: BuilderServiceOriginKind
  notes?: string
  updatedAt: string
}

function uid() {
  try {
    return crypto.randomUUID()
  }
  catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function createField(partial: Partial<BuilderField> = {}): BuilderField {
  return {
    id: partial.id || uid(),
    name: partial.name || 'title',
    type: partial.type || 'string',
    required: partial.required ?? true,
    nullable: partial.nullable ?? false,
    defaultValue: partial.defaultValue || '',
    description: partial.description || '',
  }
}

export function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'service'
}

export function capitalize(value: string) {
  return String(value || '')
    .replace(/(^|[-_\s]+)(\w)/g, (_match, _prefix, char) => String(char).toUpperCase())
}

export function toIdentifier(value: string, fallback = 'service') {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9_$]+/g, ' ')
    .trim()

  if (!cleaned) return fallback

  const camel = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase()
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')

  if (!camel) return fallback
  return /^[0-9]/.test(camel) ? `_${camel}` : camel
}

export function toPascalCase(value: string, fallback = 'Service') {
  const identifier = toIdentifier(value, fallback)
  return identifier.charAt(0).toUpperCase() + identifier.slice(1)
}

function singularizeToken(value: string) {
  const token = String(value || '').trim()
  if (!token) return 'item'
  const lower = token.toLowerCase()
  if (lower.endsWith('ies') && token.length > 3) return `${token.slice(0, -3)}y`
  if (/(sses|shes|ches|xes|zes)$/i.test(token)) return token.slice(0, -2)
  if (lower.endsWith('s') && !lower.endsWith('ss') && token.length > 1) return token.slice(0, -1)
  return token
}

function singularizeSlug(value: string) {
  const parts = slugify(value).split('-').filter(Boolean)
  if (!parts.length) return 'service'
  if (parts.length === 1) return singularizeToken(parts[0] || '')
  return [...parts.slice(0, -1), singularizeToken(parts.at(-1) || 'item')].join('-')
}

function isCollectionLikeService(service: Partial<BuilderServiceManifest> | string) {
  if (typeof service === 'string') return true
  const methods = Array.isArray(service.methods) ? service.methods.map(method => String(method)) : []
  return ['find', 'get', 'patch', 'remove', 'update'].some(method => methods.includes(method))
}

export function inferServiceProfile(service: Partial<BuilderServiceManifest>): BuilderServiceProfile {
  const adapter = service.adapter || 'mongodb'
  const auth = Boolean(service.auth)
  const hookPreset = service.hookPreset || defaultHookPreset(service)
  const methods = Array.isArray(service.methods)
    ? service.methods.map(method => String(method).trim()).filter(Boolean)
    : []
  const collectionLike = methods.length
    ? ['find', 'get', 'patch', 'remove', 'update'].some(method => methods.includes(method))
    : adapter !== 'custom'

  if (adapter === 'memory') return 'memoryCrud'
  if (adapter === 'mongodb' && auth) return 'mongoAuth'
  if (adapter === 'mongodb' && collectionLike) return 'mongoCrud'
  if (hookPreset === 'action' || (!collectionLike && methods.length <= 2)) return 'actionCustom'
  return 'customService'
}

export function getServiceProfileMeta(service: Partial<BuilderServiceManifest>) {
  const profile = inferServiceProfile(service)
  switch (profile) {
    case 'mongoAuth':
      return {
        profile,
        label: 'Mongo sécurisé',
        hint: 'CRUD MongoDB avec auth JWT et hooks standards NFZ.',
      }
    case 'memoryCrud':
      return {
        profile,
        label: 'Memory CRUD',
        hint: 'Service mémoire pour tests, prototypage ou données éphémères.',
      }
    case 'actionCustom':
      return {
        profile,
        label: 'Action custom',
        hint: 'Service orienté action/méthodes custom avec normalisation d’erreurs.',
      }
    case 'customService':
      return {
        profile,
        label: 'Custom service',
        hint: 'Service custom non CRUD, à compléter avec tes méthodes métier.',
      }
    default:
      return {
        profile,
        label: 'Mongo CRUD',
        hint: 'CRUD MongoDB standard aligné avec les patterns NFZ scannés.',
      }
  }
}

function defaultHookPreset(partial: Partial<BuilderServiceManifest> = {}): BuilderHookPreset {
  if (partial.hookPreset) return partial.hookPreset
  const methods = Array.isArray(partial.methods)
    ? partial.methods.map(method => String(method).trim()).filter(Boolean)
    : []
  const collectionLike = methods.length
    ? ['find', 'get', 'patch', 'remove', 'update'].some(method => methods.includes(method))
    : partial.adapter !== 'custom'
  if (!collectionLike || (methods.length === 1 && methods[0] === 'create')) return 'action'
  return 'standard'
}

export function getServiceFsName(service: Partial<BuilderServiceManifest> | string) {
  const raw = typeof service === 'string'
    ? service
    : service.name || service.path || service.collection || 'service'
  return slugify(raw)
}

export function getServiceSymbolBase(service: Partial<BuilderServiceManifest> | string) {
  const fsName = getServiceFsName(service)
  if (!fsName.includes('-')) return toIdentifier(singularizeSlug(fsName), 'service')
  return toIdentifier(fsName, 'service')
}

function getSchemaSymbolBase(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const preferred = isCollectionLikeService(service) ? singularizeSlug(fsName) : fsName
  return toIdentifier(preferred, 'service')
}

function getEntityTypeName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const preferred = isCollectionLikeService(service) ? singularizeSlug(fsName) : fsName
  return toPascalCase(preferred, 'Service')
}

function getServiceRegistrationName(service: BuilderServiceManifest) {
  return toIdentifier(singularizeSlug(getServiceFsName(service)), 'service')
}

export function createService(partial: Partial<BuilderServiceManifest> = {}): BuilderServiceManifest {
  const basePath = partial.path || slugify(partial.name || 'articles')
  return {
    id: partial.id || uid(),
    name: partial.name || 'articles',
    path: basePath,
    collection: partial.collection || basePath,
    adapter: partial.adapter || 'mongodb',
    schemaMode: partial.schemaMode || 'zod',
    auth: partial.auth ?? false,
    docs: partial.docs ?? true,
    hookPreset: defaultHookPreset(partial),
    methods: Array.isArray(partial.methods) && partial.methods.length
      ? [...new Set(partial.methods.filter(Boolean).map(method => String(method).trim()))]
      : ['find', 'get', 'create', 'patch', 'remove'],
    customMethods: Array.isArray(partial.customMethods) && partial.customMethods.length
      ? [...new Set(partial.customMethods.filter(Boolean).map(method => String(method).trim()))]
      : (Array.isArray(partial.methods)
          ? [...new Set(partial.methods.filter(method => !['find', 'get', 'create', 'update', 'patch', 'remove'].includes(String(method))))]
          : []),
    idField: partial.idField || ((partial.adapter || 'mongodb') === 'mongodb' ? '_id' : 'id'),
    fields: Array.isArray(partial.fields) && partial.fields.length
      ? partial.fields.map(field => createField(field))
      : [
          createField({ name: 'title', type: 'string' }),
          createField({ name: 'published', type: 'boolean', required: false, defaultValue: 'false' }),
        ],
    customCode: partial.customCode || `// hooks / resolvers / custom behaviour\nexport const beforeCreate = async (context) => {\n  return context\n}\n`,
    hooksFileMode: partial.hooksFileMode || 'inline',
    barrelMode: partial.barrelMode || 'none',
    starterId: partial.starterId || '',
    originKind: partial.originKind || 'draft',
    notes: partial.notes || '',
    updatedAt: partial.updatedAt || new Date().toISOString(),
  }
}

export function normalizeManifest(input: unknown): BuilderServiceManifest[] {
  if (!Array.isArray(input) || !input.length) return [createService()]
  return input.map(item => createService(item as Partial<BuilderServiceManifest>))
}

export function mapFieldType(field: BuilderField, mode: BuilderSchemaMode) {
  const required = field.required ? '' : '.optional()'
  const nullable = field.nullable ? '.nullable()' : ''
  switch (mode) {
    case 'zod': {
      const base: Record<BuilderFieldType, string> = {
        string: 'z.string()',
        number: 'z.number()',
        boolean: 'z.boolean()',
        date: 'z.coerce.date()',
        array: 'z.array(z.any())',
        object: 'z.record(z.any())',
        any: 'z.any()',
      }
      return `${base[field.type]}${nullable}${required}`
    }
    case 'typebox': {
      const base: Record<BuilderFieldType, string> = {
        string: 'Type.String()',
        number: 'Type.Number()',
        boolean: 'Type.Boolean()',
        date: "Type.String({ format: 'date-time' })",
        array: 'Type.Array(Type.Any())',
        object: 'Type.Record(Type.String(), Type.Any())',
        any: 'Type.Any()',
      }
      return field.required ? base[field.type] : `Type.Optional(${base[field.type]})`
    }
    case 'json': {
      const base: Record<BuilderFieldType, string> = {
        string: "{ type: 'string' }",
        number: "{ type: 'number' }",
        boolean: "{ type: 'boolean' }",
        date: "{ type: 'string', format: 'date-time' }",
        array: "{ type: 'array', items: {} }",
        object: "{ type: 'object', additionalProperties: true }",
        any: '{}',
      }
      return base[field.type]
    }
    default:
      return '// no schema mode'
  }
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && String(value).trim())).map(value => String(value).trim()))]
}

function getEntityName(service: BuilderServiceManifest) {
  return getEntityTypeName(service)
}

function getServiceClassName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const classBase = !fsName.includes('-') ? singularizeSlug(fsName) : fsName
  return `${toPascalCase(classBase, 'Service')}Service`
}

function getServiceRegisterName(service: BuilderServiceManifest) {
  return getServiceRegistrationName(service)
}

function getSchemaFileName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return `./${fsName}.schema`
}

function getClassFileName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return `./${fsName}.class`
}

function getSharedFileName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return `./${fsName}.shared`
}

function getHooksFileName(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return `./${fsName}.hooks`
}

function getIndexFileName() {
  return './index'
}

function isUsersAuthService(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return service.starterId === 'users' || fsName === 'users' || service.path === 'users'
}

function getIdKeys(service: BuilderServiceManifest) {
  return uniqueStrings(['_id', 'id', service.idField])
}

function renderZodField(field: BuilderField) {
  const base = mapFieldType(field, 'zod')
  const comment = field.description?.trim() ? ` // ${field.description.trim()}` : ''
  return `  ${JSON.stringify(field.name)}: ${base},${comment}`
}

function renderSchemaMetadata(service: BuilderServiceManifest) {
  const symbolBase = getSchemaSymbolBase(service)
  const fields = service.fields
    .map(field => `  ${JSON.stringify(field.name)}: ${mapFieldType(field, service.schemaMode)},`)
    .join('\n')

  if (service.schemaMode === 'zod') return ''

  if (service.schemaMode === 'typebox') {
    return `\n// Mode demandé: TypeBox. Le service reste exécutable en NFZ avec des validateurs Zod.\nexport const ${symbolBase}TypeboxSchema = {\n${fields || '  // ajoute tes champs ici'}\n}\n`
  }

  if (service.schemaMode === 'json') {
    const required = service.fields.filter(field => field.required).map(field => JSON.stringify(field.name)).join(', ')
    return `\n// Mode demandé: JSON Schema. Le service reste exécutable en NFZ avec des validateurs Zod.\nexport const ${symbolBase}JsonSchema = {\n  type: 'object',\n  properties: {\n${fields || '    // ajoute tes champs ici'}\n  },\n  required: [${required}],\n}\n`
  }

  return `\n// Mode demandé: none. Les validateurs ci-dessous restent permissifs pour garder un service directement exécutable.\nexport const ${symbolBase}SchemaMode = 'none' as const\n`
}

function renderQueryField(field: BuilderField) {
  if (field.type === 'array') return `  ${JSON.stringify(field.name)}: z.union([z.array(z.any()), z.any()]).optional(),`
  if (field.type === 'object') return `  ${JSON.stringify(field.name)}: z.record(z.any()).optional(),`
  return `  ${JSON.stringify(field.name)}: z.any().optional(),`
}

function renderResolverAssignments(service: BuilderServiceManifest, mode: 'data' | 'patch') {
  const lines: string[] = []
  if (isUsersAuthService(service) && service.fields.some(field => field.name === 'password')) {
    lines.push("  password: passwordHash({ strategy: 'local' }),")
  }
  if (service.fields.some(field => field.name === 'createdAt') && mode === 'data') {
    lines.push('  createdAt: async () => new Date(),')
  }
  if (service.fields.some(field => field.name === 'updatedAt')) {
    lines.push('  updatedAt: async () => new Date(),')
  }
  return lines.length ? `
{
${lines.join('\n')}
}`.trim() : '{}'
}

export function buildSharedPreview(service: BuilderServiceManifest) {
  const symbolBase = getServiceSymbolBase(service)
  const methods = uniqueStrings(service.methods)
  return `export const ${symbolBase}Path = ${JSON.stringify(service.path)}\nexport const ${symbolBase}Methods = [${methods.map(method => JSON.stringify(method)).join(', ')}] as const\n`
}


function renderMultiOption(service: BuilderServiceManifest) {
  const multiMethods = uniqueStrings(service.methods).filter(method => ['create', 'patch', 'remove'].includes(method))
  if (!multiMethods.length) return 'false'
  return `[${multiMethods.map(method => JSON.stringify(method)).join(', ')}]`
}

function getDataOmitKeys(service: BuilderServiceManifest) {
  return uniqueStrings([
    ...getIdKeys(service),
    service.fields.some(field => field.name === 'createdAt') ? 'createdAt' : '',
    service.fields.some(field => field.name === 'updatedAt') ? 'updatedAt' : '',
  ])
}

export function buildSchemaPreview(service: BuilderServiceManifest) {
  const schemaBase = getSchemaSymbolBase(service)
  const entityName = getEntityName(service)
  const className = getServiceClassName(service)
  const profileMeta = getServiceProfileMeta(service)
  const idKeys = getIdKeys(service)
  const identityLines = idKeys.map((key) => {
    if (key === '_id') return '  _id: z.any().optional(),'
    if (key === 'id') return '  id: z.string().optional(),'
    return `  ${JSON.stringify(key)}: z.any().optional(),`
  }).join('\n')
  const fieldLines = service.fields.length
    ? service.fields.map(renderZodField).join('\n')
    : '  // ajoute tes champs ici'
  const dataOmitLines = getDataOmitKeys(service).map(key => `  ${JSON.stringify(key)}: true,`).join('\n')
  const queryFieldLines = service.fields.length
    ? service.fields.map(renderQueryField).join('\n')
    : '  // filtres métier'

  const authLocalImport = isUsersAuthService(service) && service.fields.some(field => field.name === 'password')
    ? "import { passwordHash } from '@feathersjs/authentication-local'\n"
    : ''
  const externalResolverBody = isUsersAuthService(service) && service.fields.some(field => field.name === 'password')
    ? `\n{\n  password: async () => undefined\n}`.trim()
    : '{}'

  return `import { resolve, virtual } from '@feathersjs/schema'
import type { HookContext } from '@feathersjs/feathers'
${authLocalImport}import { z } from 'zod'
import type { ${className} } from ${JSON.stringify(getClassFileName(service))}
${renderSchemaMetadata(service)}
// Profil builder détecté: ${profileMeta.label}
export const ${schemaBase}Schema = z.object({
${identityLines}${identityLines && fieldLines ? '\n' : ''}${fieldLines}
})

export const ${schemaBase}DataSchema = ${schemaBase}Schema.omit({
${dataOmitLines}
})

export const ${schemaBase}PatchSchema = ${schemaBase}DataSchema.partial()

export const ${schemaBase}QuerySchema = z.object({
${queryFieldLines}
  $limit: z.coerce.number().optional(),
  $skip: z.coerce.number().optional(),
  $sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
  $select: z.array(z.string()).optional(),
}).partial().default({})

export type ${entityName} = z.infer<typeof ${schemaBase}Schema>
export type ${entityName}Data = z.infer<typeof ${schemaBase}DataSchema>
export type ${entityName}Patch = z.infer<typeof ${schemaBase}PatchSchema>
export type ${entityName}Query = z.infer<typeof ${schemaBase}QuerySchema>

export const ${schemaBase}DataValidator = (value: unknown) => ${schemaBase}DataSchema.parse(value)
export const ${schemaBase}PatchValidator = (value: unknown) => ${schemaBase}PatchSchema.parse(value)
export const ${schemaBase}QueryValidator = (value: unknown) => ${schemaBase}QuerySchema.parse(value)

export const ${schemaBase}Resolver = resolve<${entityName}, HookContext<${className}>>({
  id: virtual(async (record) => {
    const value = record as any
    if (value?.id) return value.id
    const candidate = value?.[${JSON.stringify(service.idField)}] ?? value?._id
    return candidate?.toString ? candidate.toString() : candidate
  })
})

export const ${schemaBase}ExternalResolver = resolve<${entityName}, HookContext<${className}>>(${externalResolverBody})
export const ${schemaBase}DataResolver = resolve<${entityName}, HookContext<${className}>>(${renderResolverAssignments(service, 'data')})
export const ${schemaBase}PatchResolver = resolve<${entityName}, HookContext<${className}>>(${renderResolverAssignments(service, 'patch')})
export const ${schemaBase}QueryResolver = resolve<${entityName}Query, HookContext<${className}>>({})
`
}

export function buildClassPreview(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  const entityName = getEntityName(service)
  const className = getServiceClassName(service)
  const multiOption = renderMultiOption(service)
  const idOption = service.idField && !['_id', 'id'].includes(service.idField)
    ? `,\n    id: ${JSON.stringify(service.idField)}`
    : ''

  if (service.adapter === 'mongodb') {
    return `import type { Params, Application } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions } from '@feathersjs/mongodb'
import { MongoDBService } from '@feathersjs/mongodb'
import type { ${entityName}, ${entityName}Data, ${entityName}Patch, ${entityName}Query } from ${JSON.stringify(getSchemaFileName(service))}

export type { ${entityName}, ${entityName}Data, ${entityName}Patch, ${entityName}Query }
export interface ${entityName}Params extends Params<${entityName}Query> {}

export class ${className}<ServiceParams extends Params = ${entityName}Params> extends MongoDBService<
  ${entityName},
  ${entityName}Data,
  ServiceParams,
  ${entityName}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient')
  return {
    paginate: false,
    multi: ${multiOption}${idOption},
    Model: mongoClient.then((db: any) => db.collection(${JSON.stringify(service.collection || fsName)}))
  }
}
`
  }

  if (service.adapter === 'memory') {
    return `import type { Params, Application } from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import type { ${entityName}, ${entityName}Data, ${entityName}Patch, ${entityName}Query } from ${JSON.stringify(getSchemaFileName(service))}

export type { ${entityName}, ${entityName}Data, ${entityName}Patch, ${entityName}Query }
export interface ${entityName}Params extends Params<${entityName}Query> {}

export class ${className}<ServiceParams extends Params = ${entityName}Params> extends MemoryService<
  ${entityName},
  ${entityName}Data,
  ServiceParams,
  ${entityName}Patch
> {}

export function getOptions(_app: Application) {
  return {
    paginate: false,
    multi: ${multiOption}${idOption}
  }
}
`
  }

  const methodBodies = uniqueStrings(service.methods).map((method) => {
    if (method === 'find') return "  async find(_params?: any) {\n    return []\n  }"
    if (method === 'get') return `  async get(id: string, _params?: any) {\n    return { ${JSON.stringify(service.idField)}: id }\n  }`
    if (method === 'create') return "  async create(data: any, _params?: any) {\n    return data\n  }"
    if (method === 'update') return `  async update(id: string, data: any, _params?: any) {\n    return { ...data, ${JSON.stringify(service.idField)}: id }\n  }`
    if (method === 'patch') return `  async patch(id: string, data: any, _params?: any) {\n    return { ...data, ${JSON.stringify(service.idField)}: id }\n  }`
    if (method === 'remove') return `  async remove(id: string, _params?: any) {\n    return { ${JSON.stringify(service.idField)}: id }\n  }`
    return `  async ${method}(data: any, _params?: any) {\n    return data\n  }`
  }).join('\n\n')

  return `import type { Application } from '@feathersjs/feathers'
import type { ${entityName}Data, ${entityName}Patch, ${entityName}Query } from ${JSON.stringify(getSchemaFileName(service))}

export type { ${entityName}Data, ${entityName}Patch, ${entityName}Query }

export class ${className} {
  options: Record<string, any>
  app: Application

  constructor(options: Record<string, any> = {}, app: Application) {
    this.options = options
    this.app = app
  }

${methodBodies || '  // ajoute ici tes méthodes custom'}
}

export function getOptions(_app: Application) {
  return {}
}
`
}

function getHookSupportNames(service: BuilderServiceManifest) {
  const base = toPascalCase(getSchemaSymbolBase(service), 'Service')
  return {
    sanitizeResult: `sanitize${base}Result`,
    normalizeError: `normalize${base}Error`,
  }
}

function buildHookSupportCode(service: BuilderServiceManifest) {
  if (service.hookPreset !== 'action') return ''
  const names = getHookSupportNames(service)
  return `const ${names.normalizeError} = async (context: any) => {
  const error = context.error
  if (!error || error instanceof Error) return context
  const message = error?.message || error?.name || '${getServiceFsName(service)} service error'
  const normalized: any = new Error(message)
  if (error?.code) normalized.code = error.code
  if (error?.className) normalized.className = error.className
  if (error?.data) normalized.data = error.data
  context.error = normalized
  return context
}

const ${names.sanitizeResult} = async (context: any) => {
  return context
}`
}

function buildMethodHookLines(service: BuilderServiceManifest) {
  const schemaBase = getSchemaSymbolBase(service)
  const methods = uniqueStrings(service.methods)
  const lines: string[] = []

  if (methods.includes('get')) lines.push('      get: [],')
  if (methods.includes('find')) lines.push('      find: [],')
  if (methods.includes('create')) lines.push(`      create: [
        schemaHooks.validateData(${schemaBase}DataValidator),
        schemaHooks.resolveData(${schemaBase}DataResolver)
      ],`)
  if (methods.includes('update')) lines.push(`      update: [
        schemaHooks.validateData(${schemaBase}DataValidator),
        schemaHooks.resolveData(${schemaBase}DataResolver)
      ],`)
  if (methods.includes('patch')) lines.push(`      patch: [
        schemaHooks.validateData(${schemaBase}PatchValidator),
        schemaHooks.resolveData(${schemaBase}PatchResolver)
      ],`)
  if (methods.includes('remove')) lines.push('      remove: [],')

  for (const method of methods.filter(method => !['find', 'get', 'create', 'update', 'patch', 'remove'].includes(method))) {
    lines.push(`      ${method}: [],`)
  }

  return lines.join('\n')
}

function getInlineCustomCode(service: BuilderServiceManifest) {
  const customCode = service.customCode.trim()
  if (!customCode) return '// ajoute ici ton code custom'
  if (/export\s+function\s+\w+\(|app\.service\(|declare module\s+'nuxt-feathers-zod\/server'/.test(customCode))
    return '// le scan source contient déjà un module complet ; ajoute ici uniquement tes helpers/hooks inline'
  return customCode
}

function buildHooksObjectPreview(service: BuilderServiceManifest) {
  const schemaBase = getSchemaSymbolBase(service)
  const authHook = service.auth ? "authenticate('jwt')" : ''
  const hookList = uniqueStrings([authHook, `schemaHooks.validateQuery(${schemaBase}QueryValidator)`, `schemaHooks.resolveQuery(${schemaBase}QueryResolver)`])
    .filter(Boolean)
    .map(item => `        ${item}`)
    .join(',\n')
  const supportNames = getHookSupportNames(service)
  const afterAll = service.hookPreset === 'action' ? `[${supportNames.sanitizeResult}]` : '[]'
  const errorAll = service.hookPreset === 'action' ? `[${supportNames.normalizeError}]` : '[]'

  return `around: {
      all: [
        schemaHooks.resolveExternal(${schemaBase}ExternalResolver),
        schemaHooks.resolveResult(${schemaBase}Resolver)
      ]
    },
    before: {
      all: [
${hookList}
      ],
${buildMethodHookLines(service)}
    },
    after: { all: ${afterAll} },
    error: { all: ${errorAll} }`
}

export function buildHooksModulePreview(service: BuilderServiceManifest) {
  const schemaBase = getSchemaSymbolBase(service)
  const authImport = service.auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''
  const supportCode = buildHookSupportCode(service)
  const customCode = getInlineCustomCode(service)
  const supportNames = getHookSupportNames(service)
  const hooksConstName = `${getServiceRegisterName(service)}Hooks`
  return `import { hooks as schemaHooks } from '@feathersjs/schema'\n${authImport}import {
  ${schemaBase}ExternalResolver,
  ${schemaBase}Resolver,
  ${schemaBase}QueryResolver,
  ${schemaBase}QueryValidator${methodsIncludes(service, ['create', 'update']) ? `,
  ${schemaBase}DataResolver,
  ${schemaBase}DataValidator` : ''}${methodsIncludes(service, ['patch']) ? `,
  ${schemaBase}PatchResolver,
  ${schemaBase}PatchValidator` : ''}
} from ${JSON.stringify(getSchemaFileName(service))}

${supportCode ? `${supportCode}

` : ''}export const ${hooksConstName} = {
  ${buildHooksObjectPreview(service)}
}

// Hooks séparés pour rapprocher le builder du layout CLI NFZ.
// ${service.hookPreset === 'action' ? `Utilitaires disponibles : ${supportNames.sanitizeResult}, ${supportNames.normalizeError}` : 'Profil standard ou custom.'}
${customCode}
`
}

export function buildHooksPreview(service: BuilderServiceManifest) {
  if (service.hooksFileMode === 'separate') return buildHooksModulePreview(service)
  const supportCode = buildHookSupportCode(service)
  const customCode = getInlineCustomCode(service)
  return `${supportCode ? `${supportCode}

` : ''}${buildHooksObjectPreview(service)}
  }

${customCode}`
}

export function buildServicePreview(service: BuilderServiceManifest) {
  const schemaBase = getSchemaSymbolBase(service)
  const sharedBase = getServiceSymbolBase(service)
  const className = getServiceClassName(service)
  const registerName = getServiceRegisterName(service)
  const authImport = service.auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''
  const profileMeta = getServiceProfileMeta(service)
  const serviceInstance = service.adapter === 'custom'
    ? `new ${className}(getOptions(app), app)`
    : `new ${className}(getOptions(app))`
  const hooksConstName = `${registerName}Hooks`
  const schemaImports = uniqueStrings([
    methodsIncludes(service, ['create', 'update']) ? `${schemaBase}DataResolver` : '',
    methodsIncludes(service, ['create', 'update']) ? `${schemaBase}DataValidator` : '',
    `${schemaBase}ExternalResolver`,
    methodsIncludes(service, ['patch']) ? `${schemaBase}PatchResolver` : '',
    methodsIncludes(service, ['patch']) ? `${schemaBase}PatchValidator` : '',
    `${schemaBase}QueryResolver`,
    `${schemaBase}QueryValidator`,
    `${schemaBase}Resolver`,
  ])

  return `import { hooks as schemaHooks } from '@feathersjs/schema'
${authImport}import type { Application } from '@feathersjs/feathers'
import { getOptions, ${className} } from ${JSON.stringify(getClassFileName(service))}
import {
  ${schemaImports.join(',\n  ')}
} from ${JSON.stringify(getSchemaFileName(service))}
import { ${sharedBase}Methods, ${sharedBase}Path } from ${JSON.stringify(getSharedFileName(service))}${service.hooksFileMode === 'separate' ? `\nimport { ${hooksConstName} } from ${JSON.stringify(getHooksFileName(service))}` : ''}

export * from ${JSON.stringify(getClassFileName(service))}
export * from ${JSON.stringify(getSchemaFileName(service))}${service.hooksFileMode === 'separate' ? `\nexport * from ${JSON.stringify(getHooksFileName(service))}` : ''}

// Profil builder détecté: ${profileMeta.label}
// ${profileMeta.hint}

${service.hooksFileMode === 'separate' ? '' : (buildHookSupportCode(service) ? `${buildHookSupportCode(service)}\n\n` : '')}export function ${registerName}(app: Application) {
  app.use(${sharedBase}Path, ${serviceInstance}, {
    methods: [...${sharedBase}Methods],
    events: []
  })

  app.service(${sharedBase}Path).hooks(${service.hooksFileMode === 'separate' ? hooksConstName : `{\n    ${buildHooksObjectPreview(service)}\n  }`})
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${sharedBase}Path]: ${className}
  }
}
`
}

function methodsIncludes(service: BuilderServiceManifest, expected: string[]) {
  const methods = uniqueStrings(service.methods)
  return expected.some(method => methods.includes(method))
}


export function buildServiceBarrelPreview(service: BuilderServiceManifest) {
  const classFile = getClassFileName(service)
  const schemaFile = getSchemaFileName(service)
  const sharedFile = getSharedFileName(service)
  const hooksFile = getHooksFileName(service)
  const registerName = getServiceRegisterName(service)

  return `export * from ${JSON.stringify(sharedFile)}
export * from ${JSON.stringify(schemaFile)}
export * from ${JSON.stringify(classFile)}${service.hooksFileMode === 'separate' ? `
export * from ${JSON.stringify(hooksFile)}` : ''}
export { ${registerName} } from ${JSON.stringify(`./${getServiceFsName(service)}`)}
`
}

export function buildRootBarrelPreview(service: BuilderServiceManifest) {
  const fsName = getServiceFsName(service)
  return `export * from './${fsName}'
`
}

export function collectRootBarrelServices(services: BuilderServiceManifest[], activeService?: BuilderServiceManifest) {
  const pool = [...(services || [])]
  if (activeService) pool.push(activeService)

  const map = new Map<string, BuilderServiceManifest>()
  for (const service of pool) {
    if (!service || service.barrelMode !== 'service+root') continue
    map.set(getServiceFsName(service), createService(service))
  }

  return [...map.values()].sort((a, b) => getServiceFsName(a).localeCompare(getServiceFsName(b)))
}

export function buildRootBarrelPreviewForServices(services: BuilderServiceManifest[], activeService?: BuilderServiceManifest) {
  const items = collectRootBarrelServices(services, activeService)
  if (!items.length && activeService) return buildRootBarrelPreview(activeService)
  return items.map(service => `export * from './${getServiceFsName(service)}'`).join('\n').concat(items.length ? '\n' : '')
}

export function buildGeneratedFiles(service: BuilderServiceManifest, servicesRoot = 'services', options: { allServices?: BuilderServiceManifest[] } = {}) {
  const fsName = getServiceFsName(service)
  const root = `${servicesRoot}/${fsName}`
  const files = [
    {
      path: `${root}/${fsName}.shared.ts`,
      language: 'ts',
      content: buildSharedPreview(service),
    },
    {
      path: `${root}/${fsName}.class.ts`,
      language: 'ts',
      content: buildClassPreview(service),
    },
    {
      path: `${root}/${fsName}.schema.ts`,
      language: 'ts',
      content: buildSchemaPreview(service),
    },
  ]

  if (service.hooksFileMode === 'separate') {
    files.push({
      path: `${root}/${fsName}.hooks.ts`,
      language: 'ts',
      content: buildHooksModulePreview(service),
    })
  }

  files.push({
    path: `${root}/${fsName}.ts`,
    language: 'ts',
    content: buildServicePreview(service),
  })

  if (service.barrelMode !== 'none') {
    files.push({
      path: `${root}/index.ts`,
      language: 'ts',
      content: buildServiceBarrelPreview(service),
    })
  }

  if (service.barrelMode === 'service+root') {
    files.push({
      path: `${servicesRoot}/index.ts`,
      language: 'ts',
      content: buildRootBarrelPreviewForServices(options.allServices || [service], service),
    })
  }

  return files
}

export function buildGeneratedFilesForServices(services: BuilderServiceManifest[], servicesRoot = 'services') {
  const normalized = normalizeManifest(services)
  const files = normalized.flatMap(service => buildGeneratedFiles(service, servicesRoot, { allServices: normalized }))
  const rootBarrel = normalized.some(service => service.barrelMode === 'service+root')
  if (!rootBarrel) return files

  const rootPath = `${servicesRoot}/index.ts`
  const others = files.filter(file => file.path !== rootPath)
  others.push({
    path: rootPath,
    language: 'ts',
    content: buildRootBarrelPreviewForServices(normalized),
  })
  return others
}

