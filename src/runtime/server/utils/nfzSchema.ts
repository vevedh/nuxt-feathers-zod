import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname, isAbsolute } from 'node:path'

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
  /** Fields actually used by the builder (manifest if present, else schema.ts) */
  fields: Record<string, FieldMeta>
  /** Fields parsed from <service>.schema.ts (code) */
  schemaFields: Record<string, FieldMeta>
  /** Fields coming from services/.nfz/manifest.json (if any) */
  manifestFields: Record<string, FieldMeta> | null
  /** True when manifestFields and schemaFields differ */
  drift: boolean
  /** Drift details for UI */
  driftDetail: {
    onlyInManifest: string[]
    onlyInSchema: string[]
    changed: string[]
  }
}

const IGNORE_DIRS = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', 'build'])

export function normalizeServiceName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}


function resolveServicesDir(projectRoot: string, dir: string) {
  // Support absolute paths (POSIX/Windows) and UNC paths on Windows
  if (isAbsolute(dir) || dir.startsWith('\\\\')) return dir
  return join(projectRoot, dir)
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

export function resolveSchemaFile(
  projectRoot: string,
  servicesDirs: string[],
  serviceName: string,
): { schemaFile: string, servicesDirResolved: string } {
  const kebab = normalizeServiceName(serviceName)
  const candidates: string[] = []
  for (const d of servicesDirs) {
    candidates.push(join(projectRoot, d, kebab, `${kebab}.schema.ts`))
  }
  // Compatibility with old playground layout
  candidates.push(join(projectRoot, 'playground', 'services', kebab, `${kebab}.schema.ts`))

  for (const p of candidates) {
    if (existsSync(p)) {
      const parts = p.split(/[/\\]/)
      const idx = parts.lastIndexOf(kebab)
      const svcDir = parts.slice(0, idx).join('/')
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
  // Default to first servicesDir
  const fallbackSchemaFile = candidates[0]
    ?? join(projectRoot, 'services', kebab, `${kebab}.schema.ts`)
  const fallbackServicesDir = join(projectRoot, servicesDirs[0] ?? 'services')

  return {
    schemaFile: fallbackSchemaFile,
    servicesDirResolved: fallbackServicesDir,
  }
}

export function readManifest(projectRoot: string, servicesDirs: string[]) {
  // Prefer first servicesDir as canonical
  const baseDir = servicesDirs[0] ?? 'services'
  const manifestPath = join(projectRoot, baseDir, '.nfz', 'manifest.json')
  if (!existsSync(manifestPath)) return { manifest: null as any, manifestPath: null as string | null }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return { manifest, manifestPath }
  } catch {
    return { manifest: null as any, manifestPath }
  }
}

export function listServices(projectRoot: string, servicesDirs: string[]) {
  const { manifest } = readManifest(projectRoot, servicesDirs)

  const out: { name: string, source: 'manifest' | 'scan' }[] = []
  const seen = new Set<string>()

  // 1) manifest services first (authoritative)
  if (manifest?.services) {
    for (const name of Object.keys(manifest.services).sort()) {
      out.push({ name, source: 'manifest' })
      seen.add(name)
    }
  }

  // 2) scan all servicesDirs for directories (fallback / preloading)
  for (const dir of servicesDirs) {
    const root = resolveServicesDir(projectRoot, dir)
    if (!existsSync(root)) continue

    let entries: string[] = []
    try { entries = readdirSync(root) } catch { continue }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const full = join(root, entry)
      let st
      try { st = statSync(full) } catch { continue }
      if (!st.isDirectory()) continue

      const serviceName = normalizeServiceName(entry)
      if (seen.has(serviceName)) continue
      out.push({ name: serviceName, source: 'scan' })
      seen.add(serviceName)
    }
  }

  // Sort: manifest first (already), then scans alphabetical
  const manifestCount = out.filter(s => s.source === 'manifest').length
  const scans = out.slice(manifestCount).sort((a, b) => a.name.localeCompare(b.name))
  return [...out.slice(0, manifestCount), ...scans]
}


function inferType(expr: string): FieldMeta {
  const meta: FieldMeta = { type: 'string', required: true, array: false }
  let e = expr.trim()

  if (e.includes('.optional(') || e.endsWith('.optional()')) {
    meta.required = false
  }

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

function findZodObjectBody(src: string, objectStart: number): string | null {
  let depth = 0
  let bodyStart = -1

  for (let i = objectStart; i < src.length; i++) {
    const char = src[i]

    if (char === '{') {
      if (depth === 0)
        bodyStart = i + 1
      depth++
      continue
    }

    if (char === '}') {
      depth--
      if (depth === 0 && bodyStart >= 0)
        return src.slice(bodyStart, i)
    }
  }

  return null
}

function parseFieldLine(line: string): { key: string, expr: string } | null {
  const trimmed = line.trim().replace(/,$/, '').trim()
  const colonIndex = trimmed.indexOf(':')

  if (colonIndex <= 0)
    return null

  const key = trimmed.slice(0, colonIndex).trim()
  const expr = trimmed.slice(colonIndex + 1).trim()

  if (!/^[$A-Z_a-z][$\w]*$/.test(key) || !expr)
    return null

  return { key, expr }
}

export function parseSchemaFile(schemaFile: string): { schemaConst: string | null, fields: Record<string, FieldMeta> } {
  const src = readFileSync(schemaFile, 'utf-8')
  const match = /export\s+const\s+([A-Za-z_]\w*)Schema\s*=\s*z\.object\s*\(\s*\{/m.exec(src)

  if (!match || match.index === undefined)
    return { schemaConst: null, fields: {} }

  const schemaConst = match[1]
  const objectStart = match.index + match[0].lastIndexOf('{')
  const body = findZodObjectBody(src, objectStart)

  if (body === null)
    return { schemaConst, fields: {} }

  const fields: Record<string, FieldMeta> = {}

  for (const line of body.split(/\r?\n/)) {
    const parsed = parseFieldLine(line)

    if (parsed)
      fields[parsed.key] = inferType(parsed.expr)
  }

  return { schemaConst, fields }
}

export function getServiceInfo(projectRoot: string, servicesDirs: string[], serviceName: string): ServiceSchemaInfo {
  const kebab = normalizeServiceName(serviceName)
  const { manifest, manifestPath } = readManifest(projectRoot, servicesDirs)

  const { schemaFile, servicesDirResolved } = resolveSchemaFile(projectRoot, servicesDirs, kebab)

  if (!existsSync(schemaFile)) {
    throw new Error(`Schema file not found: ${schemaFile}`)
  }

  const manifestService = manifest?.services?.[kebab] ?? null
  const parsed = parseSchemaFile(schemaFile)
  const schemaFields = parsed.fields
  const manifestFields = (manifestService?.fields ?? null) as (Record<string, FieldMeta> | null)
  const fields = manifestFields ?? schemaFields

  const driftDetail = diffFields(manifestFields, schemaFields)
  const driftChangesCount = driftDetail.onlyInManifest.length
    + driftDetail.onlyInSchema.length
    + driftDetail.changed.length
  const drift = !!manifestFields && driftChangesCount > 0

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
    schemaFields,
    manifestFields,
    drift,
    driftDetail,
  }
}

function sameMeta(a?: FieldMeta, b?: FieldMeta) {
  if (!a || !b) return false
  return a.type === b.type
    && (a.required !== false) === (b.required !== false)
    && (!!a.array) === (!!b.array)
}

export function diffFields(manifestFields: Record<string, FieldMeta> | null, schemaFields: Record<string, FieldMeta>) {
  const onlyInManifest: string[] = []
  const onlyInSchema: string[] = []
  const changed: string[] = []

  const mf = manifestFields ?? {}
  const mKeys = new Set(Object.keys(mf))
  const sKeys = new Set(Object.keys(schemaFields))

  for (const k of mKeys) {
    if (!sKeys.has(k)) onlyInManifest.push(k)
    else if (!sameMeta(mf[k], schemaFields[k])) changed.push(k)
  }
  for (const k of sKeys) {
    if (!mKeys.has(k)) onlyInSchema.push(k)
  }

  onlyInManifest.sort()
  onlyInSchema.sort()
  changed.sort()

  return { onlyInManifest, onlyInSchema, changed }
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

export function writeManifestFields(
  projectRoot: string,
  servicesDirs: string[],
  serviceName: string,
  fields: Record<string, FieldMeta>,
) {
  const baseDir = servicesDirs[0] ?? 'services'
  const manifestDir = join(projectRoot, baseDir, '.nfz')
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
    `export const ${schemaConst}Schema = z.object({\n${newObjectBody}\n})`,
  )

  const id = idField || '_id'
  const pickKeys = Object.keys(fields).filter(k => k !== id)
  const pickBody = pickKeys.map(k => `  ${k}: true,`).join('\n')
  const dataSchemaRe = new RegExp(
    `export const ${schemaConst}DataSchema\\s*=\\s*${schemaConst}Schema\\.pick\\(\\{[\\s\\S]*?\\}\\)`,
    'm',
  )
  const nextDataSchema = [
    `export const ${schemaConst}DataSchema = ${schemaConst}Schema.pick({`,
    pickBody,
    '})',
  ].join('\n')

  const replacedData = dataSchemaRe.test(replacedObject)
    ? replacedObject.replace(dataSchemaRe, nextDataSchema)
    : replacedObject

  writeFileSync(schemaFile, replacedData, 'utf-8')
}
