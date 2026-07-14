import type { Id, Params } from '@feathersjs/feathers'
import type { FieldMeta, ServiceSchemaInfo } from './utils/nfzSchema'
import { spawn } from 'node:child_process'

import { existsSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { authenticate } from '@feathersjs/authentication'
import { BadRequest, Forbidden, NotAuthenticated, NotFound } from '@feathersjs/errors'
import { z } from 'zod'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../capabilities'
import { applyPlan, assertPresetId, computePlan, listPresets } from './presets'
import { readRbacFile, writeRbacFile } from './rbac/rbacFile'
import { getNfzDir } from './utils/nfzPaths'
import {
  applySchemaFields,
  findProjectRoot,
  getServiceInfo,
  listServices,
  readManifest,
  writeManifestFields,
} from './utils/nfzSchema'

export { NFZ_CONSOLE_SERVICE_PATHS } from '../capabilities'

export interface NfzConsoleRuntimeConfig {
  console?: false | {
    enabled?: boolean
    allowWrite?: boolean
    servicesDirs?: string[]
  }
  auth?: false | {
    enabled?: boolean
    strategies?: string[]
  }
  keycloak?: false | {
    enabled?: boolean
    mode?: string
  }
}

export interface NfzConsoleServiceContext {
  projectRoot: string
  servicesDirs: string[]
  allowWrite: boolean
}

const safeNamePattern = /^[a-z0-9][\w-]{0,127}$/i
const unsafeObjectKeys = new Set(['__proto__', 'prototype', 'constructor'])

const serviceNameSchema = z.string().trim().min(1).max(128).regex(safeNamePattern)
const fieldNameSchema = z.string().trim().min(1).max(128).regex(/^[A-Z_$][\w$]*$/i)
const fieldMetaSchema = z.object({
  type: z.enum(['string', 'number', 'int', 'boolean', 'date', 'objectId', 'json']),
  required: z.boolean().optional(),
  array: z.boolean().optional(),
}).strict()
const fieldsSchema = z.record(fieldNameSchema, fieldMetaSchema).superRefine((value, ctx) => {
  const names = Object.keys(value)
  if (names.length > 500) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A schema cannot contain more than 500 fields.' })
  }
  for (const name of names) {
    if (unsafeObjectKeys.has(name))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unsafe field name: ${name}` })
  }
})

const schemaPatchSchema = z.object({
  fields: fieldsSchema.optional(),
  dryRun: z.boolean().optional(),
  sync: z.enum(['manifest-to-schema', 'schema-to-manifest']).optional(),
}).strict().refine(value => value.fields || value.sync, {
  message: 'fields or sync is required.',
})

const builderCommandSchema = z.object({
  action: z.enum(['preview', 'apply']),
  service: serviceNameSchema.optional(),
  fields: fieldsSchema.optional(),
  sync: z.enum(['manifest-to-schema', 'schema-to-manifest']).optional(),
  preset: z.string().trim().min(1).max(128).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict().refine(value => value.preset || value.service, {
  message: 'preset or service is required.',
})

const manifestSchema = z.object({
  services: z.record(serviceNameSchema, z.record(z.string(), z.unknown())).default({}),
}).passthrough()

const rbacSchema = z.object({
  enabled: z.boolean().optional(),
  denyByDefault: z.boolean().optional(),
  roles: z.array(z.string().trim().min(1).max(128)).max(256).optional(),
  policies: z.record(
    z.string().trim().min(1).max(256),
    z.record(
      z.enum(['find', 'get', 'create', 'update', 'patch', 'remove']),
      z.array(z.string().trim().min(1).max(128)).max(256),
    ),
  ).optional(),
}).strict()

const presetCommandSchema = z.object({
  action: z.enum(['preview', 'apply']),
  preset: z.string().trim().min(1).max(128),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict()

const initCommandSchema = z.object({
  action: z.literal('add-users'),
  adapter: z.enum(['mongodb', 'memory']).default('mongodb'),
}).strict()

function assertSafeObjectGraph(value: unknown): void {
  const stack: Array<{ value: unknown, depth: number }> = [{ value, depth: 0 }]
  let visited = 0

  while (stack.length) {
    const current = stack.pop()
    if (!current)
      continue
    if (current.depth > 16)
      throw new BadRequest('NFZ console payload is too deeply nested.')
    if (++visited > 10_000)
      throw new BadRequest('NFZ console payload is too large.')

    if (Array.isArray(current.value)) {
      for (const item of current.value)
        stack.push({ value: item, depth: current.depth + 1 })
      continue
    }

    if (!current.value || typeof current.value !== 'object')
      continue

    for (const [key, nested] of Object.entries(current.value)) {
      if (unsafeObjectKeys.has(key))
        throw new BadRequest(`Unsafe object key: ${key}`)
      stack.push({ value: nested, depth: current.depth + 1 })
    }
  }
}

function parseOrBadRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  assertSafeObjectGraph(value)
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new BadRequest('Invalid NFZ console payload.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    })
  }
  return parsed.data
}

function normalizeServicesDirs(input: unknown): string[] {
  if (!Array.isArray(input))
    return ['services']
  const dirs = input.map(value => String(value || '').trim()).filter(Boolean)
  return dirs.length ? dirs : ['services']
}

export function resolveNfzConsoleServiceContext(config: NfzConsoleRuntimeConfig): NfzConsoleServiceContext {
  const servicesDirs = normalizeServicesDirs(config.console && config.console.servicesDirs)
  const firstDir = servicesDirs[0] || process.cwd()
  const searchFrom = isAbsolute(firstDir) ? firstDir : resolve(process.cwd(), firstDir)

  return {
    projectRoot: findProjectRoot(searchFrom),
    servicesDirs,
    allowWrite: Boolean(config.console && config.console.allowWrite),
  }
}

function assertWriteAllowed(context: NfzConsoleServiceContext): void {
  if (!context.allowWrite)
    throw new Forbidden('NFZ console writes are disabled (feathers.console.allowWrite=false).')
}

function requireResolvedUser() {
  return async (hook: any) => {
    if (hook.params?.provider && !hook.params?.user)
      throw new NotAuthenticated('Authentication is required for NFZ console services.')
    return hook
  }
}

function consoleAccessHooks(config: NfzConsoleRuntimeConfig): any[] {
  const authEnabled = Boolean(config.auth && config.auth.enabled !== false)
  const keycloakEnabled = Boolean(config.keycloak && config.keycloak.enabled !== false)
  const hooks: any[] = []

  if (authEnabled) {
    const configured = config.auth && Array.isArray(config.auth.strategies)
      ? config.auth.strategies.filter(strategy => strategy === 'jwt')
      : []
    hooks.push(authenticate(...((configured.length ? configured : ['jwt']) as [string, ...string[]])))
  }

  if (keycloakEnabled)
    hooks.push(requireResolvedUser())

  return hooks
}

function previewSchemaSync(info: ServiceSchemaInfo, mode: 'manifest-to-schema' | 'schema-to-manifest') {
  if (mode === 'manifest-to-schema') {
    if (!info.manifestFields)
      throw new BadRequest('No manifest fields are available for this service.')

    return {
      mode,
      before: info,
      after: {
        ...info,
        fields: info.manifestFields,
        schemaFields: info.manifestFields,
        drift: false,
        driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] },
      },
    }
  }

  return {
    mode,
    before: info,
    after: {
      ...info,
      fields: info.schemaFields,
      manifestFields: info.schemaFields,
      drift: false,
      driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] },
    },
  }
}

function getSchema(context: NfzConsoleServiceContext, id: Id): ServiceSchemaInfo {
  const service = parseOrBadRequest(serviceNameSchema, String(id || ''))
  try {
    return getServiceInfo(context.projectRoot, context.servicesDirs, service)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Schema file not found'))
      throw new NotFound(message)
    throw error
  }
}

function applySchemaPatch(
  context: NfzConsoleServiceContext,
  id: Id,
  rawData: unknown,
): ServiceSchemaInfo | Record<string, unknown> {
  const data = parseOrBadRequest(schemaPatchSchema, rawData)
  const info = getSchema(context, id)

  if (data.sync) {
    if (data.dryRun)
      return previewSchemaSync(info, data.sync)

    assertWriteAllowed(context)
    if (data.sync === 'manifest-to-schema') {
      if (!info.manifestFields)
        throw new BadRequest('No manifest fields are available for this service.')
      applySchemaFields(info.schemaFile, info.manifestFields, info.idField)
    }
    else {
      writeManifestFields(context.projectRoot, context.servicesDirs, info.service, info.schemaFields)
    }
    return getSchema(context, info.service)
  }

  const fields = data.fields as Record<string, FieldMeta>
  if (data.dryRun)
    return { before: info, after: { ...info, fields } }

  assertWriteAllowed(context)
  writeManifestFields(context.projectRoot, context.servicesDirs, info.service, fields)
  applySchemaFields(info.schemaFile, fields, info.idField)
  return getSchema(context, info.service)
}

class NfzServicesService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async find(_params?: Params) {
    return {
      projectRoot: this.context.projectRoot,
      servicesDirs: this.context.servicesDirs,
      services: listServices(this.context.projectRoot, this.context.servicesDirs),
    }
  }
}

class NfzSchemasService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async find(_params?: Params) {
    return new NfzServicesService(this.context).find()
  }

  async get(id: Id, _params?: Params) {
    return getSchema(this.context, id)
  }

  async patch(id: Id, data: unknown, _params?: Params) {
    return applySchemaPatch(this.context, id, data)
  }
}

class NfzManifestService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async get(_id: Id, _params?: Params) {
    const { manifest, manifestPath } = readManifest(this.context.projectRoot, this.context.servicesDirs)
    return {
      ok: true,
      projectRoot: this.context.projectRoot,
      servicesDirs: this.context.servicesDirs,
      manifestPath,
      manifest: manifest || { services: {} },
    }
  }

  async patch(_id: Id, data: unknown, _params?: Params) {
    assertWriteAllowed(this.context)
    const raw = data && typeof data === 'object' && 'manifest' in data
      ? (data).manifest
      : data
    const manifest = parseOrBadRequest(manifestSchema, raw)
    const nfzDir = getNfzDir(this.context.projectRoot, this.context.servicesDirs)
    const manifestPath = join(nfzDir, 'manifest.json')
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    return this.get('current')
  }
}

class NfzBuilderService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async create(rawData: unknown, _params?: Params) {
    const data = parseOrBadRequest(builderCommandSchema, rawData)

    if (data.preset) {
      const preset = assertPresetId(data.preset)
      const plan = computePlan(preset, data.params || {})
      if (data.action === 'preview') {
        const { ok: _ok, ...payload } = plan as unknown as Record<string, unknown>
        return { ...payload, ok: true, preset }
      }

      assertWriteAllowed(this.context)
      const result = await applyPlan(plan, { rootDir: this.context.projectRoot, allowWrite: true })
      const { ok: _ok, ...payload } = result as Record<string, unknown>
      return { ...payload, ok: true, preset }
    }

    const service = data.service as string
    if (data.action === 'preview') {
      const info = getSchema(this.context, service)
      if (data.sync)
        return { ok: true, ...previewSchemaSync(info, data.sync) }
      if (!data.fields)
        throw new BadRequest('fields or sync is required for a service preview.')
      return { ok: true, before: info, after: { ...info, fields: data.fields } }
    }

    return { ok: true, ...applySchemaPatch(this.context, service, { fields: data.fields, sync: data.sync }) }
  }
}

class NfzStatusService {
  constructor(private readonly context: NfzConsoleServiceContext, private readonly config: NfzConsoleRuntimeConfig) {}

  async find(_params?: Params) {
    const servicesDirsAbs = this.context.servicesDirs.map(dir => (
      isAbsolute(dir) ? dir : resolve(this.context.projectRoot, dir)
    ))
    const usersSchemaPaths = servicesDirsAbs.flatMap(dir => [
      join(dir, 'users', 'users.schema.ts'),
      join(dir, 'users', 'users.schema.js'),
      join(dir, 'users', 'users.schema.mts'),
    ])
    const usersServicePaths = servicesDirsAbs.flatMap(dir => [
      join(dir, 'users', 'users.ts'),
      join(dir, 'users', 'users.js'),
      join(dir, 'users', 'users.mts'),
    ])
    const hasUsers = [...usersSchemaPaths, ...usersServicePaths].some(path => existsSync(path))
    const keycloakEnabled = Boolean(this.config.keycloak && this.config.keycloak.enabled !== false)
    const authEnabled = Boolean(this.config.auth && this.config.auth.enabled !== false) || keycloakEnabled
    const authProvider = keycloakEnabled ? 'keycloak' : authEnabled ? 'local' : null
    const state = !hasUsers && authEnabled && !keycloakEnabled
      ? 'needs-users'
      : !hasUsers && !authEnabled
          ? 'empty'
          : hasUsers || keycloakEnabled
            ? 'ready'
            : 'unknown'
    const rbacFile = readRbacFile(this.context.projectRoot, this.context.servicesDirs)

    return {
      ok: true,
      projectRoot: this.context.projectRoot,
      state,
      servicesDirs: this.context.servicesDirs,
      authEnabled,
      authProvider,
      consoleEnabled: true,
      allowWrite: this.context.allowWrite,
      hasUsers,
      rbac: {
        enabled: Boolean(rbacFile.enabled),
        mode: authProvider === 'keycloak' ? 'keycloak' : 'local',
        ready: Boolean(rbacFile.enabled),
        denyByDefault: Boolean(rbacFile.denyByDefault),
        updatedAt: rbacFile.updatedAt || null,
      },
    }
  }
}

class NfzRbacService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async get(_id: Id, _params?: Params) {
    return {
      ok: true,
      projectRoot: this.context.projectRoot,
      servicesDirs: this.context.servicesDirs,
      file: readRbacFile(this.context.projectRoot, this.context.servicesDirs),
    }
  }

  async patch(_id: Id, rawData: unknown, _params?: Params) {
    assertWriteAllowed(this.context)
    const data = parseOrBadRequest(rbacSchema, rawData)
    const current = readRbacFile(this.context.projectRoot, this.context.servicesDirs)
    const next = {
      ...current,
      ...data,
      policies: data.policies ?? current.policies,
    }
    const output = writeRbacFile(this.context.projectRoot, this.context.servicesDirs, next)
    return { ok: true, projectRoot: this.context.projectRoot, servicesDirs: this.context.servicesDirs, ...output }
  }
}

class NfzPresetsService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async find(_params?: Params) {
    return { presets: listPresets() }
  }

  async create(rawData: unknown, _params?: Params) {
    const data = parseOrBadRequest(presetCommandSchema, rawData)
    const preset = assertPresetId(data.preset)
    const plan = computePlan(preset, data.params || {})

    if (data.action === 'preview') {
      const { ok: _ok, ...payload } = plan as unknown as Record<string, unknown>
      return { ...payload, ok: true, preset }
    }

    assertWriteAllowed(this.context)
    const result = await applyPlan(plan, { rootDir: this.context.projectRoot, allowWrite: true })
    const { ok: _ok, ...payload } = result as Record<string, unknown>
    return { ...payload, ok: true, preset }
  }
}

let initRunning = false

class NfzInitService {
  constructor(private readonly context: NfzConsoleServiceContext) {}

  async create(rawData: unknown, _params?: Params) {
    assertWriteAllowed(this.context)
    const data = parseOrBadRequest(initCommandSchema, rawData)
    if (initRunning)
      throw new Forbidden('An NFZ initialization command is already running.')

    initRunning = true
    try {
      const command = process.platform === 'win32' ? 'bunx.cmd' : 'bunx'
      const adapter = data.adapter ?? 'mongodb'
      const args: string[] = ['nuxt-feathers-zod', 'add', 'service', 'users', '--auth', '--adapter', adapter]
      const child = spawn(command, args, {
        cwd: this.context.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      })
      const cap = 64 * 1024
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (chunk: Uint8Array) => {
        if (stdout.length < cap)
          stdout += String(chunk).slice(0, cap - stdout.length)
      })
      child.stderr?.on('data', (chunk: Uint8Array) => {
        if (stderr.length < cap)
          stderr += String(chunk).slice(0, cap - stderr.length)
      })
      const code = await new Promise<number>((resolveCode, reject) => {
        child.once('error', reject)
        child.once('close', (value: number | null) => resolveCode(value ?? 0))
      })
      if (code !== 0)
        throw new BadRequest(`bunx exited with code ${code}.`, { stdout, stderr })
      return { ok: true, action: data.action, adapter, stdout, stderr }
    }
    finally {
      initRunning = false
    }
  }
}

function registerService(app: any, path: string, service: object, methods: string[], accessHooks: any[]): void {
  app.use(path, service, { methods, events: [] })
  if (accessHooks.length) {
    app.service(path).hooks({
      around: { all: accessHooks },
    })
  }
}

function hasService(app: any, path: string): boolean {
  try {
    return Boolean(app.service(path))
  }
  catch {
    return false
  }
}

export function registerNfzConsoleServices(app: any, config: NfzConsoleRuntimeConfig): void {
  if (!config.console || config.console.enabled === false)
    return

  const context = resolveNfzConsoleServiceContext(config)
  const accessHooks = consoleAccessHooks(config)
  const registrations: Array<[string, object, string[]]> = [
    [NFZ_CONSOLE_SERVICE_PATHS.services, new NfzServicesService(context), ['find']],
    [NFZ_CONSOLE_SERVICE_PATHS.schemas, new NfzSchemasService(context), ['find', 'get', 'patch']],
    [NFZ_CONSOLE_SERVICE_PATHS.manifest, new NfzManifestService(context), ['get', 'patch']],
    [NFZ_CONSOLE_SERVICE_PATHS.builder, new NfzBuilderService(context), ['create']],
    [NFZ_CONSOLE_SERVICE_PATHS.status, new NfzStatusService(context, config), ['find']],
    [NFZ_CONSOLE_SERVICE_PATHS.rbac, new NfzRbacService(context), ['get', 'patch']],
    [NFZ_CONSOLE_SERVICE_PATHS.presets, new NfzPresetsService(context), ['find', 'create']],
    [NFZ_CONSOLE_SERVICE_PATHS.init, new NfzInitService(context), ['create']],
  ]

  for (const [path, service, methods] of registrations) {
    if (!hasService(app, path))
      registerService(app, path, service, methods, accessHooks)
  }
}
