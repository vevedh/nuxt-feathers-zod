import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'

export type FieldMeta = {
  type: string
  required?: boolean
  array?: boolean
}

export type ServiceSchemaInfo = {
  service: string
  servicesDir: string
  schemaFile: string
  manifestPath: string | null
  adapter?: string
  auth?: boolean
  docs?: boolean
  idField?: string
  collection?: string
  fields: Record<string, FieldMeta>
}

const IGNORE_DIRS = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', 'build'])

export function normalizeServiceName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

export function findProjectRoot(from: string) {
  let cur = resolve(from)
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(cur, 'package.json'))) return cur
    const parent = dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return resolve(from)
}

function shallowScanForSchema(rootDir: string, serviceKebab: string, maxDepth = 5): string | null {
  const target = `${serviceKebab}.schema.ts`
  function walk(dir: string, depth: number): string | null {
    if (depth > maxDepth) return null
    let entries: string[] = []
    try { entries = readdirSync(dir) } catch { return null }
    for (const name of entries) {
      if (IGNORE_DIRS.has(name)) continue
      const full = join(dir, name)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) {
        const hit = walk(full, depth + 1)
        if (hit) return hit
      } else if (st.isFile() && name === target) {
        return full
      }
    }
    return null
  }
  return walk(rootDir, 0)
}

export function resolveSchemaFile(projectRoot: string, servicesDir: string, serviceName: string): { schemaFile: string, servicesDirResolved: string } {
  const kebab = normalizeServiceName(serviceName)
  const candidates = [
    join(projectRoot, 'services', kebab, `${kebab}.schema.ts`),
    join(projectRoot, 'playground', 'services', kebab, `${kebab}.schema.ts`),
    join(resolve(projectRoot, servicesDir), kebab, `${kebab}.schema.ts`),
    join(projectRoot, servicesDir, kebab, `${kebab}.schema.ts`),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      // infer servicesDir from path
      const parts = p.split(/[/\\]/)
      const idx = parts.lastIndexOf(kebab)
      const svcDir = parts.slice(0, idx).join('/') // .../services
      return { schemaFile: p, servicesDirResolved: svcDir }
    }
  }
  const scanned = shallowScanForSchema(projectRoot, kebab)
  if (scanned) {
    const parts = scanned.split(/[/\\]/)
    const idx = parts.lastIndexOf(kebab)
    const svcDir = parts.slice(0, idx).join('/')
    return { schemaFile: scanned, servicesDirResolved: svcDir }
  }
  return { schemaFile: candidates[0], servicesDirResolved: join(projectRoot, 'services') }
}

export function readManifest(projectRoot: string) {
  const manifestPath = join(projectRoot, 'services', '.nfz', 'manifest.json')
  if (!existsSync(manifestPath)) return { manifest: null as any, manifestPath: null as string | null }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return { manifest, manifestPath }
  } catch {
    return { manifest: null as any, manifestPath }
  }
}

export function listServices(projectRoot: string) {
  // Prefer manifest
  const { manifest } = readManifest(projectRoot)
  if (manifest?.services) return Object.keys(manifest.services).sort()

  // Fallback: scan /services/*/*.schema.ts
  const servicesRoot = join(projectRoot, 'services')
  if (!existsSync(servicesRoot)) return []
  const dirs = readdirSync(servicesRoot).filter(d => {
    if (d.startsWith('.')) return false
    const full = join(servicesRoot, d)
    try { return statSync(full).isDirectory() } catch { return false }
  })
  return dirs.sort()
}

function inferType(expr: string): FieldMeta {
  const meta: FieldMeta = { type: 'string', required: true, array: false }
  let e = expr.trim()

  if (e.includes('.optional(') || e.endsWith('.optional()')) {
    meta.required = false
  }

  // array
  const arrMatch = e.match(/^z\.array\((.+)\)(?:\.optional\(\))?$/)
  if (arrMatch) {
    meta.array = true
    e = arrMatch[1].trim()
  }

  if (e.startsWith('objectIdSchema')) meta.type = 'objectId'
  else if (e.startsWith('z.string')) meta.type = 'string'
  else if (e.startsWith('z.number().int')) meta.type = 'int'
  else if (e.startsWith('z.number')) meta.type = 'number'
  else if (e.startsWith('z.boolean')) meta.type = 'boolean'
  else if (e.startsWith('z.coerce.date') || e.startsWith('z.date')) meta.type = 'date'
  else if (e.startsWith('z.any') || e.startsWith('z.unknown')) meta.type = 'json'
  else meta.type = 'string'

  return meta
}

export function parseSchemaFile(schemaFile: string): { schemaConst: string | null, fields: Record<string, FieldMeta> } {
  const src = readFileSync(schemaFile, 'utf-8')
  const m = src.match(/export const (\w+)Schema\s*=\s*z\.object\(\{\s*([\s\S]*?)\}\)\s*/m)
  if (!m) return { schemaConst: null, fields: {} }
  const schemaConst = m[1]
  const body = m[2]
  const fields: Record<string, FieldMeta> = {}

  // naive parse: key: expr,
  const lineRe = /^\s*([A-Za-z_]\w*)\s*:\s*([^,]+),?\s*$/gm
  let lm
  while ((lm = lineRe.exec(body)) !== null) {
    const key = lm[1]
    const expr = lm[2]
    fields[key] = inferType(expr)
  }
  return { schemaConst, fields }
}

export function getServiceInfo(projectRoot: string, servicesDir: string, serviceName: string): ServiceSchemaInfo {
  const kebab = normalizeServiceName(serviceName)
  const { manifest, manifestPath } = readManifest(projectRoot)

  const { schemaFile, servicesDirResolved } = resolveSchemaFile(projectRoot, servicesDir, kebab)

  if (!existsSync(schemaFile)) {
    throw new Error(`Schema file not found: ${schemaFile}`)
  }

  const manifestService = manifest?.services?.[kebab] ?? null
  const parsed = parseSchemaFile(schemaFile)

  const fields = manifestService?.fields ?? parsed.fields

  return {
    service: kebab,
    servicesDir: servicesDirResolved,
    schemaFile,
    manifestPath,
    adapter: manifestService?.adapter,
    auth: !!manifestService?.auth,
    docs: !!manifestService?.docs,
    idField: manifestService?.idField,
    collection: manifestService?.collection,
    fields,
  }
}

function zodExpr(meta: FieldMeta): string {
  const base = (() => {
    switch (meta.type) {
      case 'string': return 'z.string()'
      case 'number': return 'z.number()'
      case 'int': return 'z.number().int()'
      case 'boolean': return 'z.boolean()'
      case 'date': return 'z.coerce.date()'
      case 'objectId': return 'objectIdSchema()'
      case 'json': return 'z.any()'
      default: return 'z.string()'
    }
  })()

  const arr = meta.array ? `z.array(${base})` : base
  const opt = meta.required === false ? `${arr}.optional()` : arr
  return opt
}

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

export function writeManifestFields(projectRoot: string, serviceName: string, fields: Record<string, FieldMeta>) {
  const manifestDir = join(projectRoot, 'services', '.nfz')
  const manifestPath = join(manifestDir, 'manifest.json')
  ensureDir(manifestDir)

  let manifest: any = { services: {} }
  if (existsSync(manifestPath)) {
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) } catch {}
  }
  if (!manifest.services) manifest.services = {}
  if (!manifest.services[serviceName]) manifest.services[serviceName] = {}

  manifest.services[serviceName].fields = fields

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
  return manifestPath
}

export function applySchemaFields(schemaFile: string, fields: Record<string, FieldMeta>, idField?: string) {
  const src = readFileSync(schemaFile, 'utf-8')
  const parsed = parseSchemaFile(schemaFile)
  if (!parsed.schemaConst) throw new Error('Could not locate `export const <name>Schema = z.object({ ... })` in schema file')

  const schemaConst = parsed.schemaConst
  const newObjectBody = Object.entries(fields).map(([k, meta]) => `  ${k}: ${zodExpr(meta)},`).join('\n')

  const replacedObject = src.replace(
    new RegExp(`export const ${schemaConst}Schema\\s*=\\s*z\\.object\\(\\{[\\s\\S]*?\\}\\)`, 'm'),
    `export const ${schemaConst}Schema = z.object({\n${newObjectBody}\n})`
  )

  // Update DataSchema pick: include all fields except idField
  const id = idField || '_id'
  const pickKeys = Object.keys(fields).filter(k => k !== id)
  const pickBody = pickKeys.map(k => `  ${k}: true,`).join('\n')
  const dataSchemaRe = new RegExp(`export const ${schemaConst}DataSchema\\s*=\\s*${schemaConst}Schema\\.pick\\(\\{[\\s\\S]*?\\}\\)`, 'm')

  const replacedData = dataSchemaRe.test(replacedObject)
    ? replacedObject.replace(dataSchemaRe, `export const ${schemaConst}DataSchema = ${schemaConst}Schema.pick({\n${pickBody}\n})`)
    : replacedObject

  writeFileSync(schemaFile, replacedData, 'utf-8')
}
